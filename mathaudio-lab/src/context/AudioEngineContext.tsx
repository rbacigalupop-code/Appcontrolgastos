import React, {
  createContext,
  useContext,
  useRef,
  useState,
  useCallback,
  useEffect,
} from 'react';
import * as Tone from 'tone';

interface AudioEngineContextValue {
  isReady: boolean;
  isStarted: boolean;
  startEngine: () => Promise<void>;
  triggerBassNote: (note: string, duration?: string) => void;
  triggerPolyNote: (note: string | string[], duration?: string) => void;
  triggerDrum: (drum: 'kick' | 'snare' | 'hihat', time?: number) => void;
  setBpm: (bpm: number) => void;
  startTransport: () => void;
  stopTransport: () => void;
  waveAnalyser: React.MutableRefObject<Tone.Analyser | null>;
  bassSynthRef: React.MutableRefObject<Tone.MonoSynth | null>;
}

const AudioEngineContext = createContext<AudioEngineContextValue | null>(null);

export function AudioEngineProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [isStarted, setIsStarted] = useState(false);

  const masterGainRef = useRef<Tone.Gain | null>(null);
  const waveAnalyser = useRef<Tone.Analyser | null>(null);
  const polySynthRef = useRef<Tone.PolySynth | null>(null);
  const bassSynthRef = useRef<Tone.MonoSynth | null>(null);
  const kickRef = useRef<Tone.MembraneSynth | null>(null);
  const snareRef = useRef<Tone.NoiseSynth | null>(null);
  const hihatRef = useRef<Tone.MetalSynth | null>(null);
  const initialized = useRef(false);

  const startEngine = useCallback(async () => {
    // AudioContext MUST start from a user gesture — no latency tricks.
    await Tone.start();
    Tone.getContext().lookAhead = 0.01; // 10ms lookahead minimizes latency

    if (initialized.current) {
      setIsStarted(true);
      return;
    }
    initialized.current = true;

    // Master gain routes all synths to output AND analyser simultaneously
    const masterGain = new Tone.Gain(0.85).toDestination();
    masterGainRef.current = masterGain;

    // Waveform analyser taps the master gain (non-destructive parallel read)
    const analyser = new Tone.Analyser('waveform', 2048);
    masterGain.connect(analyser);
    waveAnalyser.current = analyser;

    // ─── PolySynth: wave demos, chords, melodic visualization ───────────────
    const poly = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle8' },
      envelope: { attack: 0.015, decay: 0.12, sustain: 0.5, release: 1.8 },
      volume: -8,
    });
    poly.connect(masterGain);
    polySynthRef.current = poly;

    // ─── Bass MonoSynth: sawtooth + LP filter — electric bass timbre ────────
    const bass = new Tone.MonoSynth({
      oscillator: { type: 'sawtooth' },
      filter: { Q: 4, type: 'lowpass', rolloff: -24 },
      envelope: { attack: 0.005, decay: 0.2, sustain: 0.5, release: 1.0 },
      filterEnvelope: {
        attack: 0.005,
        decay: 0.12,
        sustain: 0.4,
        release: 1.0,
        baseFrequency: 100,
        octaves: 2.8,
      },
      volume: -4,
    });
    bass.connect(masterGain);
    bassSynthRef.current = bass;

    // ─── Synthesized Drums ───────────────────────────────────────────────────
    const kick = new Tone.MembraneSynth({
      pitchDecay: 0.06,
      octaves: 8,
      envelope: { attack: 0.001, decay: 0.35, sustain: 0, release: 0.2 },
      volume: -2,
    });
    kick.connect(masterGain);
    kickRef.current = kick;

    const snare = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.18, sustain: 0, release: 0.12 },
      volume: -8,
    });
    snare.connect(masterGain);
    snareRef.current = snare;

    const hihat = new Tone.MetalSynth({
      envelope: { attack: 0.001, decay: 0.07, release: 0.06 },
      harmonicity: 5.1,
      modulationIndex: 32,
      resonance: 4200,
      octaves: 1.5,
      volume: -14,
    });
    hihat.frequency.value = 400;
    hihat.connect(masterGain);
    hihatRef.current = hihat;

    setIsReady(true);
    setIsStarted(true);
  }, []);

  // Eagerly resume AudioContext if it was suspended by browser policy
  useEffect(() => {
    const resume = () => {
      if (Tone.getContext().state === 'suspended') {
        Tone.getContext().resume();
      }
    };
    document.addEventListener('click', resume, { once: true });
    return () => document.removeEventListener('click', resume);
  }, []);

  const triggerBassNote = useCallback((note: string, duration = '2n') => {
    const synth = bassSynthRef.current;
    if (!synth) return;
    synth.triggerAttackRelease(note, duration, Tone.now());
  }, []);

  const triggerPolyNote = useCallback(
    (note: string | string[], duration = '4n') => {
      const synth = polySynthRef.current;
      if (!synth) return;
      // PolySynth accepts Frequency | Frequency[]; cast bypasses narrow TS signature
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (synth as any).triggerAttackRelease(note, duration, Tone.now());
    },
    []
  );

  const triggerDrum = useCallback(
    (drum: 'kick' | 'snare' | 'hihat', time?: number) => {
      const t = time ?? Tone.now();
      if (drum === 'kick') kickRef.current?.triggerAttackRelease('C1', '8n', t);
      if (drum === 'snare') snareRef.current?.triggerAttackRelease('8n', t);
      if (drum === 'hihat') hihatRef.current?.triggerAttackRelease(400, '32n', t);
    },
    []
  );

  const setBpm = useCallback((bpm: number) => {
    Tone.getTransport().bpm.value = bpm;
  }, []);

  const startTransport = useCallback(() => {
    Tone.getTransport().start();
  }, []);

  const stopTransport = useCallback(() => {
    Tone.getTransport().stop();
    Tone.getTransport().position = 0;
  }, []);

  return (
    <AudioEngineContext.Provider
      value={{
        isReady,
        isStarted,
        startEngine,
        triggerBassNote,
        triggerPolyNote,
        triggerDrum,
        setBpm,
        startTransport,
        stopTransport,
        waveAnalyser,
        bassSynthRef,
      }}
    >
      {children}
    </AudioEngineContext.Provider>
  );
}

export function useAudioEngine() {
  const ctx = useContext(AudioEngineContext);
  if (!ctx) throw new Error('useAudioEngine must be used within AudioEngineProvider');
  return ctx;
}
