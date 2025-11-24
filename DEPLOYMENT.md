# Beat Battle - Deployment Guide

## 🚀 Production Deployment

### Prerequisites

- Node.js 18+ (verified working on Node 18.17.0+)
- Railway account (or any Node.js hosting platform)
- Custom domain (optional but recommended)

### Environment Variables

Set these in your hosting platform:

```bash
# Required
NODE_ENV=production
PORT=8080

# Optional (auto-detected if not set)
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_SOCKET_URL=https://your-domain.com
```

### Railway Deployment

1. **Connect Repository**
   ```bash
   # Install Railway CLI
   npm i -g @railway/cli

   # Login and link project
   railway login
   railway link
   ```

2. **Configure Build Settings**
   - Build Command: `npm run build`
   - Start Command: `npm start`
   - Port: `8080` (Railway expects 8080, not 3000)

3. **Deploy**
   ```bash
   railway up
   ```

4. **Verify Deployment**
   - Check logs: `railway logs`
   - Test Socket.io connection: Look for `[Socket.io] Client connected` in logs
   - Monitor connections: `railway logs --filter="Socket.io"`

### Performance Tuning

The server is configured for **10,000-30,000 concurrent connections** per instance with:

- ✅ Connection State Recovery (2-minute disconnect recovery window)
- ✅ `perMessageDeflate: false` (prevents memory exhaustion)
- ✅ 60s ping timeout (stable long-running connections)
- ✅ WebSocket-first transport (polling fallback)

For larger scale (30,000+ students):
1. Enable horizontal scaling (multiple Railway instances)
2. Add Redis adapter for multi-instance Socket.io
3. Implement rate limiting per room/player

## 📱 Browser Requirements

### Supported Browsers

| Browser | Version | Status |
|---------|---------|--------|
| Chrome (Desktop) | 90+ | ✅ Recommended |
| Chrome (Mobile) | 90+ | ✅ Recommended |
| Safari (Desktop) | 14+ | ✅ Supported |
| Safari (iOS) | 14+ | ✅ Supported |
| Edge | 90+ | ✅ Supported |
| Firefox | 88+ | ⚠️ Limited testing |

### Critical Requirements

**For Students:**
- ✅ JavaScript enabled
- ✅ Stable internet connection (3G minimum, 4G/WiFi recommended)
- ✅ **Keep browser tab in foreground** (background tabs have throttled timers)
- ✅ **Do not lock device** during gameplay
- ✅ Allow audio playback (Web Audio API)

**For Teachers:**
- Same as students
- ✅ Larger screen recommended (tablets or desktop preferred)

## 👨‍🎓 Student Instructions

### Quick Start

1. **Open the app** in Chrome or Safari
2. **Tap "I'm a Student"**
3. **Enter your name** and the **room code** from your teacher
4. **Wait in the lobby** until the teacher starts
5. **Keep the browser tab visible** during the entire game
6. **Tap the screen** in rhythm when the game starts

### Important Notes

⚠️ **DO NOT:**
- Switch to another app during the game
- Lock your device during the game
- Refresh the page during gameplay (connection will recover automatically if you disconnect briefly)

✅ **DO:**
- Keep the game tab in the foreground
- Keep your device unlocked
- Ensure volume is up to hear the metronome (optional but helpful)
- Have a stable internet connection

### Troubleshooting

| Problem | Solution |
|---------|----------|
| "Not connected" status | Check internet connection, wait for auto-reconnect |
| Can't hear sounds | Enable audio, check device volume, tap screen to activate audio |
| Accuracy seems off | Ensure browser tab is in foreground, check for network lag |
| Game froze | Stay on the page - connection recovery will restore state within 2 minutes |
| Disconnected during game | Don't refresh! The app will auto-reconnect and restore your progress |

## 👨‍🏫 Teacher Instructions

### Creating a Game

1. **Open the app** on desktop or tablet
2. **Tap "I'm a Teacher"**
3. **Configure the game:**
   - Enter your name
   - Set tempo (60-200 BPM)
   - Choose note values to practice
   - Set total measures or duration
   - Choose leaderboard style (live or end-of-game)
4. **Share the room code** with students (display on projector/board)
5. **Wait for students to join** (see player list in lobby)
6. **Start the game** when ready

### During the Game

- **Monitor student progress** in the live leaderboard (if enabled)
- **Don't close or refresh the page** - connection recovery will restore if you disconnect
- **End the game manually** or let it finish automatically after configured duration

### After the Game

- **Review results:** Overall accuracy, best/worst note types per student
- **Class statistics:** Average accuracy, most struggled note, top performers
- **Export timing data** (if enabled) for detailed analysis in Excel

### Best Practices

✅ **Before class:**
- Test your internet connection
- Create a test game and join from a student device
- Prepare room code display (projector, whiteboard, etc.)

✅ **During class:**
- Use a stable internet connection (wired Ethernet preferred)
- Keep the teacher dashboard visible
- Monitor connection status indicator
- Have a backup plan if internet fails (connection recovery handles brief outages)

## 🔍 Monitoring & Debugging

### Connection Monitoring

Watch for these log patterns:

```bash
# Successful connection
[Socket.io] Client connected: abc123 (transport: websocket)

# Connection recovery (within 2 minutes)
[Socket.io] ✅ Connection recovered for: abc123

# Transport upgrade (optimal)
[Socket.io] Transport upgraded to: websocket

# Warning signs
[Socket.io] ⚠️  Ping timeout - client may have lost connection
[Socket.io] ⚠️  Transport closed - network issue likely
```

### Common Issues

**High latency (>200ms):**
- Check server location relative to students
- Verify network congestion (school WiFi bandwidth)
- Consider regional deployment

**Frequent disconnects:**
- Check pingTimeout setting (currently 60s)
- Verify stable internet connection
- Check for aggressive firewall/proxy settings

**Students missing events:**
- Verify single-page architecture is working (no page navigation)
- Check browser console for errors
- Ensure students keep tab in foreground

## 🧪 Testing Checklist

### Pre-Deployment Testing

- [ ] Create game as teacher
- [ ] Join game from 2-3 student devices
- [ ] Start game and verify all students transition to playing view
- [ ] Submit taps and verify accuracy calculation
- [ ] Verify live leaderboard updates (if enabled)
- [ ] End game and verify results display correctly
- [ ] Test connection recovery (disconnect/reconnect mid-game)
- [ ] Test with poor network conditions (throttle to 3G)

### Cross-Browser Testing

- [ ] Chrome Desktop (primary browser)
- [ ] Chrome Android (primary mobile)
- [ ] Safari Desktop
- [ ] Safari iOS (iPhone and iPad)
- [ ] Edge Desktop
- [ ] Test with browser tab backgrounded (should show warning)

### Scale Testing

For large classes (50+ students):
- [ ] Load test with 50-100 concurrent connections
- [ ] Monitor server memory usage
- [ ] Verify WebSocket transport (not polling fallback)
- [ ] Check for memory leaks during long games

## 📊 Architecture Reference

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed technical documentation:

- Socket.io best practices implementation
- Single-page architecture (Kahoot-style)
- State management with Zustand
- Connection state recovery
- Error handling strategy

## 🆘 Support

If you encounter issues:

1. Check browser console for errors
2. Check server logs for Socket.io connection issues
3. Verify environment variables are set correctly
4. Test connection recovery by disconnecting/reconnecting
5. Ensure students are keeping browser tabs in foreground

For feature requests or bug reports, please open an issue on GitHub.
