// Rhythm Engine using Tone.js for precise timing
import * as Tone from 'tone';
import { Midi } from '@tonejs/midi';
import type { NoteValue, GameConfig, AudioMetadata } from '@/types/game';
import { NOTE_VALUES } from '@/types/game';

// Beat marker from MIDI file
export interface MidiBeatMarker {
  beat: number;      // Beat number (0-indexed)
  time: number;      // Time in seconds from start of MIDI
}

export class RhythmEngine {
  private metronome: Tone.Player | null = null;
  private songPlayer: Tone.Player | null = null;
  private transport: typeof Tone.Transport;
  private tempo: number;
  private isPlaying: boolean = false;
  private currentNoteValue: NoteValue = 'quarter';
  private beatCallbacks: Array<(beat: number) => void> = [];
  private startTime: number = 0;
  private metronomeSynth: Tone.MembraneSynth | null = null;
  private isMuted: boolean = false;
  private hasSong: boolean = false;
  
  // MIDI sync data
  private midiData: Midi | null = null;
  private midiBeatMarkers: MidiBeatMarker[] = [];
  private hasMidi: boolean = false;

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

  // Get current transport time in seconds
  getTransportSeconds(): number {
    return this.transport.seconds;
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
    const COUNT_IN_BEATS = 4;

    this.transport.scheduleRepeat((time) => {
      if (this.metronomeSynth) {
        const isCountIn = beatCount < COUNT_IN_BEATS;
        const isDownbeat = beatCount % 4 === 0;

        if (isCountIn) {
          // Count-in: four low clicks so students line up with the teacher
          this.metronomeSynth.triggerAttackRelease('C2', '32n', time);
        } else {
          // Gameplay: accent each downbeat
          const pitch = isDownbeat ? 'C3' : 'C2';
          this.metronomeSynth.triggerAttackRelease(pitch, '32n', time);
        }
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

  // Load MIDI file and extract beat markers
  async loadMidi(midiUrl: string) {
    try {
      const response = await fetch(midiUrl);
      const arrayBuffer = await response.arrayBuffer();
      this.midiData = new Midi(arrayBuffer);
      
      // Extract beat markers from the first track's notes
      // Each note in the MIDI represents a beat
      this.midiBeatMarkers = [];
      
      if (this.midiData.tracks.length > 0) {
        const track = this.midiData.tracks[0];
        track.notes.forEach((note, index) => {
          this.midiBeatMarkers.push({
            beat: index,
            time: note.time  // Time in seconds
          });
        });
      }
      
      this.hasMidi = true;
      return this.midiData;
    } catch (error) {
      console.error('[RhythmEngine] Failed to load MIDI:', error);
      this.hasMidi = false;
      return null;
    }
  }

  // Load a song for playback (synced to transport)
  async loadSong(audioMetadata: AudioMetadata) {
    // Load MIDI first if available
    if (audioMetadata.midiUrl) {
      await this.loadMidi(audioMetadata.midiUrl);
    }
    
    // Load audio
    this.songPlayer = new Tone.Player(audioMetadata.audioUrl).toDestination();
    await this.songPlayer.load(audioMetadata.audioUrl);
    
    // Sync player to transport so it starts/stops with transport
    this.songPlayer.sync();
    
    this.hasSong = true;
    return this.songPlayer;
  }

  // Start the song (call after transport.start())
  startSong() {
    if (this.songPlayer && this.hasSong) {
      // Start from the beginning, synced to transport
      this.songPlayer.start(0);
    }
  }

  // Stop the song
  stopSong() {
    if (this.songPlayer) {
      this.songPlayer.stop();
    }
  }

  // Check if a song is loaded
  hasSongLoaded(): boolean {
    return this.hasSong;
  }

  // Check if MIDI is loaded
  hasMidiLoaded(): boolean {
    return this.hasMidi;
  }

  // Get beat markers from MIDI
  getBeatMarkers(): MidiBeatMarker[] {
    return this.midiBeatMarkers;
  }

  // Get the current beat number based on MIDI timing
  getCurrentBeatFromMidi(): number {
    if (!this.hasMidi || this.midiBeatMarkers.length === 0) {
      // Fallback to mathematical calculation
      return Math.floor(this.transport.seconds / (60 / this.tempo));
    }

    const currentTime = this.transport.seconds;
    
    // Find the last beat marker that has passed
    let currentBeat = 0;
    for (let i = 0; i < this.midiBeatMarkers.length; i++) {
      if (this.midiBeatMarkers[i].time <= currentTime) {
        currentBeat = this.midiBeatMarkers[i].beat;
      } else {
        break;
      }
    }
    
    return currentBeat;
  }


  // Get the current measure number based on MIDI timing (assumes 4/4 time)
  getCurrentMeasureFromMidi(beatsPerMeasure: number = 4): number {
    const currentBeat = this.getCurrentBeatFromMidi();
    return Math.floor(currentBeat / beatsPerMeasure);
  }

  // Schedule callbacks based on MIDI beat markers
  onMidiBeat(callback: (beat: number, measure: number) => void, beatsPerMeasure: number = 4) {
    if (!this.hasMidi || this.midiBeatMarkers.length === 0) {
      // Fallback to mathematical beat scheduling
      this.transport.scheduleRepeat((time) => {
        const beat = Math.floor(this.transport.seconds / (60 / this.tempo));
        const measure = Math.floor(beat / beatsPerMeasure);
        callback(beat, measure);
      }, '4n');
      return;
    }

    // Schedule a callback for each MIDI beat marker
    this.midiBeatMarkers.forEach((marker) => {
      this.transport.schedule((time) => {
        const measure = Math.floor(marker.beat / beatsPerMeasure);
        callback(marker.beat, measure);
      }, marker.time);
    });
  }

  // Mute/unmute the song
  muteSong() {
    if (this.songPlayer) {
      this.songPlayer.volume.value = -Infinity;
    }
  }

  unmuteSong() {
    if (this.songPlayer) {
      this.songPlayer.volume.value = 0;
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
    if (this.songPlayer) {
      this.songPlayer.dispose();
      this.songPlayer = null;
      this.hasSong = false;
    }
  }
}

// Helper function to create a rhythm engine from game config
export function createRhythmEngine(config: GameConfig): RhythmEngine {
  return new RhythmEngine(config.tempo);
}
