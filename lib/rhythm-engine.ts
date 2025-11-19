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

  constructor(tempo: number) {
    this.tempo = tempo;
    this.transport = Tone.getTransport();
    this.transport.bpm.value = tempo;
  }

  async init() {
    // Start Tone.js audio context (must be triggered by user interaction)
    await Tone.start();
    console.log('Audio context started');
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
    console.log('Rhythm engine started at', this.startTime);
  }

  stop() {
    this.transport.stop();
    this.isPlaying = false;
    this.beatCallbacks = [];
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

  // Calculate accuracy of a tap
  calculateTapAccuracy(tapTime: number, expectedTimes: number[]): {
    accuracy: number;
    nearestExpected: number;
    isAccurate: boolean;
  } {
    if (expectedTimes.length === 0) {
      return { accuracy: 0, nearestExpected: 0, isAccurate: false };
    }

    // Find the nearest expected time
    let nearestExpected = expectedTimes[0];
    let minDiff = Math.abs(tapTime - expectedTimes[0]);

    for (const expectedTime of expectedTimes) {
      const diff = Math.abs(tapTime - expectedTime);
      if (diff < minDiff) {
        minDiff = diff;
        nearestExpected = expectedTime;
      }
    }

    // Calculate accuracy in milliseconds
    const accuracy = tapTime - nearestExpected;

    // Consider accurate if within 100ms window
    const isAccurate = Math.abs(accuracy) < 100;

    return { accuracy, nearestExpected, isAccurate };
  }

  // Play a metronome click
  playClick() {
    // Create a simple click sound
    const synth = new Tone.MembraneSynth().toDestination();
    synth.triggerAttackRelease('C2', '16n');
  }

  // Play a metronome pattern
  startMetronome() {
    const synth = new Tone.MembraneSynth().toDestination();

    this.transport.scheduleRepeat((time) => {
      synth.triggerAttackRelease('C2', '32n', time);
    }, '4n');
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
  }
}

// Helper function to create a rhythm engine from game config
export function createRhythmEngine(config: GameConfig): RhythmEngine {
  return new RhythmEngine(config.tempo);
}
