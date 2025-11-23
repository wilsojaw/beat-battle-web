const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const port = parseInt(process.env.PORT || '3000', 10);

console.log('🚀 Starting server...');
console.log('Environment:', { dev, port, NODE_ENV: process.env.NODE_ENV });

const app = next({ dev });
const handle = app.getRequestHandler();

// Import socket server logic
const games = new Map();

// Milestone and stats tracking configuration
const GREAT_TAP_THRESHOLD = 50; // ms
const COOLDOWN_SAME_TYPE = 10000; // 10 seconds
const COOLDOWN_GLOBAL_BROADCAST = 3000; // 3 seconds

const MILESTONE_CONFIG = {
  streak: {
    3: { icon: '🔥', messages: ['{name} is warming up!', '{name} found the groove!'] },
    5: { icon: '🔥🔥', messages: ['{name} is on fire!', '{name} can\'t miss!'] },
    10: { icon: '🔥🔥🔥', messages: ['{name} is UNSTOPPABLE!', '{name} is IN THE ZONE!'] },
    15: { icon: '⭐', messages: ['{name} has a PERFECT STREAK!', '{name} is a RHYTHM GOD!'] }
  },
  accuracy: {
    80: { icon: '🎵', message: 'You\'re finding the rhythm!' },
    90: { icon: '🎯', message: 'You\'re a Rhythm Master!' },
    95: { icon: '✨', message: 'You\'re nearly perfect!' }
  },
  competitive: {
    enteredTop3: { icon: '🌟', messages: ['{name} just hit top 3!', '{name} is climbing!'] },
    becameLeader: { icon: '👑', messages: ['{name} is now in the LEAD!', '{name} took over!'] },
    climbingUp: { icon: '📈', messages: ['{name} is climbing the leaderboard!', '{name} is on the rise!'] }
  }
};

// Stats tracking helper functions
function isGreatTap(accuracy) {
  return Math.abs(accuracy) <= GREAT_TAP_THRESHOLD;
}

function calculateCurrentStreak(taps) {
  if (!taps || taps.length === 0) return 0;

  let streak = 0;
  for (let i = taps.length - 1; i >= 0; i--) {
    const tap = taps[i];
    // Skip first taps in segments
    if (tap.interval === 0 || tap.interval === undefined) {
      continue;
    }
    if (isGreatTap(tap.accuracy)) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

function calculateRollingAccuracy(taps, count = 10) {
  if (!taps || taps.length === 0) return 0;

  const recentTaps = taps.slice(-count);
  const validTaps = recentTaps.filter(tap =>
    tap.accuracy !== undefined &&
    tap.accuracy !== null &&
    tap.interval !== 0
  );

  if (validTaps.length === 0) return 0;

  const totalAccuracy = validTaps.reduce((sum, tap) => {
    const accuracyPercent = Math.max(0, 100 - Math.abs(tap.accuracy) / 2);
    return sum + accuracyPercent;
  }, 0);

  return Math.round(totalAccuracy / validTaps.length);
}

function getRandomMessage(messages) {
  return messages[Math.floor(Math.random() * messages.length)];
}

function formatMessage(template, playerName) {
  return template.replace('{name}', playerName);
}

function canTriggerMilestone(player, milestoneType, cooldownMs = COOLDOWN_SAME_TYPE) {
  if (!player.lastMilestoneTimestamps) {
    player.lastMilestoneTimestamps = new Map();
  }

  const lastTime = player.lastMilestoneTimestamps.get(milestoneType);
  if (!lastTime) {
    return true;
  }

  return Date.now() - lastTime >= cooldownMs;
}

function recordMilestoneTrigger(player, milestoneType) {
  if (!player.lastMilestoneTimestamps) {
    player.lastMilestoneTimestamps = new Map();
  }
  player.lastMilestoneTimestamps.set(milestoneType, Date.now());
}

function checkStreakMilestones(player, currentStreak) {
  const thresholds = [15, 10, 5, 3];

  for (const threshold of thresholds) {
    if (currentStreak === threshold) {
      const config = MILESTONE_CONFIG.streak[threshold];
      if (!config) continue;

      const milestoneKey = `streak-${threshold}`;
      if (!canTriggerMilestone(player, milestoneKey)) {
        return null;
      }

      const message = formatMessage(getRandomMessage(config.messages), player.name);
      recordMilestoneTrigger(player, milestoneKey);

      return {
        id: `${player.id}-${milestoneKey}-${Date.now()}`,
        type: 'streak',
        playerId: player.id,
        playerName: player.name,
        message: `${message} ${config.icon}`,
        icon: config.icon,
        broadcast: true,
        timestamp: Date.now(),
        data: { streakCount: threshold }
      };
    }
  }

  return null;
}

function checkAccuracyMilestones(player, accuracy) {
  const thresholds = [95, 90, 80];

  for (const threshold of thresholds) {
    if (accuracy >= threshold) {
      const config = MILESTONE_CONFIG.accuracy[threshold];
      if (!config) continue;

      const milestoneKey = `accuracy-${threshold}`;
      if (!canTriggerMilestone(player, milestoneKey)) {
        return null;
      }

      recordMilestoneTrigger(player, milestoneKey);

      return {
        id: `${player.id}-${milestoneKey}-${Date.now()}`,
        type: 'accuracy',
        playerId: player.id,
        playerName: player.name,
        message: `${config.message} ${config.icon}`,
        icon: config.icon,
        broadcast: false,
        timestamp: Date.now(),
        data: { accuracyPercent: accuracy }
      };
    }
  }

  return null;
}

function checkCompetitiveMilestones(player) {
  const currentRank = player.currentRank || 0;
  const previousRank = player.previousRank || 0;

  if (currentRank === 0 || previousRank === 0 || currentRank === previousRank) {
    return null;
  }

  // Became leader
  if (currentRank === 1 && previousRank > 1) {
    const config = MILESTONE_CONFIG.competitive.becameLeader;
    const milestoneKey = 'became-leader';

    if (!canTriggerMilestone(player, milestoneKey)) {
      return null;
    }

    const message = formatMessage(getRandomMessage(config.messages), player.name);
    recordMilestoneTrigger(player, milestoneKey);

    return {
      id: `${player.id}-${milestoneKey}-${Date.now()}`,
      type: 'competitive',
      playerId: player.id,
      playerName: player.name,
      message: `${message} ${config.icon}`,
      icon: config.icon,
      broadcast: true,
      timestamp: Date.now(),
      data: { currentRank, previousRank }
    };
  }

  // Entered top 3
  if (currentRank <= 3 && previousRank > 3) {
    const config = MILESTONE_CONFIG.competitive.enteredTop3;
    const milestoneKey = 'entered-top3';

    if (!canTriggerMilestone(player, milestoneKey)) {
      return null;
    }

    const message = formatMessage(getRandomMessage(config.messages), player.name);
    recordMilestoneTrigger(player, milestoneKey);

    return {
      id: `${player.id}-${milestoneKey}-${Date.now()}`,
      type: 'competitive',
      playerId: player.id,
      playerName: player.name,
      message: `${message} ${config.icon}`,
      icon: config.icon,
      broadcast: true,
      timestamp: Date.now(),
      data: { currentRank, previousRank }
    };
  }

  // Climbing up (2+ ranks)
  if (previousRank - currentRank >= 2) {
    const config = MILESTONE_CONFIG.competitive.climbingUp;
    const milestoneKey = 'climbing-up';

    if (!canTriggerMilestone(player, milestoneKey)) {
      return null;
    }

    const message = formatMessage(getRandomMessage(config.messages), player.name);
    recordMilestoneTrigger(player, milestoneKey);

    return {
      id: `${player.id}-${milestoneKey}-${Date.now()}`,
      type: 'competitive',
      playerId: player.id,
      playerName: player.name,
      message: `${message} ${config.icon}`,
      icon: config.icon,
      broadcast: true,
      timestamp: Date.now(),
      data: { currentRank, previousRank, ranksClimbed: previousRank - currentRank }
    };
  }

  return null;
}

function updatePlayerRankings(game) {
  // Calculate current accuracy for all players
  const playersWithAccuracy = game.players.map(player => ({
    player,
    accuracy: calculateRollingAccuracy(player.taps || [])
  }));

  // Sort by accuracy descending
  playersWithAccuracy.sort((a, b) => b.accuracy - a.accuracy);

  // Update ranks
  playersWithAccuracy.forEach((item, index) => {
    const player = item.player;
    player.previousRank = player.currentRank || 0;
    player.currentRank = index + 1;
  });

  return playersWithAccuracy;
}

function generateLeaderboardUpdate(game) {
  const playersWithAccuracy = updatePlayerRankings(game);

  // Get top 3 players
  const topPlayers = playersWithAccuracy.slice(0, 3).map((item, index) => ({
    rank: index + 1,
    name: item.player.name,
    accuracy: item.accuracy,
    hasStreak: (item.player.currentStreak || 0) >= 3
  }));

  return {
    topPlayers,
    totalPlayers: game.players.length,
    timestamp: Date.now()
  };
}

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
  const totalMeasures = config.totalMeasures || 16;
  const measuresPerSegment = config.measuresPerSegment || config.segmentDuration || 2;
  const beatsPerMeasure = 4;
  const beatDuration = 60 / config.tempo; // seconds per beat

  // Add 1 measure (4 beats) count-in offset
  const countInBeats = beatsPerMeasure;
  const countInOffset = countInBeats * beatDuration * 1000; // ms

  let currentMeasure = 0;
  let noteValueIndex = 0;

  while (currentMeasure < totalMeasures) {
    const noteValue = config.noteValues[noteValueIndex % config.noteValues.length];
    const startBeat = currentMeasure * beatsPerMeasure;
    const endMeasure = Math.min(currentMeasure + measuresPerSegment, totalMeasures);
    const endBeat = endMeasure * beatsPerMeasure;

    segments.push({
      noteValue,
      startTime: (startBeat * beatDuration * 1000) + countInOffset, // ms (offset by count-in)
      endTime: (endBeat * beatDuration * 1000) + countInOffset, // ms (offset by count-in)
      durationBars: endMeasure - currentMeasure,
      startMeasure: currentMeasure + 1, // 1-indexed for display
      endMeasure: endMeasure
    });

    currentMeasure = endMeasure;
    noteValueIndex++;
  }

  console.log(`Generated ${segments.length} segments from ${totalMeasures} measures (${measuresPerSegment} measures per segment)`);
  return segments;
}

function logTimingDataForExcel(game) {
  console.log('\n========== TIMING DATA FOR EXCEL ==========');
  console.log(`Tempo: ${game.config.tempo} BPM`);
  console.log(`Game Start Time: ${game.startTime}`);
  console.log(`Total Players: ${game.players.length}`);
  console.log('\n--- COPY BELOW THIS LINE ---');

  // Header row (tab-separated)
  console.log([
    'Player Name',
    'Measure',
    'Segment',
    'Note Value',
    'Expected Interval (ms)',
    'Tap Number',
    'Tap Timestamp (ms from start)',
    'Actual Interval (ms)',
    'Interval Error (ms)',
    'Accuracy (%)',
    'Global Time (epoch ms)'
  ].join('\t'));

  const beatDuration = (60 / game.config.tempo) * 1000; // ms per beat
  const beatsPerMeasure = 4;
  const measureDuration = beatDuration * beatsPerMeasure;

  // Loop through all players
  game.players.forEach(player => {
    if (!player.taps || player.taps.length === 0) {
      return;
    }

    player.taps.forEach((tap, index) => {
      // Find which segment this tap belongs to
      const segment = game.segments.find(s =>
        tap.timestamp >= s.startTime && tap.timestamp < s.endTime
      ) || game.segments[game.segments.length - 1]; // fallback to last segment

      // Calculate which measure this tap is in
      const measureNum = Math.floor(tap.timestamp / measureDuration) + 1;

      // Calculate expected interval based on note value
      const expectedInterval = tap.expectedInterval || 0;

      // Actual interval between taps
      const actualInterval = tap.interval || 0;

      // Error in interval timing
      const intervalError = tap.accuracy || 0;

      // Accuracy percentage (100% = perfect)
      const accuracyPercent = actualInterval > 0 ? Math.max(0, 100 - Math.abs(intervalError) / 2) : 0;

      // Global timestamp
      const globalTime = game.startTime + tap.timestamp;

      console.log([
        player.name,
        measureNum,
        segment ? `${segment.startMeasure}-${segment.endMeasure}` : 'N/A',
        tap.noteValue || 'unknown',
        expectedInterval.toFixed(2),
        index + 1,
        tap.timestamp.toFixed(2),
        actualInterval.toFixed(2),
        intervalError.toFixed(2),
        accuracyPercent.toFixed(2),
        globalTime
      ].join('\t'));
    });
  });

  console.log('--- END OF DATA ---\n');
  console.log('===========================================\n');
}

function calculatePlayerAccuracy(taps) {
  if (taps.length === 0) return 0;

  // Filter out first taps in segments (where accuracy is 0 from interval = 0)
  const validTaps = taps.filter(tap => tap.accuracy !== undefined && tap.accuracy !== null);

  if (validTaps.length === 0) return 0;

  console.log(`Calculating accuracy for ${validTaps.length} taps (filtered from ${taps.length} total)`);
  console.log(`Sample tap accuracies: ${validTaps.slice(0, 5).map(t => t.accuracy).join(', ')}`);

  const totalAccuracy = validTaps.reduce((sum, tap) => {
    const accuracyPercent = Math.max(0, 100 - Math.abs(tap.accuracy) / 2);
    return sum + accuracyPercent;
  }, 0);

  return Math.round(totalAccuracy / validTaps.length);
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

        console.log(`Teacher rejoined room: ${data.roomCode} with new socket ID: ${socket.id}, game status: ${game.status}`);

        // If game is finished and we have results, send them immediately
        if (game.status === 'finished' && game.results) {
          console.log(`Sending cached results to rejoining teacher for room ${data.roomCode}`);
          socket.emit('game-ended', { results: game.results });
        } else {
          // Send current players to teacher
          game.players.forEach(player => {
            socket.emit('player-joined', { player, totalPlayers: game.players.length });
          });
        }
      }
    });

    socket.on('student-rejoin', (data) => {
      const game = games.get(data.roomCode);
      if (game) {
        socket.join(data.roomCode);

        // Find player by name and update their socket ID
        const playerName = data.playerName;
        const player = game.players.find(p => p.name === playerName);

        if (player) {
          const oldSocketId = player.id;
          player.id = socket.id;
          player.connected = true;  // Mark as connected
          console.log(`✅ Student ${playerName} rejoined room: ${data.roomCode}, updated socket ID from ${oldSocketId} to ${socket.id}, game status: ${game.status}`);

          // Notify teacher of updated connection status
          io.to(data.roomCode).emit('player-connection-status', {
            playerName: playerName,
            connected: true,
            allPlayersReady: game.players.every(p => p.connected)
          });
        } else {
          console.log(`⚠️ Student rejoined room: ${data.roomCode} with socket ID: ${socket.id}, but player not found in game, game status: ${game.status}`);
        }

        // If game is finished and we have results, send them immediately
        if (game.status === 'finished' && game.results) {
          console.log(`Sending cached results to rejoining student for room ${data.roomCode}`);
          socket.emit('game-ended', { results: game.results });
        } else {
          // Send current player count to this student
          socket.emit('player-count-update', { totalPlayers: game.players.length });
        }
      }
    });

    // Time synchronization endpoint
    socket.on('time-sync', (data, callback) => {
      const serverTime = Date.now();
      callback({
        serverTime: serverTime,
        clientTime: data.clientTime
      });
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
          config: game.config,
          countdown: game.countdown
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
        taps: [],
        connected: true  // Track connection status
      };

      game.players.push(player);
      socket.join(data.roomCode);

      io.to(data.roomCode).emit('player-joined', {
        player,
        totalPlayers: game.players.length,
        playerNames: game.players.map(p => p.name),
        config: game.config
      });

      console.log(`${data.playerName} joined game ${data.roomCode}`);
      callback({ success: true, gameState: game });
    });

    socket.on('start-game', (data, callback) => {
      const game = games.get(data.roomCode);

      if (!game || game.teacher.id !== socket.id) {
        callback({ success: false, error: 'Not authorized' });
        return;
      }

      game.status = 'countdown';

      // Send countdown event
      io.to(data.roomCode).emit('countdown-start', { countdown: 3 });

      // Countdown: 3, 2, 1, GO
      let count = 3;
      const countdownInterval = setInterval(() => {
        count--;
        if (count > 0) {
          io.to(data.roomCode).emit('countdown-tick', { countdown: count });
        } else {
          clearInterval(countdownInterval);

          // Start the actual game
          game.status = 'playing';
          game.startTime = Date.now();
          game.segments = generateGameSegments(game.config);
          game.currentSegment = game.segments[0];

          io.to(data.roomCode).emit('game-started', {
            startTime: game.startTime,
            segments: game.segments,
            currentSegment: game.currentSegment,
            config: game.config
          });

          console.log(`Game started: ${data.roomCode}`);

          // Start leaderboard update interval (every 3 seconds)
          const leaderboardInterval = setInterval(() => {
            if (game.status !== 'playing') {
              clearInterval(leaderboardInterval);
              return;
            }

            const leaderboardUpdate = generateLeaderboardUpdate(game);

            // Check for competitive milestones after rank updates
            game.players.forEach(player => {
              const competitiveMilestone = checkCompetitiveMilestones(player);
              if (competitiveMilestone) {
                io.to(data.roomCode).emit('milestone-achieved', competitiveMilestone);
                console.log(`🎉 Competitive milestone: ${competitiveMilestone.message}`);
              }
            });

            // Emit leaderboard update to all players
            io.to(data.roomCode).emit('leaderboard-update', leaderboardUpdate);
          }, 3000); // Update every 3 seconds

          // Store interval ref for cleanup
          game.leaderboardInterval = leaderboardInterval;
        }
      }, 1000);

      callback({ success: true });
    });

    socket.on('submit-tap', (data) => {
      const game = games.get(data.roomCode);
      if (!game) {
        console.log(`❌ submit-tap: Game not found for room ${data.roomCode}`);
        return;
      }

      const player = game.players.find(p => p.id === socket.id);
      if (!player) {
        console.log(`❌ submit-tap: Player not found for socket ${socket.id}`);
        return;
      }

      if (!player.taps) {
        player.taps = [];
      }

      player.taps.push(data.tap);
      console.log(`✅ Tap recorded for ${player.name}: ${player.taps.length} total taps`);

      // Calculate current stats
      const currentStreak = calculateCurrentStreak(player.taps);
      const currentAccuracy = calculateRollingAccuracy(player.taps);

      // Update player stats
      if (!player.currentStreak) player.currentStreak = 0;
      if (!player.bestStreak) player.bestStreak = 0;

      player.currentStreak = currentStreak;
      if (currentStreak > player.bestStreak) {
        player.bestStreak = currentStreak;
      }

      // Check for milestones
      const milestones = [];

      // Check streak milestones
      const streakMilestone = checkStreakMilestones(player, currentStreak);
      if (streakMilestone) {
        milestones.push(streakMilestone);
      }

      // Check accuracy milestones
      const accuracyMilestone = checkAccuracyMilestones(player, currentAccuracy);
      if (accuracyMilestone) {
        milestones.push(accuracyMilestone);
      }

      // Emit milestones
      milestones.forEach(milestone => {
        if (milestone.broadcast) {
          // Broadcast to all players in the room
          io.to(data.roomCode).emit('milestone-achieved', milestone);
          console.log(`🎉 Milestone broadcast: ${milestone.message}`);
        } else {
          // Send only to this player
          socket.emit('milestone-achieved', milestone);
          console.log(`🎉 Personal milestone for ${player.name}: ${milestone.message}`);
        }
      });

      // Send personal stats update to this player
      socket.emit('personal-stats-update', {
        currentStreak,
        bestStreak: player.bestStreak,
        currentRank: player.currentRank || 0,
        previousRank: player.previousRank || 0,
        accuracy: currentAccuracy
      });

      io.to(game.teacher.id).emit('player-tap', {
        playerId: player.id,
        playerName: player.name,
        tap: data.tap
      });
    });

    // Forward student sync logs to teacher
    socket.on('student-sync-log', (data) => {
      const game = games.get(data.roomCode);
      if (!game) return;

      io.to(game.teacher.id).emit('student-sync-log', data);
    });

    // Forward student tap logs to teacher
    socket.on('student-tap-log', (data) => {
      const game = games.get(data.roomCode);
      if (!game) return;

      io.to(game.teacher.id).emit('student-tap-log', data);
    });

    socket.on('change-segment', (data) => {
      const game = games.get(data.roomCode);
      if (!game || game.teacher.id !== socket.id) return;

      game.currentSegment = game.segments[data.segmentIndex];
      io.to(data.roomCode).emit('segment-changed', { segment: game.currentSegment });
    });

    socket.on('end-game', (data, callback) => {
      console.log(`end-game event received from socket ${socket.id} for room ${data.roomCode}`);
      const game = games.get(data.roomCode);

      if (!game) {
        console.log(`Game not found for room code: ${data.roomCode}`);
        if (callback) callback({ success: false, error: 'Game not found' });
        return;
      }

      if (game.teacher.id !== socket.id) {
        console.log(`Unauthorized: socket ${socket.id} is not teacher ${game.teacher.id}`);
        if (callback) callback({ success: false, error: 'Not authorized' });
        return;
      }

      console.log(`Ending game ${data.roomCode}, calculating results for ${game.players.length} players`);

      // Log each player's tap count before calculating
      game.players.forEach(player => {
        console.log(`📊 ${player.name}: ${player.taps?.length || 0} taps`);
      });

      // Generate Excel-friendly timing data for all players
      console.log('\n\n');
      logTimingDataForExcel(game);

      game.status = 'finished';

      // Clear leaderboard interval
      if (game.leaderboardInterval) {
        clearInterval(game.leaderboardInterval);
        console.log('Leaderboard interval cleared');
      }

      const results = game.players.map(player => {
        const tapCount = player.taps?.length || 0;
        const accuracy = calculatePlayerAccuracy(player.taps || []);
        console.log(`📊 ${player.name} accuracy: ${accuracy}% (${tapCount} taps)`);
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

      // Store results in game state for later retrieval
      game.results = results;

      console.log(`Emitting game-ended to room ${data.roomCode} with ${results.length} results`);
      io.to(data.roomCode).emit('game-ended', { results });
      console.log(`Game ended: ${data.roomCode}`);

      if (callback) {
        console.log(`Sending success callback to teacher`);
        callback({ success: true });
      }
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

            // If game is in lobby, remove player completely
            if (game.status === 'lobby') {
              game.players.splice(playerIndex, 1);
              io.to(roomCode).emit('player-left', {
                player,
                totalPlayers: game.players.length,
                playerNames: game.players.map(p => p.name)
              });
            } else {
              // If game is running, just mark as disconnected (keep their data)
              player.connected = false;
              io.to(roomCode).emit('player-connection-status', {
                playerName: player.name,
                connected: false,
                allPlayersReady: game.players.every(p => p.connected)
              });
            }
          }
        }
      });
    });
  });

  console.log(`🎵 Attempting to bind HTTP server to 0.0.0.0:${port}...`);

  httpServer
    .once('error', (err) => {
      console.error('❌ Server error:', err);
      process.exit(1);
    })
    .listen(port, '0.0.0.0', () => {
      console.log(`✅ Server ready on http://0.0.0.0:${port}`);
      console.log(`📡 Socket.IO initialized and ready for connections`);
    });
});
