const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Import socket server logic
const games = new Map();

function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function generateGameSegments(config) {
  const segments = [];
  const totalBeats = (config.totalDuration / 60) * config.tempo;
  const beatsPerSegment = config.segmentDuration * 4;

  let currentBeat = 0;
  let segmentIndex = 0;

  while (currentBeat < totalBeats) {
    const noteValue = config.noteValues[segmentIndex % config.noteValues.length];
    segments.push({
      noteValue,
      startTime: (currentBeat / config.tempo) * 60 * 1000,
      endTime: ((currentBeat + beatsPerSegment) / config.tempo) * 60 * 1000,
      durationBars: config.segmentDuration
    });

    currentBeat += beatsPerSegment;
    segmentIndex++;
  }

  return segments;
}

function calculatePlayerAccuracy(taps) {
  if (taps.length === 0) return 0;

  const totalAccuracy = taps.reduce((sum, tap) => {
    const accuracyPercent = Math.max(0, 100 - Math.abs(tap.accuracy) / 2);
    return sum + accuracyPercent;
  }, 0);

  return Math.round(totalAccuracy / taps.length);
}

function getBestNoteType(taps) {
  const noteTypeAccuracy = new Map();

  taps.forEach(tap => {
    if (!noteTypeAccuracy.has(tap.noteValue)) {
      noteTypeAccuracy.set(tap.noteValue, []);
    }
    noteTypeAccuracy.get(tap.noteValue).push(Math.abs(tap.accuracy));
  });

  let bestNote = 'quarter';
  let bestAvg = Infinity;

  noteTypeAccuracy.forEach((accuracies, noteValue) => {
    const avg = accuracies.reduce((a, b) => a + b, 0) / accuracies.length;
    if (avg < bestAvg) {
      bestAvg = avg;
      bestNote = noteValue;
    }
  });

  return bestNote;
}

function getWorstNoteType(taps) {
  const noteTypeAccuracy = new Map();

  taps.forEach(tap => {
    if (!noteTypeAccuracy.has(tap.noteValue)) {
      noteTypeAccuracy.set(tap.noteValue, []);
    }
    noteTypeAccuracy.get(tap.noteValue).push(Math.abs(tap.accuracy));
  });

  let worstNote = 'quarter';
  let worstAvg = -Infinity;

  noteTypeAccuracy.forEach((accuracies, noteValue) => {
    const avg = accuracies.reduce((a, b) => a + b, 0) / accuracies.length;
    if (avg > worstAvg) {
      worstAvg = avg;
      worstNote = noteValue;
    }
  });

  return worstNote;
}

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  const io = new Server(httpServer, {
    cors: {
      origin: dev ? 'http://localhost:3000' : process.env.NEXT_PUBLIC_APP_URL,
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('teacher-rejoin', (data) => {
      const game = games.get(data.roomCode);
      if (game) {
        socket.join(data.roomCode);

        // Update teacher's socket ID to the new connection
        game.teacher.id = socket.id;

        console.log(`Teacher rejoined room: ${data.roomCode} with new socket ID: ${socket.id}`);

        // Send current players to teacher
        game.players.forEach(player => {
          socket.emit('player-joined', { player, totalPlayers: game.players.length });
        });
      }
    });

    socket.on('student-rejoin', (data) => {
      const game = games.get(data.roomCode);
      if (game) {
        socket.join(data.roomCode);
        console.log(`Student rejoined room: ${data.roomCode} with socket ID: ${socket.id}`);

        // Send current player count to this student
        socket.emit('player-count-update', { totalPlayers: game.players.length });
      }
    });

    socket.on('get-game-state', (data, callback) => {
      const game = games.get(data.roomCode);
      if (!game) {
        callback({ success: false, error: 'Game not found' });
        return;
      }

      // Join room if not already in it
      socket.join(data.roomCode);

      console.log(`Sending game state for room ${data.roomCode}, status: ${game.status}`);

      callback({
        success: true,
        game: {
          status: game.status,
          startTime: game.startTime,
          segments: game.segments,
          currentSegment: game.currentSegment,
          config: game.config
        }
      });
    });

    socket.on('create-game', (data, callback) => {
      const roomCode = generateRoomCode();
      const teacher = {
        id: socket.id,
        name: data.teacherName,
        isTeacher: true
      };

      const gameState = {
        roomCode,
        config: data.config,
        players: [],
        status: 'lobby',
        segments: [],
        teacher
      };

      games.set(roomCode, gameState);
      socket.join(roomCode);

      console.log(`Game created: ${roomCode} by ${data.teacherName}`);
      callback({ success: true, roomCode, gameState });
    });

    socket.on('join-game', (data, callback) => {
      const game = games.get(data.roomCode);

      if (!game) {
        callback({ success: false, error: 'Game not found' });
        return;
      }

      if (game.status !== 'lobby') {
        callback({ success: false, error: 'Game already started' });
        return;
      }

      const player = {
        id: socket.id,
        name: data.playerName,
        isTeacher: false,
        taps: []
      };

      game.players.push(player);
      socket.join(data.roomCode);

      io.to(data.roomCode).emit('player-joined', { player, totalPlayers: game.players.length });

      console.log(`${data.playerName} joined game ${data.roomCode}`);
      callback({ success: true, gameState: game });
    });

    socket.on('start-game', (data, callback) => {
      const game = games.get(data.roomCode);

      if (!game || game.teacher.id !== socket.id) {
        callback({ success: false, error: 'Not authorized' });
        return;
      }

      game.status = 'playing';
      game.startTime = Date.now();
      game.segments = generateGameSegments(game.config);
      game.currentSegment = game.segments[0];

      io.to(data.roomCode).emit('game-started', {
        startTime: game.startTime,
        segments: game.segments,
        currentSegment: game.currentSegment
      });

      console.log(`Game started: ${data.roomCode}`);
      callback({ success: true });
    });

    socket.on('submit-tap', (data) => {
      const game = games.get(data.roomCode);
      if (!game) return;

      const player = game.players.find(p => p.id === socket.id);
      if (player && player.taps) {
        player.taps.push(data.tap);

        io.to(game.teacher.id).emit('player-tap', {
          playerId: player.id,
          playerName: player.name,
          tap: data.tap
        });
      }
    });

    socket.on('change-segment', (data) => {
      const game = games.get(data.roomCode);
      if (!game || game.teacher.id !== socket.id) return;

      game.currentSegment = game.segments[data.segmentIndex];
      io.to(data.roomCode).emit('segment-changed', { segment: game.currentSegment });
    });

    socket.on('end-game', (data) => {
      const game = games.get(data.roomCode);
      if (!game || game.teacher.id !== socket.id) return;

      game.status = 'finished';

      const results = game.players.map(player => {
        const accuracy = calculatePlayerAccuracy(player.taps || []);
        return {
          player,
          overallAccuracy: accuracy,
          bestNoteType: getBestNoteType(player.taps || []),
          worstNoteType: getWorstNoteType(player.taps || [])
        };
      });

      results.sort((a, b) => b.overallAccuracy - a.overallAccuracy);
      results.forEach((result) => {
        result.player.score = result.overallAccuracy;
        if (game.config.leaderboardStyle !== 'stars-only') {
          result.player.accuracy = result.overallAccuracy;
        }
      });

      io.to(data.roomCode).emit('game-ended', { results });
      console.log(`Game ended: ${data.roomCode}`);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);

      games.forEach((game, roomCode) => {
        if (game.teacher.id === socket.id) {
          io.to(roomCode).emit('teacher-disconnected');
          games.delete(roomCode);
        } else {
          const playerIndex = game.players.findIndex(p => p.id === socket.id);
          if (playerIndex !== -1) {
            const player = game.players[playerIndex];
            game.players.splice(playerIndex, 1);
            io.to(roomCode).emit('player-left', {
              player,
              totalPlayers: game.players.length
            });
          }
        }
      });
    });
  });

  httpServer
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});
