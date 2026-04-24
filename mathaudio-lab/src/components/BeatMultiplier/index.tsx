import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import * as Tone from 'tone';
import { useAudioEngine } from '../../context/AudioEngineContext';
import { useUserMode } from '../../context/UserModeContext';
import type { DrumTrack, BeatCell } from '../../types';

// ─── Constants ────────────────────────────────────────────────────────────────

const DRUM_TRACKS: { id: DrumTrack; label: string; labelShort: string }[] = [
  { id: 'kick',  label: 'Bombo',   labelShort: 'BD' },
  { id: 'snare', label: 'Caja',    labelShort: 'SN' },
  { id: 'hihat', label: 'Hi-Hat',  labelShort: 'HH' },
];

const DEFAULT_GRID: Record<DrumTrack, BeatCell[]> = {
  kick:  Array.from({ length: 16 }, (_, i) => ({ active: i % 4 === 0,  velocity: 1 })),
  snare: Array.from({ length: 16 }, (_, i) => ({ active: i % 4 === 2,  velocity: 0.8 })),
  hihat: Array.from({ length: 16 }, (_, i) => ({ active: i % 2 === 0,  velocity: 0.6 })),
};

const MIN_BASE = 1;
const MAX_BASE = 8;
const MIN_MULT = 1;
const MAX_MULT = 8;
const MIN_BPM  = 60;
const MAX_BPM  = 200;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildGrid(steps: number, old: BeatCell[]): BeatCell[] {
  return Array.from({ length: steps }, (_, i) =>
    old[i] ?? { active: false, velocity: 1 }
  );
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BeatMultiplier() {
  const { mode } = useUserMode();
  const { startEngine, triggerDrum, setBpm, startTransport, stopTransport, isStarted } =
    useAudioEngine();

  const [bpm, setBpmState]         = useState(120);
  const [base, setBase]            = useState(4);
  const [multiplier, setMultiplier]= useState(4);
  const [isPlaying, setIsPlaying]  = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [grid, setGrid]            = useState<Record<DrumTrack, BeatCell[]>>(DEFAULT_GRID);

  const totalSteps = base * multiplier;
  const seqRef = useRef<Tone.Sequence | null>(null);

  // ── Rebuild grid when dimensions change ─────────────────────────────────────
  useEffect(() => {
    setGrid(prev => ({
      kick:  buildGrid(totalSteps, prev.kick),
      snare: buildGrid(totalSteps, prev.snare),
      hihat: buildGrid(totalSteps, prev.hihat),
    }));
  }, [totalSteps]);

  // ── Sync BPM to transport ───────────────────────────────────────────────────
  useEffect(() => {
    setBpm(bpm);
  }, [bpm, setBpm]);

  // ── Rebuild Tone.Sequence whenever grid or totalSteps changes ───────────────
  const gridRef = useRef(grid);
  gridRef.current = grid;

  const rebuildSequence = useCallback(() => {
    if (seqRef.current) {
      seqRef.current.dispose();
      seqRef.current = null;
    }

    const steps = Array.from({ length: totalSteps }, (_, i) => i);

    seqRef.current = new Tone.Sequence(
      (time: number, step: number) => {
        const g = gridRef.current;
        DRUM_TRACKS.forEach(({ id }) => {
          if (g[id][step]?.active) {
            triggerDrum(id, time);
          }
        });
        // Schedule UI update in sync with audio clock
        Tone.getDraw().schedule(() => {
          setCurrentStep(step);
        }, time);
      },
      steps,
      '16n'
    );

    if (isPlaying) seqRef.current.start(0);
  }, [totalSteps, triggerDrum, isPlaying]);

  // Rebuild whenever grid content or totalSteps changes
  useEffect(() => {
    if (isPlaying) rebuildSequence();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(grid), totalSteps]);

  // ── Play / Stop ──────────────────────────────────────────────────────────────
  const handlePlayStop = useCallback(async () => {
    if (!isStarted) await startEngine();

    if (isPlaying) {
      stopTransport();
      seqRef.current?.stop();
      seqRef.current?.dispose();
      seqRef.current = null;
      setIsPlaying(false);
      setCurrentStep(-1);
    } else {
      rebuildSequence();
      seqRef.current!.start(0);
      startTransport();
      setIsPlaying(true);
    }
  }, [isPlaying, isStarted, startEngine, startTransport, stopTransport, rebuildSequence]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      seqRef.current?.dispose();
      if (isPlaying) stopTransport();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Toggle cell ──────────────────────────────────────────────────────────────
  const toggleCell = (track: DrumTrack, step: number) => {
    setGrid(prev => ({
      ...prev,
      [track]: prev[track].map((cell, i) =>
        i === step ? { ...cell, active: !cell.active } : cell
      ),
    }));
  };

  const isDaw = mode === 'C';

  // ─── Track colors (Mode G only) ───────────────────────────────────────────
  const trackColors: Record<DrumTrack, string> = {
    kick:  '#f87171',
    snare: '#60a5fa',
    hihat: '#4ade80',
  };

  // Highlight beat groups (Mode G)
  const groupColor = (step: number) => {
    const groupIdx = Math.floor(step / base);
    const hues = ['#fbbf2418', '#a78bfa18', '#fb923c18', '#4ade8018',
                  '#f4729f18', '#60a5fa18', '#f87171 18', '#00ff9d18'];
    return hues[groupIdx % hues.length];
  };

  return (
    <div
      className={`rounded-xl overflow-hidden border ${
        isDaw
          ? 'bg-daw-surface border-daw-border'
          : 'bg-lab-card border-lab-border shadow-sm'
      }`}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div
        className={`px-4 py-3 border-b flex items-center justify-between gap-4 flex-wrap ${
          isDaw ? 'border-daw-border' : 'border-lab-border'
        }`}
      >
        <div>
          <h2
            className={`font-semibold text-sm tracking-wide ${
              isDaw ? 'text-daw-text font-mono' : 'text-lab-text'
            }`}
          >
            {isDaw ? 'BEAT MULTIPLIER — SEQUENCER' : '🥁 Multiplicador de Beats'}
          </h2>
          <p className={`text-xs mt-0.5 ${isDaw ? 'text-daw-muted font-mono' : 'text-lab-muted'}`}>
            {isDaw
              ? `BASE × MULT = STEPS  |  ${base} × ${multiplier} = ${totalSteps} steps @ ${bpm} BPM`
              : `${base} grupos × ${multiplier} tiempos = ${totalSteps} tiempos en total`}
          </p>
        </div>

        {/* Math display badge */}
        <div
          className={`px-3 py-1.5 rounded-lg font-mono text-sm font-bold flex items-center gap-2 ${
            isDaw
              ? 'bg-daw-s2 text-daw-accent border border-daw-border'
              : 'bg-lab-accent/10 text-lab-accent border border-lab-border'
          }`}
        >
          <span>{base}</span>
          <span className={isDaw ? 'text-daw-muted' : 'text-lab-muted'}>×</span>
          <span>{multiplier}</span>
          <span className={isDaw ? 'text-daw-muted' : 'text-lab-muted'}>=</span>
          <span className={isDaw ? 'text-daw-accent' : 'text-lab-accent text-base'}>
            {totalSteps}
          </span>
        </div>
      </div>

      {/* ── Controls row ────────────────────────────────────────────────────── */}
      <div
        className={`px-4 py-3 flex items-center gap-6 flex-wrap border-b ${
          isDaw ? 'border-daw-border bg-daw-s2' : 'border-lab-border bg-slate-50/60'
        }`}
      >
        {/* Base control */}
        <ParamControl
          label={isDaw ? 'BASE' : 'Grupos (Base)'}
          value={base}
          min={MIN_BASE} max={MAX_BASE}
          onDecrement={() => setBase(b => clamp(b - 1, MIN_BASE, MAX_BASE))}
          onIncrement={() => setBase(b => clamp(b + 1, MIN_BASE, MAX_BASE))}
          isDaw={isDaw}
          color={isDaw ? undefined : '#f472b6'}
        />

        {/* Multiplier control */}
        <ParamControl
          label={isDaw ? 'MULT' : 'Tiempos (Multiplicador)'}
          value={multiplier}
          min={MIN_MULT} max={MAX_MULT}
          onDecrement={() => setMultiplier(m => clamp(m - 1, MIN_MULT, MAX_MULT))}
          onIncrement={() => setMultiplier(m => clamp(m + 1, MIN_MULT, MAX_MULT))}
          isDaw={isDaw}
          color={isDaw ? undefined : '#a78bfa'}
        />

        {/* BPM control */}
        <ParamControl
          label={isDaw ? 'BPM' : 'Velocidad (BPM)'}
          value={bpm}
          min={MIN_BPM} max={MAX_BPM} step={5}
          onDecrement={() => setBpmState(b => clamp(b - 5, MIN_BPM, MAX_BPM))}
          onIncrement={() => setBpmState(b => clamp(b + 5, MIN_BPM, MAX_BPM))}
          isDaw={isDaw}
          color={isDaw ? undefined : '#60a5fa'}
        />

        {/* Play / Stop */}
        <motion.button
          whileTap={{ scale: 0.93 }}
          onClick={handlePlayStop}
          className={`ml-auto px-5 py-2 rounded-lg font-semibold text-sm transition-colors ${
            isDaw
              ? isPlaying
                ? 'bg-daw-error text-white hover:bg-red-600'
                : 'bg-daw-accent text-daw-bg hover:bg-daw-accent-dim'
              : isPlaying
              ? 'bg-red-400 text-white hover:bg-red-500'
              : 'bg-lab-accent text-white hover:bg-lab-accent-soft'
          }`}
        >
          {isPlaying ? (isDaw ? '■ STOP' : '⏹ Detener') : (isDaw ? '▶ PLAY' : '▶ Reproducir')}
        </motion.button>
      </div>

      {/* ── Grid ────────────────────────────────────────────────────────────── */}
      <div className={`px-4 py-4 overflow-x-auto ${isDaw ? 'bg-daw-bg' : 'bg-white'}`}>
        <div className="min-w-max space-y-1.5">
          {DRUM_TRACKS.map(({ id, label, labelShort }) => (
            <div key={id} className="flex items-center gap-2">
              {/* Track label */}
              <div
                className={`w-14 text-right text-xs font-semibold shrink-0 ${
                  isDaw ? 'text-daw-muted font-mono' : 'text-lab-muted'
                }`}
                style={!isDaw ? { color: trackColors[id] } : undefined}
              >
                {isDaw ? labelShort : label}
              </div>

              {/* Beat cells */}
              <div className="flex gap-1">
                {grid[id].map((cell, step) => {
                  const isCurrent = step === currentStep && isPlaying;
                  const isGroupStart = step % base === 0;

                  return (
                    <div key={step} className="relative">
                      {/* Group boundary indicator (Mode G) */}
                      {!isDaw && isGroupStart && step > 0 && (
                        <div className="absolute -left-0.5 top-0 bottom-0 w-px bg-lab-border opacity-60" />
                      )}

                      <motion.button
                        whileTap={{ scale: 0.88 }}
                        onClick={() => toggleCell(id, step)}
                        animate={{
                          backgroundColor: isCurrent
                            ? isDaw ? '#00ff9d' : trackColors[id]
                            : cell.active
                            ? isDaw
                              ? '#7c3aed'
                              : trackColors[id]
                            : isDaw
                            ? '#242424'
                            : groupColor(step),
                          scale: isCurrent ? 1.12 : 1,
                        }}
                        transition={{ duration: 0.06 }}
                        className={`w-7 h-7 rounded-sm border transition-colors ${
                          isDaw
                            ? 'border-daw-border'
                            : cell.active
                            ? 'border-transparent'
                            : 'border-lab-border'
                        }`}
                        title={`${label} — Step ${step + 1}`}
                        aria-pressed={cell.active}
                        aria-label={`${label} paso ${step + 1} ${cell.active ? 'activo' : 'inactivo'}`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Step numbers */}
          <div className="flex items-center gap-2 mt-1">
            <div className="w-14" />
            <div className="flex gap-1">
              {Array.from({ length: totalSteps }, (_, i) => (
                <div
                  key={i}
                  className={`w-7 text-center font-mono leading-none ${
                    i === currentStep && isPlaying
                      ? isDaw ? 'text-daw-accent' : 'text-lab-accent'
                      : isDaw ? 'text-daw-muted' : 'text-lab-muted'
                  }`}
                  style={{ fontSize: '9px' }}
                >
                  {i + 1}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Math summary (Mode G) ────────────────────────────────────────────── */}
      {!isDaw && (
        <div className="px-4 py-3 border-t border-lab-border bg-indigo-50/50">
          <p className="text-sm text-lab-text">
            <strong>{base} grupos</strong> de <strong>{multiplier} tiempos</strong> cada uno
            = <strong className="text-lab-accent text-base">{totalSteps} tiempos</strong> por vuelta.
            Es igual que la multiplicación: <strong>{base} × {multiplier} = {totalSteps}</strong>.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Reusable param control widget ───────────────────────────────────────────

function ParamControl({
  label, value, min, max, step = 1,
  onDecrement, onIncrement, isDaw, color,
}: {
  label: string; value: number; min: number; max: number; step?: number;
  onDecrement: () => void; onIncrement: () => void;
  isDaw: boolean; color?: string;
}) {
  return (
    <div className="flex flex-col items-start gap-0.5">
      <span
        className={`text-xs font-semibold ${isDaw ? 'text-daw-muted font-mono' : 'text-lab-muted'}`}
        style={color && !isDaw ? { color } : undefined}
      >
        {label}
      </span>
      <div className="flex items-center gap-1.5">
        <motion.button
          whileTap={{ scale: 0.88 }}
          disabled={value <= min}
          onClick={onDecrement}
          className={`w-6 h-6 rounded flex items-center justify-center text-sm font-bold transition-colors disabled:opacity-30 ${
            isDaw
              ? 'bg-daw-s2 text-daw-text hover:bg-daw-border'
              : 'bg-lab-border text-lab-text hover:bg-indigo-100'
          }`}
        >
          −
        </motion.button>
        <span
          className={`w-8 text-center font-bold text-sm ${
            isDaw ? 'text-daw-accent font-mono' : 'text-lab-text'
          }`}
          style={color && !isDaw ? { color } : undefined}
        >
          {value}
        </span>
        <motion.button
          whileTap={{ scale: 0.88 }}
          disabled={value >= max}
          onClick={onIncrement}
          className={`w-6 h-6 rounded flex items-center justify-center text-sm font-bold transition-colors disabled:opacity-30 ${
            isDaw
              ? 'bg-daw-s2 text-daw-text hover:bg-daw-border'
              : 'bg-lab-border text-lab-text hover:bg-indigo-100'
          }`}
        >
          +
        </motion.button>
      </div>
    </div>
  );
}
