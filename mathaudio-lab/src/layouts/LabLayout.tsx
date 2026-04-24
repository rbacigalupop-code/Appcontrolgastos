import { motion } from 'framer-motion';
import ModeToggle from '../components/ModeToggle';
import FretboardMath from '../components/FretboardMath';
import BeatMultiplier from '../components/BeatMultiplier';
import VisualizerScreen from '../components/VisualizerScreen';

// Color palette — immutable per concept (as per spec)
const CONCEPT_COLORS = {
  fracciones: '#fbbf24',
  multiplicacion: '#f472b6',
  suma: '#4ade80',
  potencias: '#a78bfa',
};

export default function LabLayout() {
  return (
    <div className="min-h-screen bg-lab-bg text-lab-text font-sans flex flex-col">

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-lab-border px-5 py-3 flex items-center gap-4 shrink-0 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-lab-accent flex items-center justify-center">
            <span className="text-white text-sm font-bold">M</span>
          </div>
          <div>
            <div className="font-bold text-lab-text text-sm leading-tight">MathAudio Lab</div>
            <div className="text-lab-muted text-xs">5° Básico</div>
          </div>
        </div>

        <div className="ml-auto">
          <ModeToggle />
        </div>
      </header>

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <main className="flex-1 p-4 md:p-6 space-y-6 overflow-auto">

        {/* Concept pills legend */}
        <div className="flex flex-wrap gap-2">
          {Object.entries(CONCEPT_COLORS).map(([concept, color]) => (
            <span
              key={concept}
              className="px-3 py-1 rounded-full text-xs font-semibold capitalize"
              style={{ backgroundColor: `${color}25`, color, border: `1px solid ${color}60` }}
            >
              {concept}
            </span>
          ))}
        </div>

        {/* ── Card A: Fretboard — Fracciones ───────────────────────────────── */}
        <LabCard
          title="Mástil de Bajo"
          subtitle="Fracciones y proporciones"
          accent={CONCEPT_COLORS.fracciones}
          icon="🎸"
          hint="Toca el traste 12 para escuchar la mitad de la cuerda. ¿Puedes encontrar ¼?"
        >
          <FretboardMath />
        </LabCard>

        {/* Two-column row for Beat + Visualizer */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── Card B: Beat Multiplier — Multiplicación ─────────────────── */}
          <LabCard
            title="Multiplicador de Beats"
            subtitle="Multiplicación y grupos"
            accent={CONCEPT_COLORS.multiplicacion}
            icon="🥁"
            hint="Cambia la Base y el Multiplicador para ver cómo se calcula el total de tiempos."
          >
            <BeatMultiplier />
          </LabCard>

          {/* ── Card C: Visualizer — Ondas ────────────────────────────────── */}
          <LabCard
            title="Pantalla de Onda"
            subtitle="La forma del sonido"
            accent={CONCEPT_COLORS.suma}
            icon="〰️"
            hint="Después de tocar una nota, mira cómo cambia la onda en la pantalla."
          >
            <VisualizerScreen />
          </LabCard>
        </div>

        {/* ── Quick reference for kids ─────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl border border-lab-border bg-white p-5 shadow-sm"
        >
          <h3 className="font-bold text-lab-text mb-3">
            ¿Qué aprendemos hoy?
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FactCard
              icon="1/2"
              color={CONCEPT_COLORS.fracciones}
              title="Fracciones en el mástil"
              body="El traste 12 divide la cuerda exactamente en la mitad. La nota sube una octava."
            />
            <FactCard
              icon="×"
              color={CONCEPT_COLORS.multiplicacion}
              title="Multiplicación en el ritmo"
              body="4 grupos de 4 beats = 16 tiempos. ¡La música usa la multiplicación todo el tiempo!"
            />
            <FactCard
              icon="〰"
              color={CONCEPT_COLORS.suma}
              title="Las ondas son movimiento"
              body="Un sonido agudo vibra más veces por segundo que un sonido grave. Puedes verlo en la pantalla."
            />
          </div>
        </motion.div>
      </main>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer className="border-t border-lab-border bg-white px-5 py-2 text-xs text-lab-muted text-center shrink-0">
        MathAudio Lab — Accesibilidad Cognitiva · Matemáticas a través del Sonido
      </footer>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function LabCard({
  title, subtitle, accent, icon, hint, children,
}: {
  title: string; subtitle: string; accent: string; icon: string; hint: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-2xl border bg-white shadow-sm overflow-hidden"
      style={{ borderColor: `${accent}50` }}
    >
      {/* Card header with accent strip */}
      <div
        className="px-5 py-3 flex items-center gap-3 border-b"
        style={{
          backgroundColor: `${accent}12`,
          borderColor: `${accent}30`,
        }}
      >
        <span className="text-2xl" aria-hidden="true">{icon}</span>
        <div>
          <h2 className="font-bold text-lab-text text-sm leading-tight">{title}</h2>
          <p className="text-xs font-medium" style={{ color: accent }}>{subtitle}</p>
        </div>
      </div>

      {/* Hint banner */}
      <div
        className="px-5 py-2 text-xs flex items-start gap-2 border-b"
        style={{ backgroundColor: `${accent}08`, borderColor: `${accent}20`, color: '#6b7280' }}
      >
        <span className="shrink-0">💡</span>
        <span>{hint}</span>
      </div>

      {/* Content */}
      <div className="p-0">{children}</div>
    </motion.div>
  );
}

function FactCard({
  icon, color, title, body,
}: {
  icon: string; color: string; title: string; body: string;
}) {
  return (
    <div
      className="rounded-xl p-4 space-y-2"
      style={{ backgroundColor: `${color}15`, border: `1px solid ${color}30` }}
    >
      <div
        className="text-2xl font-black leading-none"
        style={{ color }}
        aria-hidden="true"
      >
        {icon}
      </div>
      <h4 className="font-semibold text-lab-text text-sm">{title}</h4>
      <p className="text-xs text-lab-muted leading-relaxed">{body}</p>
    </div>
  );
}
