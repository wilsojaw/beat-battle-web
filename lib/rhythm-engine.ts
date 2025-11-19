// Rhythm Engine using Tone.js for precise timing
import * as Tone from 'tone';
import type { NoteValue, GameConfig } from '@/types/game';
import { NOTE_VALUES } from '@/types/game';

export class RhythmEngine {
  private metronome: Tone.Player | null = null;
  private transport: typeof Tone.Transport;
  private tempo: number;
  private isPlaying: boolean = false;
  private currentNoteValue: NoteValue = 'quarter';
  private beatCallbacks: Array<(beat: number) => void> = [];
  private startTime: number = 0;
  private metronomeSynth: Tone.MembraneSynth | null = null;
  private isMuted: boolean = false;

  constructor(tempo: number) {
    this.tempo = tempo;
    this.transport = Tone.getTransport();
    this.transport.bpm.value = tempo;
  }

  async init() {
    // Start Tone.js audio context (must be triggered by user interaction)
    await Tone.start();
  }

  setTempo(tempo: number) {
    this.tempo = tempo;
    this.transport.bpm.value = tempo;
  }

  setNoteValue(noteValue: NoteValue) {
    this.currentNoteValue = noteValue;
  }

  start() {
    this.startTime = Tone.now();
    this.transport.start();
    this.isPlaying = true;
  }

  stop() {
    this.transport.stop();
    this.transport.cancel(); // Cancel all scheduled events
    this.isPlaying = false;
    this.beatCallbacks = [];

    // Dispose of metronome synth to prevent reuse errors
    if (this.metronomeSynth) {
      this.metronomeSynth.dispose();
      this.metronomeSynth = null;
    }
  }

  pause() {
    this.transport.pause();
    this.isPlaying = false;
  }

  resume() {
    this.transport.start();
    this.isPlaying = true;
  }

  // Register a callback to be called on each beat
  onBeat(callback: (beat: number) => void) {
    this.beatCallbacks.push(callback);

    // Schedule callback on every quarter note (beat)
    this.transport.scheduleRepeat((time) => {
      const beat = Math.floor(this.transport.seconds / (60 / this.tempo));
      callback(beat);
    }, '4n'); // '4n' = quarter note
  }

  // Get current time in milliseconds since start
  getCurrentTime(): number {
    return (Tone.now() - this.startTime) * 1000;
  }

  // Get the expected tap times for a given note value
  getExpectedTapTimes(noteValue: NoteValue, durationSeconds: number): number[] {
    const noteInfo = NOTE_VALUES[noteValue];
    const beatDuration = 60 / this.tempo; // seconds per beat
    const tapInterval = beatDuration / noteInfo.tapsPerBeat; // seconds between taps

    const expectedTimes: number[] = [];
    let currentTime = 0;

    while (currentTime < durationSeconds) {
      expectedTimes.push(currentTime * 1000); // convert to ms
      currentTime += tapInterval;
    }

    return expectedTimes;
  }

  // Calculate accuracy of a tap based on interval from previous tap
  calculateTapAccuracy(
    tapTime: number,
    previousTapTime: number | null,
    expectedInterval: number
  ): {
    accuracy: number;
    interval: number;
    isAccurate: boolean;
  } {
    // First tap in a segment - no previous tap to compare
    if (previousTapTime === null) {
      return { accuracy: 0, interval: 0, isAccurate: true };
    }

    // Calculate actual interval between this tap and previous tap
    const actualInterval = tapTime - previousTapTime;

    // Calculate how far off from expected interval
    const accuracy = actualInterval - expectedInterval;

    // Consider accurate if within 150ms of expected interval (generous for kids)
    const isAccurate = Math.abs(accuracy) < 150;

    return { accuracy, interval: actualInterval, isAccurate };
  }

  // Play a metronome click
  playClick() {
    // Create a simple click sound
    const synth = new Tone.MembraneSynth().toDestination();
    synth.triggerAttackRelease('C2', '16n');
  }

  // Play a metronome pattern with accented downbeats
  startMetronome() {
    this.metronomeSynth = new Tone.MembraneSynth({
      volume: 0
    }).toDestination();

    let beatCount = 0;

    this.transport.scheduleRepeat((time) => {
      if (this.metronomeSynth) {
        // Every 4th beat (downbeat) is higher pitch and louder
        const isDownbeat = beatCount % 4 === 0;
        const pitch = isDownbeat ? 'C3' : 'C2';  // Higher pitch for downbeat

        this.metronomeSynth.triggerAttackRelease(pitch, '32n', time);
      }
      beatCount++;
    }, '4n');
  }

  // Mute/unmute the metronome
  muteMetronome() {
    this.isMuted = true;
    if (this.metronomeSynth) {
      this.metronomeSynth.volume.value = -Infinity;
    }
  }

  unmuteMetronome() {
    this.isMuted = false;
    if (this.metronomeSynth) {
      this.metronomeSynth.volume.value = 0;
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.muteMetronome();
    } else {
      this.unmuteMetronome();
    }
    return this.isMuted;
  }

  // Load and play a song
  async loadSong(url: string) {
    const player = new Tone.Player(url).toDestination();
    await player.load(url);
    this.metronome = player;
    return player;
  }

  playSong() {
    if (this.metronome) {
      this.metronome.start();
    }
  }

  dispose() {
    this.stop();
    if (this.metronome) {
      this.metronome.dispose();
    }
    if (this.metronomeSynth) {
      this.metronomeSynth.dispose();
    }
  }
}

// Helper function to create a rhythm engine from game config
export function createRhythmEngine(config: GameConfig): RhythmEngine {
  return new RhythmEngine(config.tempo);
}
