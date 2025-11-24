'use client';

import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 via-pink-500 to-red-500">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-white mb-4">🥁 Beat Battle</h1>
        <p className="text-2xl text-white/90 mb-12">Rhythm Learning Game</p>

        <div className="flex flex-col sm:flex-row gap-6 justify-center">
          <Link
            href="/teacher"
            className="bg-white text-purple-600 px-8 py-4 rounded-xl text-xl font-semibold hover:bg-purple-50 transition-all transform hover:scale-105 shadow-lg"
          >
            🎓 I'm a Teacher
          </Link>

          <Link
            href="/student"
            className="bg-white text-pink-600 px-8 py-4 rounded-xl text-xl font-semibold hover:bg-pink-50 transition-all transform hover:scale-105 shadow-lg"
          >
            🎵 I'm a Student
          </Link>
        </div>

        <div className="mt-16 text-white/80 text-sm">
          <p>A live classroom game that tests rhythmic understanding</p>
          <p className="mt-2">Like Guitar Hero meets Kahoot! 🎸✨</p>
        </div>
      </div>
    </div>
  );
}
