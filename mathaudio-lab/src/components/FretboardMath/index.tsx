import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAudioEngine } from '../../context/AudioEngineContext';
import { useUserMode } from '../../context/UserModeContext';
import type { FretSelection, StringTuning } from '../../types';

// ─── Constants ───────────────────────────────────────────────────────────────

const SVG_W = 960;
const SVG_H = 190;
const NUT_X = 52;
const SCALE_L = 830;    // physical scale length in SVG units
const BRIDGE_X = NUT_X + SCALE_L;
const NUM_FRETS = 24;

const STRINGS: StringTuning[] = [
  { name: 'G', openNote: 'G2', baseMidi: 43, baseFreq: 98.0,  thickness: 1.5, colorClass: '#fbbf24' },
  { name: 'D', openNote: 'D2', baseMidi: 38, baseFreq: 73.42, thickness: 2.0, colorClass: '#4ade80' },
  { name: 'A', openNote: 'A1', baseMidi: 33, baseFreq: 55.0,  thickness: 2.5, colorClass: '#60a5fa' },
  { name: 'E', openNote: 'E1', baseMidi: 28, baseFreq: 41.2,  thickness: 3.0, colorClass: '#f87171' },
];

const STRING_Y = [50, 83, 116, 149];

const CHROMATIC = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

// Position marker frets (inlays)
const SINGLE_DOTS = [3, 5, 7, 9, 15, 17, 19, 21];
const DOUBLE_DOTS = [12, 24];

// ─── Math helpers ─────────────────────────────────────────────────────────────

/** d = L · (1 − 2^(−n/12))  — equal temperament fret placement */
function fretX(n: number): number {
  return NUT_X + SCALE_L * (1 - Math.pow(2, -n / 12));
}

function midiToNote(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  return `${CHROMATIC[midi % 12]}${octave}`;
}

function getFretFrequency(stringIdx: number, fret: number): number {
  return STRINGS[stringIdx].baseFreq * Math.pow(2, fret / 12);
}

function getFretNote(stringIdx: number, fret: number): string {
  return midiToNote(STRINGS[stringIdx].baseMidi + fret);
}

/** Vibrating-length ratio: 2^(-n/12). Used for fraction display. */
function getVibRatio(fret: number): number {
  return Math.pow(2, -fret / 12);
}

/** Human-readable fraction label for pedagogically relevant frets (Mode G) */
function fractionLabel(fret: number): string {
  const map: Record<number, string> = {
    0: '1 (cuerda completa)',
    5: '≈ 3/4',
    7: '≈ 2/3',
    12: '1/2',
    19: '≈ 1/3',
    24: '1/4',
  };
  return map[fret] ?? `≈ ${getVibRatio(fret).toFixed(3)}`;
}

/** Power-of-2 annotation for octave frets (Mode C) */
function powerLabel(fret: number): string | null {
  if (fret === 0)  return '2⁰ = 1×';
  if (fret === 12) return '2¹ = 2×';
  if (fret === 24) return '2² = 4×';
  return null;
}

/** SVG path for a half-sine arch on the vibrating string segment */
function sineArch(
  x1: number, x2: number,
  y: number, amp: number,
  direction: 1 | -1 = 1
): string {
  const steps = 80;
  const pts: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = x1 + t * (x2 - x1);
    const dy = amp * Math.sin(t * Math.PI) * direction;
    pts.push(`${x.toFixed(1)},${(y - dy).toFixed(1)}`);
  }
  return `M ${pts.join(' L ')}`;
}

/** Return SVG x midpoint between two consecutive fret positions for dot placement */
function dotX(fret: number): number {
  const prev = fret === 1 ? NUT_X : fretX(fret - 1);
  return (prev + fretX(fret)) / 2;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FretboardSVG({
  selection,
  onSelect,
  mode,
}: {
  selection: FretSelection | null;
  onSelect: (s: FretSelection) => void;
  mode: 'C' | 'G';
}) {
  const isDaw = mode === 'C';

  // Precompute all fret X positions (0 = nut, 1..24 = frets)
  const fretPositions = Array.from({ length: NUM_FRETS + 1 }, (_, n) => fretX(n));

  return (
    <svg
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      className="w-full h-auto select-none"
      aria-label="Mástil de bajo — 24 trastes, 4 cuerdas"
    >
      {/* Fretboard body */}
      <rect
        x={NUT_X} y={30}
        width={SCALE_L} height={140}
        fill={isDaw ? '#1c1408' : '#f5e6c8'}
        rx={4}
      />

      {/* Side binding */}
      <rect x={NUT_X} y={30} width={SCALE_L} height={140}
        fill="none"
        stroke={isDaw ? '#3d2e12' : '#c8a96e'}
        strokeWidth={1.5}
        rx={4}
      />

      {/* Position dot inlays */}
      {SINGLE_DOTS.map(f => (
        <circle
          key={`dot-${f}`}
          cx={dotX(f)} cy={SVG_H / 2}
          r={5}
          fill={isDaw ? '#2a2a2a' : '#d4b896'}
          opacity={0.8}
        />
      ))}
      {DOUBLE_DOTS.map(f => (
        <g key={`ddot-${f}`}>
          <circle cx={dotX(f)} cy={70}  r={5} fill={isDaw ? '#2a2a2a' : '#d4b896'} opacity={0.8} />
          <circle cx={dotX(f)} cy={130} r={5} fill={isDaw ? '#2a2a2a' : '#d4b896'} opacity={0.8} />
        </g>
      ))}

      {/* Fret wires (vertical lines) */}
      {fretPositions.slice(1).map((x, idx) => {
        const fretNum = idx + 1;
        const isOctave = fretNum === 12 || fretNum === 24;
        return (
          <rect
            key={`fret-${fretNum}`}
            x={x - 1.5} y={32}
            width={isOctave ? 3.5 : 2.5}
            height={136}
            fill={isOctave
              ? (isDaw ? '#a0896e' : '#b0886e')
              : (isDaw ? '#7a6a52' : '#c8a96e')
            }
            rx={1}
          />
        );
      })}

      {/* Nut */}
      <rect
        x={NUT_X - 4} y={30}
        width={5} height={140}
        fill={isDaw ? '#d0c8b0' : '#f0e8d0'}
        rx={1}
      />

      {/* ── Mode G: Vibrating string fraction highlight ── */}
      {mode === 'G' && selection && (
        <>
          {/* Stopped portion — grey overlay */}
          <rect
            x={NUT_X} y={30}
            width={fretX(selection.fret) - NUT_X} height={140}
            fill="rgba(0,0,0,0.18)"
            rx={2}
          />
          {/* Vibrating portion — color from fraction */}
          <rect
            x={fretX(selection.fret)} y={30}
            width={BRIDGE_X - fretX(selection.fret)} height={140}
            fill={`${STRINGS[selection.stringIdx].colorClass}40`}
            rx={2}
          />
        </>
      )}

      {/* ── Mode C: Standing wave visualization on selected string ── */}
      {mode === 'C' && selection && (() => {
        const selFretX = fretX(selection.fret);
        const y = STRING_Y[selection.stringIdx];
        const amp = 10;
        return (
          <>
            <path
              d={sineArch(selFretX, BRIDGE_X, y, amp, 1)}
              fill="none"
              stroke={isDaw ? '#00ff9d' : '#6366f1'}
              strokeWidth={2}
              opacity={0.9}
            />
            <path
              d={sineArch(selFretX, BRIDGE_X, y, amp, -1)}
              fill="none"
              stroke={isDaw ? '#00cc7d' : '#818cf8'}
              strokeWidth={1}
              strokeDasharray="4 3"
              opacity={0.5}
            />
          </>
        );
      })()}

      {/* Strings */}
      {STRINGS.map((s, si) => {
        const y = STRING_Y[si];
        const isSelected = selection?.stringIdx === si;
        return (
          <g key={`string-${si}`}>
            <line
              x1={NUT_X - 4} y1={y}
              x2={BRIDGE_X}   y2={y}
              stroke={isDaw
                ? (isSelected ? '#e0e0e0' : '#8a8070')
                : (isSelected ? s.colorClass : '#b8a070')
              }
              strokeWidth={s.thickness + (isSelected ? 0.5 : 0)}
            />
            {/* Open-string label */}
            <text
              x={NUT_X - 16} y={y + 4}
              fontSize={9}
              fill={isDaw ? '#666' : '#8a7050'}
              textAnchor="middle"
              fontFamily="JetBrains Mono, monospace"
            >
              {s.name}
            </text>
          </g>
        );
      })}

      {/* Fret number labels */}
      {[1, 3, 5, 7, 9, 12, 15, 17, 19, 21, 24].map(f => (
        <text
          key={`label-${f}`}
          x={dotX(f)} y={SVG_H - 4}
          fontSize={8}
          fill={isDaw ? '#444' : '#a08060'}
          textAnchor="middle"
          fontFamily="JetBrains Mono, monospace"
        >
          {f}
        </text>
      ))}

      {/* ── Clickable hit zones (fret × string) ── */}
      {STRINGS.map((_, si) =>
        Array.from({ length: NUM_FRETS + 1 }, (_, fret) => {
          const x1 = fret === 0 ? NUT_X - 4 : fretX(fret - 1);
          const x2 = fret === 0 ? fretX(0)   : fretX(fret);
          const y = STRING_Y[si];
          const isActive =
            selection?.fret === fret && selection?.stringIdx === si;
          const isPowerFret = mode === 'C' && (fret === 0 || fret === 12 || fret === 24);

          return (
            <g key={`hit-${si}-${fret}`}>
              <rect
                x={x1} y={y - 18}
                width={x2 - x1} height={36}
                fill="transparent"
                className="cursor-pointer"
                onClick={() =>
                  onSelect({
                    fret,
                    stringIdx: si,
                    frequency: getFretFrequency(si, fret),
                    noteName: getFretNote(si, fret),
                    vibRatio: getVibRatio(fret),
                    fractionLabel: fractionLabel(fret),
                    powerLabel: powerLabel(fret),
                  })
                }
              />
              {/* Visual highlight for selected cell */}
              {isActive && (
                <motion.circle
                  cx={(x1 + x2) / 2} cy={y}
                  r={8}
                  fill={isDaw ? '#00ff9d' : STRINGS[si].colorClass}
                  opacity={0.9}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 0.9 }}
                  transition={{ duration: 0.1, ease: 'easeOut' }}
                />
              )}
              {/* Power fret markers (Mode C) */}
              {isPowerFret && !isActive && (
                <circle
                  cx={(x1 + x2) / 2} cy={y}
                  r={5}
                  fill="none"
                  stroke={isDaw ? '#7c3aed' : '#a78bfa'}
                  strokeWidth={1.5}
                  opacity={0.6}
                />
              )}
            </g>
          );
        })
      )}
    </svg>
  );
}

// ─── Info Panel ───────────────────────────────────────────────────────────────

function InfoPanelC({ sel }: { sel: FretSelection }) {
  const freq = sel.frequency.toFixed(2);
  const baseFreq = STRINGS[sel.stringIdx].baseFreq.toFixed(2);
  const ratio = (sel.frequency / STRINGS[sel.stringIdx].baseFreq).toFixed(4);

  return (
    <motion.div
      key={`${sel.fret}-${sel.stringIdx}`}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.12 }}
      className="font-mono text-sm space-y-1"
    >
      <div className="flex items-center gap-4 flex-wrap">
        <span className="text-daw-accent text-lg font-semibold">{sel.noteName}</span>
        <span className="text-daw-text">{freq} Hz</span>
        <span className="text-daw-muted">
          f₀ × 2^({sel.fret}/12) = {baseFreq} × 2^({sel.fret}/12)
        </span>
      </div>
      {sel.powerLabel ? (
        <div className="flex items-center gap-3">
          <span className="px-2 py-0.5 rounded text-xs bg-daw-accent-alt text-white font-semibold">
            Octava
          </span>
          <span className="text-daw-accent font-bold text-base">{sel.powerLabel}</span>
          <span className="text-daw-muted text-xs">
            razón {ratio} — {sel.fret === 12 ? 'Doble frecuencia' : sel.fret === 24 ? 'Cuádruple frecuencia' : 'Frecuencia base'}
          </span>
        </div>
      ) : (
        <div className="text-daw-muted text-xs">
          ratio = {sel.vibRatio.toFixed(4)} · Traste {sel.fret} · Cuerda {STRINGS[sel.stringIdx].name}
        </div>
      )}
      <div className="text-daw-muted text-xs opacity-70">
        Longitud vibrante: {(sel.vibRatio * 100).toFixed(1)}% de la escala
      </div>
    </motion.div>
  );
}

function InfoPanelG({ sel }: { sel: FretSelection }) {
  const color = STRINGS[sel.stringIdx].colorClass;
  return (
    <motion.div
      key={`${sel.fret}-${sel.stringIdx}`}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.15 }}
      className="space-y-2"
    >
      <div className="flex items-center gap-3 flex-wrap">
        <span
          className="text-2xl font-bold px-3 py-1 rounded-xl"
          style={{ backgroundColor: `${color}25`, color }}
        >
          {sel.noteName}
        </span>
        <span className="text-lab-text font-semibold text-lg">
          Fracción de cuerda:
          <span className="ml-2 font-bold" style={{ color }}>
            {sel.fractionLabel}
          </span>
        </span>
      </div>
      <p className="text-lab-muted text-sm">
        Al presionar el traste {sel.fret}, la parte que vibra es{' '}
        <strong>{sel.fractionLabel}</strong> de la cuerda.
        {sel.fret === 12 && ' ¡Exactamente la mitad! La nota sube una octava.'}
        {sel.fret === 24 && ' ¡Un cuarto! La nota sube dos octavas.'}
      </p>
      <div
        className="flex h-5 rounded-full overflow-hidden border"
        style={{ borderColor: `${color}60` }}
        title={`Proporción vibrante: ${(sel.vibRatio * 100).toFixed(1)}%`}
      >
        <div
          className="h-full opacity-30 transition-all duration-300"
          style={{
            width: `${(1 - sel.vibRatio) * 100}%`,
            backgroundColor: '#94a3b8',
          }}
        />
        <div
          className="h-full transition-all duration-300"
          style={{ width: `${sel.vibRatio * 100}%`, backgroundColor: color }}
        />
      </div>
      <div className="flex justify-between text-xs font-mono" style={{ color }}>
        <span>Cejilla</span>
        <span>← vibra {(sel.vibRatio * 100).toFixed(1)}% →</span>
        <span>Puente</span>
      </div>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FretboardMath() {
  const { mode } = useUserMode();
  const { startEngine, triggerBassNote, isStarted } = useAudioEngine();
  const [selection, setSelection] = useState<FretSelection | null>(null);

  const handleSelect = useCallback(
    async (sel: FretSelection) => {
      if (!isStarted) await startEngine();
      setSelection(sel);
      triggerBassNote(sel.noteName, mode === 'C' ? '2n' : '4n');
    },
    [isStarted, startEngine, triggerBassNote, mode]
  );

  const isDaw = mode === 'C';

  return (
    <div
      className={`rounded-xl overflow-hidden border ${
        isDaw
          ? 'bg-daw-surface border-daw-border'
          : 'bg-lab-card border-lab-border shadow-sm'
      }`}
    >
      {/* Header */}
      <div
        className={`px-4 py-3 flex items-center justify-between border-b ${
          isDaw ? 'border-daw-border' : 'border-lab-border'
        }`}
      >
        <div>
          <h2
            className={`font-semibold text-sm tracking-wide ${
              isDaw ? 'text-daw-text font-mono' : 'text-lab-text'
            }`}
          >
            {isDaw ? 'FRETBOARD — BASS / GUITAR' : '🎸 Mástil Interactivo'}
          </h2>
          <p
            className={`text-xs mt-0.5 ${
              isDaw ? 'text-daw-muted font-mono' : 'text-lab-muted'
            }`}
          >
            {isDaw
              ? 'd = L · (1 − 2^(−n/12))  |  24 frets  |  E1–G2 tuning'
              : 'Toca un traste para escuchar y ver la fracción de cuerda'}
          </p>
        </div>
        {isDaw && (
          <div className="flex gap-3 text-xs font-mono">
            {[0, 12, 24].map(f => (
              <span key={f} className="text-daw-accent-alt opacity-80">
                f{f === 0 ? '₀' : f === 12 ? '×2' : '×4'}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* SVG Fretboard */}
      <div className={`px-2 py-3 ${isDaw ? 'bg-daw-surface' : 'bg-amber-50/60'}`}>
        <FretboardSVG selection={selection} onSelect={handleSelect} mode={mode} />
      </div>

      {/* Info Panel */}
      <div
        className={`px-4 py-3 min-h-[72px] border-t ${
          isDaw ? 'border-daw-border' : 'border-lab-border'
        }`}
      >
        <AnimatePresence mode="wait">
          {selection ? (
            isDaw ? (
              <InfoPanelC key="c" sel={selection} />
            ) : (
              <InfoPanelG key="g" sel={selection} />
            )
          ) : (
            <motion.p
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`text-sm ${isDaw ? 'text-daw-muted font-mono' : 'text-lab-muted'}`}
            >
              {isDaw
                ? '— Selecciona un traste para analizar la relación armónica —'
                : 'Toca cualquier traste o cuerda para comenzar'}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
