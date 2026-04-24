import { useAudioEngine } from '../context/AudioEngineContext';
import ModeToggle from '../components/ModeToggle';
import FretboardMath from '../components/FretboardMath';
import BeatMultiplier from '../components/BeatMultiplier';
import VisualizerScreen from '../components/VisualizerScreen';

export default function DawLayout() {
  const { isReady, isStarted } = useAudioEngine();

  return (
    <div className="min-h-screen bg-daw-bg text-daw-text font-mono flex flex-col">

      {/* ── Top bar ──────────────────────────────────────────────────────────── */}
      <header className="border-b border-daw-border bg-daw-surface px-5 py-2 flex items-center gap-6 shrink-0">
        <div className="flex items-baseline gap-2">
          <span className="text-daw-accent font-bold text-sm tracking-widest">
            MATHAUDIO
          </span>
          <span className="text-daw-muted text-xs tracking-widest">LAB</span>
        </div>

        {/* Engine status */}
        <div className="flex items-center gap-2">
          <div
            className={`w-1.5 h-1.5 rounded-full transition-colors ${
              isReady ? 'bg-daw-accent animate-pulse-slow' : 'bg-daw-muted'
            }`}
          />
          <span className="text-daw-muted text-xs">
            {isReady
              ? 'AUDIO ENGINE ONLINE'
              : isStarted
              ? 'INITIALIZING...'
              : 'STANDBY — click any module to init'}
          </span>
        </div>

        <div className="ml-auto">
          <ModeToggle />
        </div>
      </header>

      {/* ── Main workspace ───────────────────────────────────────────────────── */}
      <main className="flex-1 p-4 grid grid-cols-1 xl:grid-cols-3 gap-4 overflow-auto">

        {/* Left column: Fretboard spans full width on xl, then collapses */}
        <section className="xl:col-span-2 space-y-4">
          {/* Section label */}
          <div className="flex items-center gap-2 opacity-50">
            <div className="h-px flex-1 bg-daw-border" />
            <span className="text-xs text-daw-muted tracking-widest px-2">
              MODULE A — FRETBOARD / POTENCIAS
            </span>
            <div className="h-px flex-1 bg-daw-border" />
          </div>

          <FretboardMath />

          <div className="flex items-center gap-2 opacity-50">
            <div className="h-px flex-1 bg-daw-border" />
            <span className="text-xs text-daw-muted tracking-widest px-2">
              MODULE B — BEAT SEQUENCER
            </span>
            <div className="h-px flex-1 bg-daw-border" />
          </div>

          <BeatMultiplier />
        </section>

        {/* Right column: Visualizer */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 opacity-50">
            <div className="h-px flex-1 bg-daw-border" />
            <span className="text-xs text-daw-muted tracking-widest px-2">
              MODULE C — ANALYSER
            </span>
            <div className="h-px flex-1 bg-daw-border" />
          </div>

          <VisualizerScreen />

          {/* Reference card */}
          <div className="rounded-xl border border-daw-border bg-daw-surface p-4 space-y-3">
            <h3 className="text-xs text-daw-accent tracking-widest font-bold">
              FÓRMULAS DE REFERENCIA
            </h3>
            <div className="space-y-2 text-xs">
              <FormulaRow
                label="Posición traste n"
                formula="d = L · (1 − 2^(−n/12))"
              />
              <FormulaRow
                label="Frecuencia en traste n"
                formula="f(n) = f₀ · 2^(n/12)"
              />
              <FormulaRow
                label="Relación octava"
                formula="f(n+12) = 2 · f(n)"
              />
              <FormulaRow
                label="Total de pasos"
                formula="S = Base × Multiplicador"
              />
              <FormulaRow
                label="Semitono temperado"
                formula="r = 2^(1/12) ≈ 1.0595"
              />
            </div>
          </div>
        </section>
      </main>

      {/* ── Status bar ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-daw-border bg-daw-surface px-5 py-1.5 flex items-center gap-4 text-xs text-daw-muted shrink-0">
        <span>MathAudio Lab v0.1.0</span>
        <span className="opacity-30">|</span>
        <span>Tone.js · React · TypeScript · Vite</span>
        <span className="ml-auto">
          {new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </footer>
    </div>
  );
}

function FormulaRow({ label, formula }: { label: string; formula: string }) {
  return (
    <div className="flex justify-between gap-4 items-baseline">
      <span className="text-daw-muted shrink-0">{label}</span>
      <code className="text-daw-accent bg-daw-s2 px-1.5 py-0.5 rounded text-xs">
        {formula}
      </code>
    </div>
  );
}
