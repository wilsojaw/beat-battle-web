'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';

// Store socket on window to persist across hot reloads and page navigations
declare global {
  interface Window {
    studentSocket?: Socket;
  }
}

let socket: Socket;

export default function StudentJoin() {
  const router = useRouter();
  const [playerName, setPlayerName] = useState('Student');
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const joinGame = async () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    if (!roomCode.trim()) {
      setError('Please enter the room code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Connect to Socket.io server - reuse existing socket if available
      if (typeof window !== 'undefined' && window.studentSocket) {
        socket = window.studentSocket;
      } else {
        socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || '');
        if (typeof window !== 'undefined') {
          window.studentSocket = socket;
        }
      }

      socket.on('connect', () => {
        console.log('Student connected to Socket.io:', socket.id);

        // Perform clock synchronization in background (non-blocking)
        (async () => {
          console.log('🕐 Starting clock synchronization...');
          const offsets: number[] = [];

          for (let i = 0; i < 5; i++) {
            const clientSendTime = Date.now();

            await new Promise<void>((resolve) => {
              socket.emit('time-sync', { clientTime: clientSendTime }, (response: any) => {
                const clientReceiveTime = Date.now();
                const roundTripTime = clientReceiveTime - clientSendTime;
                const serverTime = response.serverTime;

                // Calculate offset: server time - estimated client time when server responded
                const estimatedClientTimeAtServer = clientSendTime + (roundTripTime / 2);
                const offset = serverTime - estimatedClientTimeAtServer;

                offsets.push(offset);
                console.log(`Ping ${i + 1}: RTT=${roundTripTime}ms, Offset=${offset}ms`);
                resolve();
              });
            });

            // Small delay between pings
            if (i < 4) await new Promise(resolve => setTimeout(resolve, 100));
          }

          // Calculate median offset (ignore outliers)
          offsets.sort((a, b) => a - b);
          const medianOffset = offsets[Math.floor(offsets.length / 2)];

          console.log(`✅ Clock sync complete! Median offset: ${medianOffset}ms`);

          // Store the time offset
          sessionStorage.setItem('timeOffset', medianOffset.toString());
        })(); // Run in background, don't await
      });

      // Wait for connection then join immediately (don't wait for clock sync)
      if (!socket.connected) {
        await new Promise<void>((resolve) => {
          socket.once('connect', () => resolve());
        });
      }

      socket.emit('join-game', {
        roomCode: roomCode.trim().toUpperCase(),
        playerName: playerName.trim()
      }, (response: any) => {
        if (response.success) {
          // Store player info
          sessionStorage.setItem('roomCode', roomCode.trim().toUpperCase());
          sessionStorage.setItem('playerName', playerName.trim());
          sessionStorage.setItem('isTeacher', 'false');

          // Navigate to waiting room
          router.push(`/student/waiting?code=${roomCode.trim().toUpperCase()}`);
        } else {
          setError(response.error || 'Failed to join game. Please check the room code.');
          setLoading(false);
        }
      });

      // Handle connection errors
      socket.on('connect_error', () => {
        setError('Connection error. Please check your internet connection.');
        setLoading(false);
      });

    } catch (err) {
      setError('Connection error. Please try again.');
      setLoading(false);
    }
  };

  const handleRoomCodeChange = (value: string) => {
    // Auto-uppercase and limit to 6 characters
    setRoomCode(value.toUpperCase().slice(0, 6));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-500 to-pink-500 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-5xl mb-4">🎵</h1>
          <h1 className="text-4xl font-bold text-purple-600 mb-2">Join Beat Battle</h1>
          <p className="text-gray-600">Enter the room code from your teacher</p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* Player Name */}
          <div>
            <label className="block text-lg font-semibold text-gray-700 mb-2">
              Your Name
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter your name"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none text-lg text-gray-900 placeholder:text-gray-400"
              disabled={loading}
              maxLength={20}
            />
          </div>

          {/* Room Code */}
          <div>
            <label className="block text-lg font-semibold text-gray-700 mb-2">
              Room Code
            </label>
            <input
              type="text"
              value={roomCode}
              onChange={(e) => handleRoomCodeChange(e.target.value)}
              placeholder="6-digit code"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none text-2xl font-bold text-center tracking-widest uppercase text-gray-900 placeholder:text-gray-400"
              disabled={loading}
              maxLength={6}
            />
            <p className="text-sm text-gray-500 mt-2">
              Ask your teacher for the 6-character room code
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 space-y-4">
          <button
            onClick={joinGame}
            disabled={loading || !playerName.trim() || !roomCode.trim()}
            className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg text-lg"
          >
            {loading ? 'Joining...' : 'Join Game! 🎮'}
          </button>

          <button
            onClick={() => router.push('/')}
            disabled={loading}
            className="w-full px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors disabled:opacity-50"
          >
            Back
          </button>
        </div>

        {/* Tips */}
        <div className="mt-8 bg-blue-50 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">💡 Quick Tips:</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Get the room code from your teacher's screen</li>
            <li>• Make sure you're connected to the internet</li>
            <li>• Use headphones for the best experience</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
