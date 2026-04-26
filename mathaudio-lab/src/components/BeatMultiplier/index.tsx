import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import * as Tone from 'tone';
import { useAudioEngine } from '../../context/AudioEngineContext';
import { useUserMode } from '../../context/UserModeContext';
import type { DrumTrack, BeatCell } from '../../types';

// ─── Types ────────────────────────────────────────────────────────────────────

type OperationMode = 'multiply' | 'subtract' | 'divide';
type Subdivision = '4n' | '8n' | '16n';

// ─── Constants ────────────────────────────────────────────────────────────────

const DRUM_TRACKS: { id: DrumTrack; label: string; labelShort: string }[] = [
  { id: 'kick',  label: 'Bombo',  labelShort: 'BD' },
  { id: 'snare', label: 'Caja',   labelShort: 'SN' },
  { id: 'hihat', label: 'Hi-Hat', labelShort: 'HH' },
];

const SUBDIVISIONS: { value: Subdivision; label: string }[] = [
  { value: '4n',  label: '♩ 1/4'  },
  { value: '8n',  label: '♪ 1/8'  },
  { value: '16n', label: '\u{1D160} 1/16' },
];

const OP_MODES: { value: OperationMode; es: string; en: string }[] = [
  { value: 'multiply', es: 'Multiplicación', en: 'MULTIPLY' },
  { value: 'subtract', es: 'Resta',          en: 'SUBTRACT' },
  { value: 'divide',   es: 'División',       en: 'DIVIDE'   },
];

const MIN_BASE = 1;
const MAX_BASE = 16;
const MIN_MULT = 1;
const MAX_MULT = 8;
const MIN_BPM  = 60;
const MAX_BPM  = 200;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeGrid(
  steps: number,
  allActive: boolean,
): Record<DrumTrack, BeatCell[]> {
  return {
    kick:  Array.from({ length: steps }, (_, i) => ({ active: allActive || i % 4 === 0, velocity: 1   })),
    snare: Array.from({ length: steps }, (_, i) => ({ active: allActive || i % 4 === 2, velocity: 0.8 })),
    hihat: Array.from({ length: steps }, (_, i) => ({ active: allActive || i % 2 === 0, velocity: 0.6 })),
  };
}

function resizeTrack(steps: number, old: BeatCell[], allActive: boolean): BeatCell[] {
  return Array.from({ length: steps }, (_, i) =>
    old[i] ?? { active: allActive, velocity: 1 }
  );
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

const GROUP_COLORS = [
  '#4ade80', '#60a5fa', '#a78bfa', '#f472b6',
  '#fb923c', '#f87171', '#fbbf24', '#00ff9d',
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function BeatMultiplier() {
  const { mode } = useUserMode();
  const { startEngine, triggerDrum, setBpm, startTransport, stopTransport, isStarted } =
    useAudioEngine();

  const [opMode,      setOpMode]      = useState<OperationMode>('multiply');
  const [subdivision, setSubdivision] = useState<Subdivision>('16n');
  const [bpm,         setBpmState]    = useState(120);
  const [base,        setBase]        = useState(4);
  const [multiplier,  setMultiplier]  = useState(4);
  const [isPlaying,   setIsPlaying]   = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [grid, setGrid] = useState<Record<DrumTrack, BeatCell[]>>(() => makeGrid(16, false));

  const totalSteps = opMode === 'multiply' ? base * multiplier : base;
  const seqRef = useRef<Tone.Sequence | null>(null);
  const subdivisionRef = useRef<Subdivision>(subdivision);
  subdivisionRef.current = subdivision;

  // ── Derived math ──────────────────────────────────────────────────────────
  const kickRemoved  = opMode === 'subtract' ? grid.kick.filter(c => !c.active).length : 0;
  const kickActive   = totalSteps - kickRemoved;
  const quotient     = opMode === 'divide' && multiplier > 0 ? Math.floor(base / multiplier) : 0;
  const remainder    = opMode === 'divide' && multiplier > 0 ? base % multiplier : 0;

  // ── Reset grid when mode or step count changes ─────────────────────────────
  useEffect(() => {
    const allActive = opMode === 'subtract';
    setGrid(prev => ({
      kick:  resizeTrack(totalSteps, prev.kick,  allActive),
      snare: resizeTrack(totalSteps, prev.snare, allActive),
      hihat: resizeTrack(totalSteps, prev.hihat, allActive),
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalSteps, opMode]);

  // ── Sync BPM ──────────────────────────────────────────────────────────────
  useEffect(() => { setBpm(bpm); }, [bpm, setBpm]);

  // ── Sequence ─────────────────────────────────────────────────────────────
  const gridRef = useRef(grid);
  gridRef.current = grid;

  const rebuildSequence = useCallback(() => {
    if (seqRef.current) { seqRef.current.dispose(); seqRef.current = null; }

    const steps = Array.from({ length: totalSteps }, (_, i) => i);
    seqRef.current = new Tone.Sequence(
      (time: number, step: number) => {
        const g = gridRef.current;
        DRUM_TRACKS.forEach(({ id }) => {
          if (g[id][step]?.active) triggerDrum(id, time);
        });
        Tone.getDraw().schedule(() => setCurrentStep(step), time);
      },
      steps,
      subdivisionRef.current,
    );
    if (isPlaying) seqRef.current.start(0);
  }, [totalSteps, triggerDrum, isPlaying]);

  useEffect(() => {
    if (isPlaying) rebuildSequence();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(grid), totalSteps, subdivision]);

  // ── Play / Stop ───────────────────────────────────────────────────────────
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

  useEffect(() => {
    return () => {
      seqRef.current?.dispose();
      // eslint-disable-next-line react-hooks/exhaustive-deps
      if (isPlaying) stopTransport();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Toggle cell ───────────────────────────────────────────────────────────
  const toggleCell = (track: DrumTrack, step: number) => {
    setGrid(prev => ({
      ...prev,
      [track]: prev[track].map((cell, i) =>
        i === step ? { ...cell, active: !cell.active } : cell
      ),
    }));
  };

  // ── Mode switch (resets grid) ──────────────────────────────────────────────
  const switchOpMode = (m: OperationMode) => {
    setOpMode(m);
    const steps = m === 'multiply' ? base * multiplier : base;
    setGrid(makeGrid(steps, m === 'subtract'));
  };

  const isDaw = mode === 'C';
  const trackColors: Record<DrumTrack, string> = {
    kick: '#f87171', snare: '#60a5fa', hihat: '#4ade80',
  };

  // ── Cell background color ─────────────────────────────────────────────────
  const cellBg = (step: number, active: boolean, isCurrent: boolean, track: DrumTrack): string => {
    if (isCurrent) return isDaw ? '#00ff9d' : trackColors[track];
    if (!active)   return opMode === 'subtract'
      ? (isDaw ? '#3f0000' : '#fee2e2')
      : (isDaw ? '#242424' : '#f1f5f9');
    if (opMode === 'divide' && quotient > 0) {
      const groupIdx = Math.min(Math.floor(step / quotient), multiplier - 1);
      const isRemainder = step >= quotient * multiplier;
      if (isRemainder) return isDaw ? '#fbbf24aa' : '#fbbf2480';
      return GROUP_COLORS[groupIdx % GROUP_COLORS.length] + (isDaw ? 'aa' : '80');
    }
    return isDaw ? '#7c3aed' : trackColors[track];
  };

  // Group boundary marker position
  const groupSize = opMode === 'multiply' ? base
    : opMode === 'divide' && quotient > 0 ? quotient
    : 0;

  return (
    <div className={`rounded-xl overflow-hidden border ${
      isDaw ? 'bg-daw-surface border-daw-border' : 'bg-lab-card border-lab-border shadow-sm'
    }`}>

      {/* ── Operation mode tabs ─────────────────────────────────────────────── */}
      <div className={`px-4 pt-3 flex items-center gap-2 flex-wrap ${isDaw ? '' : ''}`}>
        {OP_MODES.map(({ value, es, en }) => (
          <button
            key={value}
            onClick={() => switchOpMode(value)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${
              opMode === value
                ? isDaw
                  ? 'bg-daw-accent text-daw-bg border-daw-accent'
                  : 'bg-lab-accent text-white border-lab-accent'
                : isDaw
                ? 'bg-transparent text-daw-muted border-daw-border hover:text-daw-text'
                : 'bg-white text-lab-muted border-lab-border hover:text-lab-text'
            }`}
          >
            {isDaw ? en : es}
          </button>
        ))}
      </div>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className={`px-4 py-3 border-b flex items-center justify-between gap-4 flex-wrap ${
        isDaw ? 'border-daw-border' : 'border-lab-border'
      }`}>
        <div>
          <h2 className={`font-semibold text-sm tracking-wide ${isDaw ? 'text-daw-text font-mono' : 'text-lab-text'}`}>
            {isDaw
              ? `BEAT ${opMode.toUpperCase()} — SEQUENCER`
              : `🥁 ${OP_MODES.find(o => o.value === opMode)?.es}`}
          </h2>
          <p className={`text-xs mt-0.5 ${isDaw ? 'text-daw-muted font-mono' : 'text-lab-muted'}`}>
            {opMode === 'multiply' && (isDaw
              ? `BASE × MULT = STEPS  |  ${base} × ${multiplier} = ${totalSteps} @ ${bpm} BPM`
              : `${base} grupos × ${multiplier} tiempos = ${totalSteps} tiempos en total`)}
            {opMode === 'subtract' && (isDaw
              ? `TOTAL − REMOVED = REMAINING  |  ${totalSteps} − ? = ? @ ${bpm} BPM`
              : `Quita tiempos y ve cuántos quedan activos`)}
            {opMode === 'divide' && (isDaw
              ? `DIVIDEND ÷ DIVISOR = QUOTIENT R REM  |  ${base} ÷ ${multiplier} = ${quotient} R ${remainder}`
              : `${base} tiempos divididos en ${multiplier} grupos`)}
          </p>
        </div>

        {/* Math badge */}
        <div className={`px-3 py-1.5 rounded-lg font-mono text-sm font-bold flex items-center gap-2 ${
          isDaw
            ? 'bg-daw-s2 text-daw-accent border border-daw-border'
            : 'bg-lab-accent/10 text-lab-accent border border-lab-border'
        }`}>
          {opMode === 'multiply' && <>
            <span>{base}</span>
            <span className={isDaw ? 'text-daw-muted' : 'text-lab-muted'}>×</span>
            <span>{multiplier}</span>
            <span className={isDaw ? 'text-daw-muted' : 'text-lab-muted'}>=</span>
            <span className={isDaw ? 'text-daw-accent' : 'text-lab-accent text-base'}>{totalSteps}</span>
          </>}
          {opMode === 'subtract' && <>
            <span>{totalSteps}</span>
            <span className={isDaw ? 'text-daw-muted' : 'text-lab-muted'}>−</span>
            <span className="text-red-400">{kickRemoved}</span>
            <span className={isDaw ? 'text-daw-muted' : 'text-lab-muted'}>=</span>
            <span className={isDaw ? 'text-daw-accent' : 'text-lab-accent text-base'}>{kickActive}</span>
          </>}
          {opMode === 'divide' && <>
            <span>{base}</span>
            <span className={isDaw ? 'text-daw-muted' : 'text-lab-muted'}>÷</span>
            <span>{multiplier}</span>
            <span className={isDaw ? 'text-daw-muted' : 'text-lab-muted'}>=</span>
            <span className={isDaw ? 'text-daw-accent' : 'text-lab-accent text-base'}>{quotient}</span>
            {remainder > 0 && (
              <span className="text-xs text-amber-400">R{remainder}</span>
            )}
          </>}
        </div>
      </div>

      {/* ── Controls row ────────────────────────────────────────────────────── */}
      <div className={`px-4 py-3 flex items-center gap-4 flex-wrap border-b ${
        isDaw ? 'border-daw-border bg-daw-s2' : 'border-lab-border bg-slate-50/60'
      }`}>

        {/* Base / Total / Dividend */}
        <ParamControl
          label={isDaw
            ? (opMode === 'subtract' ? 'TOTAL' : opMode === 'divide' ? 'DIVIDEND' : 'BASE')
            : (opMode === 'subtract' ? 'Tiempos totales' : opMode === 'divide' ? 'Total (÷)' : 'Grupos (Base)') }
          value={base}
          min={MIN_BASE} max={MAX_BASE}
          onDecrement={() => setBase(b => clamp(b - 1, MIN_BASE, MAX_BASE))}
          onIncrement={() => setBase(b => clamp(b + 1, MIN_BASE, MAX_BASE))}
          isDaw={isDaw}
          color={isDaw ? undefined : '#f472b6'}
        />

        {/* Multiplier / Divisor (hidden in subtract) */}
        {opMode !== 'subtract' && (
          <ParamControl
            label={isDaw
              ? (opMode === 'divide' ? 'DIVISOR' : 'MULT')
              : (opMode === 'divide' ? 'Grupos (÷)' : 'Tiempos (Mult)')}
            value={multiplier}
            min={MIN_MULT} max={MAX_MULT}
            onDecrement={() => setMultiplier(m => clamp(m - 1, MIN_MULT, MAX_MULT))}
            onIncrement={() => setMultiplier(m => clamp(m + 1, MIN_MULT, MAX_MULT))}
            isDaw={isDaw}
            color={isDaw ? undefined : '#a78bfa'}
          />
        )}

        {/* BPM */}
        <ParamControl
          label={isDaw ? 'BPM' : 'Velocidad (BPM)'}
          value={bpm}
          min={MIN_BPM} max={MAX_BPM} step={5}
          onDecrement={() => setBpmState(b => clamp(b - 5, MIN_BPM, MAX_BPM))}
          onIncrement={() => setBpmState(b => clamp(b + 5, MIN_BPM, MAX_BPM))}
          isDaw={isDaw}
          color={isDaw ? undefined : '#60a5fa'}
        />

        {/* Subdivision selector */}
        <div className="flex flex-col gap-0.5">
          <span className={`text-xs font-semibold ${isDaw ? 'text-daw-muted font-mono' : 'text-lab-muted'}`}>
            {isDaw ? 'SUBDIV' : 'Subdivisión'}
          </span>
          <div className="flex gap-1">
            {SUBDIVISIONS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setSubdivision(value)}
                className={`px-2 py-0.5 rounded text-xs font-mono transition-colors ${
                  subdivision === value
                    ? isDaw ? 'bg-daw-accent text-daw-bg' : 'bg-lab-accent text-white'
                    : isDaw
                    ? 'bg-daw-bg text-daw-muted border border-daw-border hover:text-daw-text'
                    : 'bg-white text-lab-muted border border-lab-border hover:text-lab-text'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

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
              <div
                className={`w-14 text-right text-xs font-semibold shrink-0 ${isDaw ? 'text-daw-muted font-mono' : 'text-lab-muted'}`}
                style={!isDaw ? { color: trackColors[id] } : undefined}
              >
                {isDaw ? labelShort : label}
              </div>
              <div className="flex gap-1">
                {grid[id].map((cell, step) => {
                  const isCurrent = step === currentStep && isPlaying;
                  const isGroupBoundary = groupSize > 0 && step % groupSize === 0 && step > 0;

                  return (
                    <div key={step} className="relative">
                      {!isDaw && isGroupBoundary && (
                        <div className="absolute -left-0.5 top-0 bottom-0 w-px bg-lab-border opacity-60" />
                      )}
                      <motion.button
                        whileTap={{ scale: 0.88 }}
                        onClick={() => toggleCell(id, step)}
                        animate={{
                          backgroundColor: cellBg(step, cell.active, isCurrent, id),
                          scale: isCurrent ? 1.12 : 1,
                        }}
                        transition={{ duration: 0.06 }}
                        className={`w-7 h-7 rounded-sm border relative overflow-hidden ${
                          isDaw ? 'border-daw-border' : cell.active ? 'border-transparent' : 'border-lab-border'
                        }`}
                        title={`${label} — Step ${step + 1}`}
                        aria-pressed={cell.active}
                        aria-label={`${label} paso ${step + 1}`}
                      >
                        {opMode === 'subtract' && !cell.active && (
                          <span className={`absolute inset-0 flex items-center justify-center text-xs font-bold leading-none ${
                            isDaw ? 'text-red-400' : 'text-red-500'
                          }`}>×</span>
                        )}
                      </motion.button>
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

      {/* ── Math summary (Mode G only) ────────────────────────────────────────── */}
      {!isDaw && (
        <div className="px-4 py-3 border-t border-lab-border bg-indigo-50/50">
          {opMode === 'multiply' && (
            <p className="text-sm text-lab-text">
              <strong>{base} grupos</strong> de <strong>{multiplier} tiempos</strong> cada uno
              = <strong className="text-lab-accent text-base">{totalSteps} tiempos</strong> por vuelta.
              Es igual que la multiplicación:{' '}
              <strong>{base} × {multiplier} = {totalSteps}</strong>.
            </p>
          )}
          {opMode === 'subtract' && (
            <p className="text-sm text-lab-text">
              El Bombo empezó con <strong>{totalSteps} tiempos</strong>.{' '}
              Quitaste{' '}
              <strong className="text-red-500">{kickRemoved}</strong>{' '}
              tiempo{kickRemoved !== 1 ? 's' : ''}.{' '}
              Quedan <strong className="text-lab-accent text-base">{kickActive}</strong> activos.{' '}
              <strong>{totalSteps} − {kickRemoved} = {kickActive}</strong>.
            </p>
          )}
          {opMode === 'divide' && (
            <p className="text-sm text-lab-text">
              <strong>{base} tiempos</strong> divididos en{' '}
              <strong>{multiplier} grupos</strong>:{' '}
              caben{' '}
              <strong className="text-lab-accent text-base">{quotient}</strong>{' '}
              tiempos por grupo
              {remainder > 0 && (
                <> y sobran <strong className="text-amber-500">{remainder}</strong></>
              )}.{' '}
              <strong>
                {base} ÷ {multiplier} = {quotient}
                {remainder > 0 ? ` R ${remainder}` : ''}
              </strong>.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Param control widget ─────────────────────────────────────────────────────

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
          className={`w-8 text-center font-bold text-sm ${isDaw ? 'text-daw-accent font-mono' : 'text-lab-text'}`}
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
