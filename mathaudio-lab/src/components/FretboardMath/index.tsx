import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAudioEngine } from '../../context/AudioEngineContext';
import { useUserMode } from '../../context/UserModeContext';
import type { FretSelection, StringTuning } from '../../types';

// ─── Constants ───────────────────────────────────────────────────────────────

const SVG_W = 960;
const SVG_H = 190;
const NUT_X = 52;
const SCALE_L = 830;
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
const SINGLE_DOTS = [3, 5, 7, 9, 15, 17, 19, 21];
const DOUBLE_DOTS = [12, 24];

// ─── Interval table ──────────────────────────────────────────────────────────

const INTERVAL_NAMES = [
  { name: 'Unísono',       nameEn: 'Unison',      ratio: '1:1',   type: 'consonante' },
  { name: '2ª menor',      nameEn: 'Minor 2nd',   ratio: '16:15', type: 'disonante'  },
  { name: '2ª mayor',      nameEn: 'Major 2nd',   ratio: '9:8',   type: 'disonante'  },
  { name: '3ª menor',      nameEn: 'Minor 3rd',   ratio: '6:5',   type: 'consonante' },
  { name: '3ª mayor',      nameEn: 'Major 3rd',   ratio: '5:4',   type: 'consonante' },
  { name: '4ª justa',      nameEn: 'Perfect 4th', ratio: '4:3',   type: 'consonante' },
  { name: 'Tritono',       nameEn: 'Tritone',     ratio: '√2:1',  type: 'disonante'  },
  { name: '5ª justa',      nameEn: 'Perfect 5th', ratio: '3:2',   type: 'consonante' },
  { name: '6ª menor',      nameEn: 'Minor 6th',   ratio: '8:5',   type: 'consonante' },
  { name: '6ª mayor',      nameEn: 'Major 6th',   ratio: '5:3',   type: 'consonante' },
  { name: '7ª menor',      nameEn: 'Minor 7th',   ratio: '16:9',  type: 'disonante'  },
  { name: '7ª mayor',      nameEn: 'Major 7th',   ratio: '15:8',  type: 'disonante'  },
  { name: 'Octava',        nameEn: 'Octave',      ratio: '2:1',   type: 'consonante' },
];

// ─── Math helpers ─────────────────────────────────────────────────────────────

function fretX(n: number): number {
  return NUT_X + SCALE_L * (1 - Math.pow(2, -n / 12));
}

function midiToNote(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  return `${CHROMATIC[midi % 12]}${octave}`;
}

function getFretFrequency(si: number, fret: number): number {
  return STRINGS[si].baseFreq * Math.pow(2, fret / 12);
}

function getFretNote(si: number, fret: number): string {
  return midiToNote(STRINGS[si].baseMidi + fret);
}

function getVibRatio(fret: number): number {
  return Math.pow(2, -fret / 12);
}

function fractionLabel(fret: number): string {
  const map: Record<number, string> = {
    0: '1 (cuerda completa)', 5: '≈ 3/4', 7: '≈ 2/3',
    12: '1/2', 19: '≈ 1/3', 24: '1/4',
  };
  return map[fret] ?? `≈ ${getVibRatio(fret).toFixed(3)}`;
}

function powerLabel(fret: number): string | null {
  if (fret === 0)  return '2⁰ = 1×';
  if (fret === 12) return '2¹ = 2×';
  if (fret === 24) return '2² = 4×';
  return null;
}

function sineArch(x1: number, x2: number, y: number, amp: number, direction: 1 | -1 = 1): string {
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

function dotX(fret: number): number {
  const prev = fret === 1 ? NUT_X : fretX(fret - 1);
  return (prev + fretX(fret)) / 2;
}

function getIntervalSemitones(sel1: FretSelection, sel2: FretSelection): number {
  const midi1 = STRINGS[sel1.stringIdx].baseMidi + sel1.fret;
  const midi2 = STRINGS[sel2.stringIdx].baseMidi + sel2.fret;
  return Math.abs(midi2 - midi1);
}

// ─── FretboardSVG ─────────────────────────────────────────────────────────────

function FretboardSVG({
  selection, selection2, onSelect, mode,
}: {
  selection: FretSelection | null;
  selection2?: FretSelection | null;
  onSelect: (s: FretSelection) => void;
  mode: 'C' | 'G';
}) {
  const isDaw = mode === 'C';
  const fretPositions = Array.from({ length: NUM_FRETS + 1 }, (_, n) => fretX(n));

  return (
    <svg
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      className="w-full h-auto select-none"
      aria-label="Mástil de bajo — 24 trastes, 4 cuerdas"
    >
      <rect x={NUT_X} y={30} width={SCALE_L} height={140}
        fill={isDaw ? '#1c1408' : '#f5e6c8'} rx={4} />
      <rect x={NUT_X} y={30} width={SCALE_L} height={140}
        fill="none" stroke={isDaw ? '#3d2e12' : '#c8a96e'} strokeWidth={1.5} rx={4} />

      {SINGLE_DOTS.map(f => (
        <circle key={`dot-${f}`} cx={dotX(f)} cy={SVG_H / 2} r={5}
          fill={isDaw ? '#2a2a2a' : '#d4b896'} opacity={0.8} />
      ))}
      {DOUBLE_DOTS.map(f => (
        <g key={`ddot-${f}`}>
          <circle cx={dotX(f)} cy={70}  r={5} fill={isDaw ? '#2a2a2a' : '#d4b896'} opacity={0.8} />
          <circle cx={dotX(f)} cy={130} r={5} fill={isDaw ? '#2a2a2a' : '#d4b896'} opacity={0.8} />
        </g>
      ))}

      {fretPositions.slice(1).map((x, idx) => {
        const fretNum = idx + 1;
        const isOctave = fretNum === 12 || fretNum === 24;
        return (
          <rect key={`fret-${fretNum}`} x={x - 1.5} y={32}
            width={isOctave ? 3.5 : 2.5} height={136}
            fill={isOctave ? (isDaw ? '#a0896e' : '#b0886e') : (isDaw ? '#7a6a52' : '#c8a96e')}
            rx={1} />
        );
      })}

      <rect x={NUT_X - 4} y={30} width={5} height={140}
        fill={isDaw ? '#d0c8b0' : '#f0e8d0'} rx={1} />

      {mode === 'G' && selection && (
        <>
          <rect x={NUT_X} y={30} width={fretX(selection.fret) - NUT_X} height={140}
            fill="rgba(0,0,0,0.18)" rx={2} />
          <rect x={fretX(selection.fret)} y={30}
            width={BRIDGE_X - fretX(selection.fret)} height={140}
            fill={`${STRINGS[selection.stringIdx].colorClass}40`} rx={2} />
        </>
      )}

      {mode === 'C' && selection && (() => {
        const selFretX = fretX(selection.fret);
        const y = STRING_Y[selection.stringIdx];
        return (
          <>
            <path d={sineArch(selFretX, BRIDGE_X, y, 10, 1)}
              fill="none" stroke={isDaw ? '#00ff9d' : '#6366f1'} strokeWidth={2} opacity={0.9} />
            <path d={sineArch(selFretX, BRIDGE_X, y, 10, -1)}
              fill="none" stroke={isDaw ? '#00cc7d' : '#818cf8'} strokeWidth={1}
              strokeDasharray="4 3" opacity={0.5} />
          </>
        );
      })()}

      {STRINGS.map((s, si) => {
        const y = STRING_Y[si];
        const isSelected = selection?.stringIdx === si || selection2?.stringIdx === si;
        return (
          <g key={`string-${si}`}>
            <line x1={NUT_X - 4} y1={y} x2={BRIDGE_X} y2={y}
              stroke={isDaw
                ? (isSelected ? '#e0e0e0' : '#8a8070')
                : (isSelected ? s.colorClass : '#b8a070')
              }
              strokeWidth={s.thickness + (isSelected ? 0.5 : 0)} />
            <text x={NUT_X - 16} y={y + 4} fontSize={9}
              fill={isDaw ? '#666' : '#8a7050'} textAnchor="middle"
              fontFamily="JetBrains Mono, monospace">
              {s.name}
            </text>
          </g>
        );
      })}

      {[1, 3, 5, 7, 9, 12, 15, 17, 19, 21, 24].map(f => (
        <text key={`label-${f}`} x={dotX(f)} y={SVG_H - 4} fontSize={8}
          fill={isDaw ? '#444' : '#a08060'} textAnchor="middle"
          fontFamily="JetBrains Mono, monospace">
          {f}
        </text>
      ))}

      {STRINGS.map((_, si) =>
        Array.from({ length: NUM_FRETS + 1 }, (_, fret) => {
          const x1 = fret === 0 ? NUT_X - 4 : fretX(fret - 1);
          const x2 = fret === 0 ? fretX(0)   : fretX(fret);
          const y = STRING_Y[si];
          const isSel1 = selection?.fret === fret && selection?.stringIdx === si;
          const isSel2 = selection2?.fret === fret && selection2?.stringIdx === si;
          const isPowerFret = mode === 'C' && (fret === 0 || fret === 12 || fret === 24);

          return (
            <g key={`hit-${si}-${fret}`}>
              <rect x={x1} y={y - 18} width={x2 - x1} height={36}
                fill="transparent" className="cursor-pointer"
                onClick={() => onSelect({
                  fret, stringIdx: si,
                  frequency: getFretFrequency(si, fret),
                  noteName: getFretNote(si, fret),
                  vibRatio: getVibRatio(fret),
                  fractionLabel: fractionLabel(fret),
                  powerLabel: powerLabel(fret),
                })} />
              {isSel1 && (
                <motion.circle cx={(x1 + x2) / 2} cy={y} r={8}
                  fill={isDaw ? '#00ff9d' : STRINGS[si].colorClass}
                  opacity={0.9}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 0.9 }}
                  transition={{ duration: 0.1 }} />
              )}
              {isSel2 && (
                <motion.circle cx={(x1 + x2) / 2} cy={y} r={8}
                  fill={isDaw ? '#f472b6' : '#a78bfa'}
                  opacity={0.9}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 0.9 }}
                  transition={{ duration: 0.1 }} />
              )}
              {isPowerFret && !isSel1 && !isSel2 && (
                <circle cx={(x1 + x2) / 2} cy={y} r={5}
                  fill="none" stroke={isDaw ? '#7c3aed' : '#a78bfa'}
                  strokeWidth={1.5} opacity={0.6} />
              )}
            </g>
          );
        })
      )}
    </svg>
  );
}

// ─── Info panels ──────────────────────────────────────────────────────────────

function InfoPanelC({ sel }: { sel: FretSelection }) {
  const freq = sel.frequency.toFixed(2);
  const baseFreq = STRINGS[sel.stringIdx].baseFreq.toFixed(2);
  const ratio = (sel.frequency / STRINGS[sel.stringIdx].baseFreq).toFixed(4);
  return (
    <motion.div key={`${sel.fret}-${sel.stringIdx}`}
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.12 }} className="font-mono text-sm space-y-1">
      <div className="flex items-center gap-4 flex-wrap">
        <span className="text-daw-accent text-lg font-semibold">{sel.noteName}</span>
        <span className="text-daw-text">{freq} Hz</span>
        <span className="text-daw-muted">
          f₀ × 2^({sel.fret}/12) = {baseFreq} × 2^({sel.fret}/12)
        </span>
      </div>
      {sel.powerLabel ? (
        <div className="flex items-center gap-3">
          <span className="px-2 py-0.5 rounded text-xs bg-daw-accent-alt text-white font-semibold">Octava</span>
          <span className="text-daw-accent font-bold text-base">{sel.powerLabel}</span>
          <span className="text-daw-muted text-xs">
            razón {ratio} —{' '}
            {sel.fret === 12 ? 'Doble frecuencia' : sel.fret === 24 ? 'Cuádruple frecuencia' : 'Frecuencia base'}
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
    <motion.div key={`${sel.fret}-${sel.stringIdx}`}
      initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.15 }} className="space-y-2">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-2xl font-bold px-3 py-1 rounded-xl"
          style={{ backgroundColor: `${color}25`, color }}>
          {sel.noteName}
        </span>
        <span className="text-lab-text font-semibold text-lg">
          Fracción de cuerda:{' '}
          <span className="ml-1 font-bold" style={{ color }}>{sel.fractionLabel}</span>
        </span>
      </div>
      <p className="text-lab-muted text-sm">
        Al presionar el traste {sel.fret}, la parte que vibra es{' '}
        <strong>{sel.fractionLabel}</strong> de la cuerda.
        {sel.fret === 12 && ' ¡Exactamente la mitad! La nota sube una octava.'}
        {sel.fret === 24 && ' ¡Un cuarto! La nota sube dos octavas.'}
      </p>
      <div className="flex h-5 rounded-full overflow-hidden border"
        style={{ borderColor: `${color}60` }}>
        <div className="h-full opacity-30 transition-all duration-300"
          style={{ width: `${(1 - sel.vibRatio) * 100}%`, backgroundColor: '#94a3b8' }} />
        <div className="h-full transition-all duration-300"
          style={{ width: `${sel.vibRatio * 100}%`, backgroundColor: color }} />
      </div>
      <div className="flex justify-between text-xs font-mono" style={{ color }}>
        <span>Cejilla</span>
        <span>← vibra {(sel.vibRatio * 100).toFixed(1)}% →</span>
        <span>Puente</span>
      </div>
    </motion.div>
  );
}

function IntervalPanel({
  sel1, sel2, isDaw,
}: {
  sel1: FretSelection; sel2: FretSelection; isDaw: boolean;
}) {
  const semitones = getIntervalSemitones(sel1, sel2);
  const normalized = semitones % 12;
  const octaves = Math.floor(semitones / 12);
  const info = INTERVAL_NAMES[Math.min(normalized, 12)];
  const freqRatio = (Math.max(sel1.frequency, sel2.frequency) / Math.min(sel1.frequency, sel2.frequency)).toFixed(3);
  const color1 = isDaw ? '#00ff9d' : STRINGS[sel1.stringIdx].colorClass;
  const color2 = isDaw ? '#f472b6' : '#a78bfa';

  return (
    <motion.div key={`iv-${sel1.fret}-${sel1.stringIdx}-${sel2.fret}-${sel2.stringIdx}`}
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.14 }}
      className={`space-y-2 ${isDaw ? 'font-mono text-sm' : 'text-sm'}`}>
      <div className="flex items-center gap-3 flex-wrap">
        <span className="font-bold text-base px-2 py-0.5 rounded"
          style={{ backgroundColor: `${color1}20`, color: color1 }}>
          {sel1.noteName}
        </span>
        <span className={isDaw ? 'text-daw-muted' : 'text-lab-muted'}>+</span>
        <span className="font-bold text-base px-2 py-0.5 rounded"
          style={{ backgroundColor: `${color2}20`, color: color2 }}>
          {sel2.noteName}
        </span>
        <span className={`ml-2 font-bold text-base ${isDaw ? 'text-daw-accent' : 'text-lab-accent'}`}>
          {isDaw ? info.nameEn : info.name}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full ${
          info.type === 'consonante'
            ? (isDaw ? 'bg-green-900/40 text-green-400' : 'bg-green-100 text-green-700')
            : (isDaw ? 'bg-red-900/40 text-red-400'   : 'bg-red-100 text-red-700')
        }`}>
          {isDaw ? (info.type === 'consonante' ? 'CONSONANT' : 'DISSONANT') : info.type}
        </span>
      </div>
      <div className={`flex gap-6 text-xs ${isDaw ? 'text-daw-muted' : 'text-lab-muted'}`}>
        <span>
          <span className={isDaw ? 'text-daw-text' : 'text-lab-text'}>Semitonos: </span>
          <strong className={isDaw ? 'text-daw-accent' : 'text-lab-accent'}>{semitones}</strong>
          {octaves > 0 && <span className="ml-1 opacity-60">({octaves} oct + {normalized} st)</span>}
        </span>
        <span>
          <span className={isDaw ? 'text-daw-text' : 'text-lab-text'}>Razón just.: </span>
          <strong className={isDaw ? 'text-daw-accent' : 'text-lab-accent'}>{info.ratio}</strong>
        </span>
        <span>
          <span className={isDaw ? 'text-daw-text' : 'text-lab-text'}>Razón real: </span>
          <strong className={isDaw ? 'text-daw-accent' : 'text-lab-accent'}>{freqRatio}</strong>
        </span>
      </div>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FretboardMath() {
  const { mode } = useUserMode();
  const { startEngine, triggerBassNote, triggerPolyNote, isStarted } = useAudioEngine();

  const [selection,    setSelection]    = useState<FretSelection | null>(null);
  const [selection2,   setSelection2]   = useState<FretSelection | null>(null);
  const [intervalMode, setIntervalMode] = useState(false);

  const handleSelect = useCallback(
    async (sel: FretSelection) => {
      if (!isStarted) await startEngine();

      if (intervalMode) {
        if (!selection) {
          setSelection(sel);
          triggerBassNote(sel.noteName, '4n');
        } else if (!selection2) {
          setSelection2(sel);
          triggerPolyNote([selection.noteName, sel.noteName], '2n');
        } else {
          // third click resets
          setSelection(sel);
          setSelection2(null);
          triggerBassNote(sel.noteName, '4n');
        }
      } else {
        setSelection(sel);
        setSelection2(null);
        triggerBassNote(sel.noteName, mode === 'C' ? '2n' : '4n');
      }
    },
    [isStarted, startEngine, triggerBassNote, triggerPolyNote, mode, intervalMode, selection, selection2]
  );

  const toggleIntervalMode = () => {
    setIntervalMode(m => !m);
    setSelection(null);
    setSelection2(null);
  };

  const isDaw = mode === 'C';

  return (
    <div className={`rounded-xl overflow-hidden border ${
      isDaw ? 'bg-daw-surface border-daw-border' : 'bg-lab-card border-lab-border shadow-sm'
    }`}>
      {/* Header */}
      <div className={`px-4 py-3 flex items-center justify-between border-b ${
        isDaw ? 'border-daw-border' : 'border-lab-border'
      }`}>
        <div>
          <h2 className={`font-semibold text-sm tracking-wide ${isDaw ? 'text-daw-text font-mono' : 'text-lab-text'}`}>
            {isDaw ? 'FRETBOARD — BASS / GUITAR' : '🎸 Mástil Interactivo'}
          </h2>
          <p className={`text-xs mt-0.5 ${isDaw ? 'text-daw-muted font-mono' : 'text-lab-muted'}`}>
            {isDaw
              ? 'd = L · (1 − 2^(−n/12))  |  24 frets  |  E1–G2 tuning'
              : intervalMode
              ? 'Toca dos trastes para escuchar el intervalo'
              : 'Toca un traste para escuchar y ver la fracción de cuerda'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Interval mode toggle */}
          <button
            onClick={toggleIntervalMode}
            className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${
              intervalMode
                ? isDaw
                  ? 'bg-daw-accent text-daw-bg border-daw-accent'
                  : 'bg-lab-accent text-white border-lab-accent'
                : isDaw
                ? 'bg-transparent text-daw-muted border-daw-border hover:text-daw-text'
                : 'bg-white text-lab-muted border-lab-border hover:text-lab-text'
            }`}
          >
            {isDaw ? 'INTERVAL' : 'Intervalo'}
          </button>

          {isDaw && !intervalMode && (
            <div className="flex gap-3 text-xs font-mono">
              {[0, 12, 24].map(f => (
                <span key={f} className="text-daw-accent-alt opacity-80">
                  f{f === 0 ? '₀' : f === 12 ? '×2' : '×4'}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SVG Fretboard */}
      <div className={`px-2 py-3 ${isDaw ? 'bg-daw-surface' : 'bg-amber-50/60'}`}>
        <FretboardSVG
          selection={selection}
          selection2={selection2}
          onSelect={handleSelect}
          mode={mode}
        />
      </div>

      {/* Info Panel */}
      <div className={`px-4 py-3 min-h-[72px] border-t ${isDaw ? 'border-daw-border' : 'border-lab-border'}`}>
        <AnimatePresence mode="wait">
          {intervalMode && selection && selection2 ? (
            <IntervalPanel key="iv" sel1={selection} sel2={selection2} isDaw={isDaw} />
          ) : intervalMode && selection && !selection2 ? (
            <motion.p key="iv-wait"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className={`text-sm ${isDaw ? 'text-daw-muted font-mono' : 'text-lab-muted'}`}>
              {isDaw
                ? `— ${selection.noteName} seleccionado · elige la segunda nota —`
                : `Nota 1: ${selection.noteName} — ahora toca la segunda nota`}
            </motion.p>
          ) : !intervalMode && selection ? (
            isDaw
              ? <InfoPanelC key="c" sel={selection} />
              : <InfoPanelG key="g" sel={selection} />
          ) : (
            <motion.p key="idle"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className={`text-sm ${isDaw ? 'text-daw-muted font-mono' : 'text-lab-muted'}`}>
              {isDaw
                ? '— Selecciona un traste para analizar la relación armónica —'
                : intervalMode
                ? 'Toca el primer traste para comenzar el intervalo'
                : 'Toca cualquier traste o cuerda para comenzar'}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
