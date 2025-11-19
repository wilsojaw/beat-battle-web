// Socket.io Server for Beat Battle
import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import type { GameState, Player, GameConfig, TapEvent } from '@/types/game';

const games = new Map<string, GameState>();

export function initializeSocketServer(httpServer: HTTPServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NODE_ENV === 'production'
        ? process.env.NEXT_PUBLIC_APP_URL
        : 'http://localhost:3000',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Teacher creates a game
    socket.on('create-game', (data: { teacherName: string; config: GameConfig }, callback) => {
      const roomCode = generateRoomCode();
      const teacher: Player = {
        id: socket.id,
        name: data.teacherName,
        isTeacher: true
      };

      const gameState: GameState = {
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

    // Student joins a game
    socket.on('join-game', (data: { roomCode: string; playerName: string }, callback) => {
      const game = games.get(data.roomCode);

      if (!game) {
        callback({ success: false, error: 'Game not found' });
        return;
      }

      if (game.status !== 'lobby') {
        callback({ success: false, error: 'Game already started' });
        return;
      }

      const player: Player = {
        id: socket.id,
        name: data.playerName,
        isTeacher: false,
        taps: []
      };

      game.players.push(player);
      socket.join(data.roomCode);

      // Notify teacher and all players
      io.to(data.roomCode).emit('player-joined', { player, totalPlayers: game.players.length });

      console.log(`${data.playerName} joined game ${data.roomCode}`);
      callback({ success: true, gameState: game });
    });

    // Teacher starts the game
    socket.on('start-game', (data: { roomCode: string }, callback) => {
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

    // Player submits a tap
    socket.on('submit-tap', (data: { roomCode: string; tap: TapEvent }) => {
      const game = games.get(data.roomCode);
      if (!game) return;

      const player = game.players.find(p => p.id === socket.id);
      if (player && player.taps) {
        player.taps.push(data.tap);

        // Broadcast tap to teacher for live monitoring
        io.to(game.teacher.id).emit('player-tap', {
          playerId: player.id,
          playerName: player.name,
          tap: data.tap
        });
      }
    });

    // Teacher changes segment
    socket.on('change-segment', (data: { roomCode: string; segmentIndex: number }) => {
      const game = games.get(data.roomCode);
      if (!game || game.teacher.id !== socket.id) return;

      game.currentSegment = game.segments[data.segmentIndex];
      io.to(data.roomCode).emit('segment-changed', { segment: game.currentSegment });
    });

    // Teacher ends the game
    socket.on('end-game', (data: { roomCode: string }) => {
      const game = games.get(data.roomCode);
      if (!game || game.teacher.id !== socket.id) return;

      game.status = 'finished';

      // Calculate results for all players
      const results = game.players.map(player => {
        const accuracy = calculatePlayerAccuracy(player.taps || []);
        return {
          player,
          overallAccuracy: accuracy,
          bestNoteType: getBestNoteType(player.taps || []),
          worstNoteType: getWorstNoteType(player.taps || [])
        };
      });

      // Sort by accuracy for ranking
      results.sort((a, b) => b.overallAccuracy - a.overallAccuracy);
      results.forEach((result, index) => {
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

      // Handle player/teacher disconnect
      games.forEach((game, roomCode) => {
        if (game.teacher.id === socket.id) {
          // Teacher disconnected - end game
          io.to(roomCode).emit('teacher-disconnected');
          games.delete(roomCode);
        } else {
          // Remove player from game
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

  return io;
}

// Helper functions
function generateRoomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function generateGameSegments(config: GameConfig): any[] {
  const segments: any[] = [];
  const totalBeats = (config.totalDuration / 60) * config.tempo;
  const beatsPerSegment = config.segmentDuration * 4; // 4 beats per bar

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

function calculatePlayerAccuracy(taps: TapEvent[]): number {
  if (taps.length === 0) return 0;

  const totalAccuracy = taps.reduce((sum, tap) => {
    const accuracyPercent = Math.max(0, 100 - Math.abs(tap.accuracy) / 2);
    return sum + accuracyPercent;
  }, 0);

  return Math.round(totalAccuracy / taps.length);
}

function getBestNoteType(taps: TapEvent[]): any {
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
    const avg = accuracies.reduce((a: number, b: number) => a + b, 0) / accuracies.length;
    if (avg < bestAvg) {
      bestAvg = avg;
      bestNote = noteValue;
    }
  });

  return bestNote;
}

function getWorstNoteType(taps: TapEvent[]): any {
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
    const avg = accuracies.reduce((a: number, b: number) => a + b, 0) / accuracies.length;
    if (avg > worstAvg) {
      worstAvg = avg;
      worstNote = noteValue;
    }
  });

  return worstNote;
}
