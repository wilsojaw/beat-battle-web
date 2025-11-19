# 🥁 Beat Battle - Rhythm Learning Game

A live classroom rhythm game for music education. Like Guitar Hero meets Kahoot!

## Overview

Beat Battle is a web-based rhythm game that allows teachers to run live, interactive rhythm training sessions with their students. Students tap along to different note values while the game tracks their accuracy and provides real-time feedback.

## Features

### For Teachers
- **Easy Setup**: Configure tempo, note values, segment duration, and game length
- **Live Lobby**: Students join with a simple room code
- **Real-Time Monitoring**: Track class participation and engagement during gameplay
- **Comprehensive Results**: View leaderboards, class averages, and identify areas for improvement

### For Students
- **Simple Join Process**: Enter room code and name to join
- **Interactive Gameplay**: Tap anywhere on screen to play rhythms
- **Real-Time Feedback**: Instant visual feedback on accuracy
- **Detailed Results**: See personal performance with encouraging feedback

### Game Features
- Multiple note values: Quarter, Half, Whole, Eighth, Dotted Quarter, Dotted Eighth, Sixteenth
- Adjustable tempo (60-180 BPM)
- Configurable game length (1-5 minutes)
- Three leaderboard styles: Full, Top 3, Stars Only
- Web Audio API for precise timing
- Real-time synchronization via Socket.io

## Tech Stack

- **Framework**: Next.js 16 with TypeScript
- **Styling**: Tailwind CSS 4
- **Real-Time**: Socket.io
- **Audio**: Tone.js (Web Audio API wrapper)
- **Deployment**: Vercel-ready

## Getting Started

### Prerequisites
- Node.js 20+ installed
- npm or yarn package manager

### Installation

1. Navigate to the project directory:
```bash
cd beat-battle-web
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Production Build

```bash
npm run build
npm start
```

## How to Play

### Teacher Flow
1. Click "I'm a Teacher" on the home screen
2. Configure game settings:
   - Enter your name
   - Set tempo (BPM)
   - Select note values to include
   - Set segment duration
   - Set total game length
   - Choose leaderboard style
3. Click "Start Lobby" to generate a room code
4. Share the room code with students
5. Click "Start Beat Battle" when all students have joined
6. Monitor student progress during the game
7. View results and leaderboard at the end

### Student Flow
1. Click "I'm a Student" on the home screen
2. Enter your name
3. Enter the room code from your teacher
4. Wait in the lobby for the game to start
5. Tap anywhere on the screen to play the rhythm shown
6. Try to stay in time with the metronome beat
7. View your results at the end

## Game Mechanics

### Rhythm Engine
- Uses Tone.js for high-precision timing
- Metronome plays on every beat
- Expected tap times calculated based on note value
- Accuracy measured in milliseconds from expected tap time

### Accuracy Scoring
- **Great** (🎯): Within 50ms of expected time
- **Good** (✓): Within 100ms of expected time
- **Miss** (✗): More than 100ms off

### Note Values
Each note value has specific tap timing requirements:
- **Quarter Note (♩)**: Tap once every beat
- **Half Note (𝅗𝅥)**: Tap once every 2 beats
- **Whole Note (𝅝)**: Tap once every 4 beats
- **Eighth Note (♪)**: Tap twice every beat
- **Dotted Quarter (♩.)**: Tap every 3 eighth notes
- **Dotted Eighth (♪.)**: Tap every 3 sixteenth notes
- **Sixteenth Note (𝅘𝅥𝅯)**: Tap 4 times every beat

## Project Structure

```
beat-battle-web/
├── app/                      # Next.js app directory
│   ├── page.tsx             # Home page (teacher/student selection)
│   ├── teacher/
│   │   ├── setup/           # Game configuration
│   │   ├── lobby/           # Waiting room with join code
│   │   ├── game/            # Live game monitoring
│   │   └── results/         # End-game results & leaderboard
│   └── student/
│       ├── join/            # Join game with room code
│       ├── waiting/         # Waiting room
│       ├── game/            # Interactive tap gameplay
│       └── results/         # Personal results
├── lib/
│   ├── rhythm-engine.ts     # Core timing & accuracy logic
│   └── socket-server.ts     # Socket.io server logic (unused, see server.js)
├── types/
│   └── game.ts              # TypeScript type definitions
├── server.js                # Custom Next.js server with Socket.io
└── public/                  # Static assets

```

## Socket.io Events

### Teacher Events
- `create-game`: Create a new game session
- `start-game`: Begin the game
- `change-segment`: Move to next note value
- `end-game`: End the game and calculate results

### Student Events
- `join-game`: Join an existing game
- `submit-tap`: Submit a tap for scoring

### Broadcast Events
- `player-joined`: New player joined
- `player-left`: Player disconnected
- `game-started`: Game has begun
- `segment-changed`: Note value changed
- `game-ended`: Game finished with results

## Future Enhancements

### Phase 1 (Current - MVP)
- ✅ Core gameplay with tap detection
- ✅ Real-time multiplayer
- ✅ Results and leaderboards
- ✅ Multiple note values
- ✅ Configurable game settings

### Phase 2 (Planned)
- [ ] Song playback with pre-defined rhythms
- [ ] Team mode
- [ ] Accessibility profiles per student
- [ ] Session history and analytics
- [ ] Export results to CSV
- [ ] Practice mode assignment
- [ ] QR code for easy joining

### Phase 3 (Future)
- [ ] Mobile app integration (iOS/Android via ImBored app)
- [ ] Teacher dashboard for multiple classes
- [ ] Student progress tracking over time
- [ ] Custom song uploads
- [ ] Advanced rhythm patterns (triplets, swing, polyrhythms)
- [ ] Integration with ImBored activity tracking

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Vercel will auto-detect Next.js
4. Deploy!

The custom server (server.js) will work on Vercel with their serverless functions.

### Other Platforms

For platforms that don't support custom servers:
1. Remove the custom server.js
2. Use API routes for Socket.io
3. May require additional configuration

## Troubleshooting

### Audio Not Playing
- Ensure user has interacted with the page (Web Audio requires user gesture)
- Check browser console for audio context errors
- Try using headphones for better experience

### Connection Issues
- Check that port 3000 is not blocked
- Verify Socket.io connection in browser console
- Ensure both teacher and students are on same network (for local testing)

### Timing Issues
- Close unnecessary browser tabs
- Use Chrome or Safari for best performance
- Ensure stable internet connection

## Development Notes

- Custom server (`server.js`) required for Socket.io integration
- Uses Next.js 16 App Router
- All pages use 'use client' directive for interactive features
- Suspense boundaries added for search params usage
- Session storage used for room codes and player info

## Contributing

This project is part of the ImBored educational app platform. For contributions or questions, please refer to the main project repository.

## License

Proprietary - Part of the ImBored App platform

---

Built with ❤️ for music educators and students
