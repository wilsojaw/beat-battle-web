/**
 * Next.js 404 Not Found Page
 *
 * Automatically rendered when a route doesn't exist
 */
export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-red-500 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full text-center">
        <div className="text-9xl mb-4">🎵</div>
        <h1 className="text-6xl font-bold text-purple-600 mb-4">404</h1>
        <h2 className="text-3xl font-bold text-gray-700 mb-4">
          Oops! This beat doesn't exist
        </h2>
        <p className="text-xl text-gray-600 mb-8">
          The page you're looking for couldn't be found.
        </p>

        <div className="space-y-3">
          <a
            href="/"
            className="block w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg"
          >
            Go to Home Page
          </a>

          <div className="flex gap-3">
            <a
              href="/student"
              className="flex-1 px-6 py-3 bg-blue-100 text-blue-700 rounded-xl font-semibold hover:bg-blue-200 transition-colors"
            >
              Student Portal
            </a>
            <a
              href="/teacher"
              className="flex-1 px-6 py-3 bg-green-100 text-green-700 rounded-xl font-semibold hover:bg-green-200 transition-colors"
            >
              Teacher Portal
            </a>
          </div>
        </div>

        <div className="mt-8 bg-purple-50 rounded-lg p-4">
          <p className="text-sm text-purple-800">
            💡 <strong>Looking for a game?</strong>
          </p>
          <p className="text-sm text-purple-700 mt-2">
            Students: Ask your teacher for the room code and use the Student Portal
          </p>
          <p className="text-sm text-purple-700">
            Teachers: Create a new game from the Teacher Portal
          </p>
        </div>
      </div>
    </div>
  );
}
