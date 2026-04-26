import { motion } from 'framer-motion';
import { useUserMode } from '../../context/UserModeContext';

export default function ModeToggle() {
  const { mode, toggleMode } = useUserMode();
  const isDaw = mode === 'C';

  return (
    <div className="flex items-center gap-3">
      <span className={`text-xs font-semibold ${isDaw ? 'text-daw-muted font-mono' : 'text-lab-muted'}`}>
        {isDaw ? 'MODO' : 'Modo'}
      </span>

      {/* Toggle pill */}
      <motion.button
        onClick={toggleMode}
        whileTap={{ scale: 0.95 }}
        className={`relative flex items-center rounded-full p-0.5 transition-colors duration-300 ${
          isDaw
            ? 'bg-daw-s2 border border-daw-border w-28'
            : 'bg-lab-border w-28'
        }`}
        aria-label={`Cambiar a modo ${isDaw ? 'G (Laboratorio)' : 'C (DAW)'}`}
        title={`Cambiar a modo ${isDaw ? 'G' : 'C'}`}
      >
        {/* Sliding indicator */}
        <motion.div
          className={`absolute h-6 w-12 rounded-full z-0 ${
            isDaw ? 'bg-daw-accent-alt' : 'bg-lab-accent'
          }`}
          animate={{ x: isDaw ? 52 : 2 }}
          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
        />

        {/* Labels */}
        <span
          className={`relative z-10 w-12 text-center text-xs font-bold py-1 transition-colors duration-200 ${
            !isDaw ? 'text-white' : (isDaw ? 'text-daw-muted' : 'text-lab-muted')
          }`}
        >
          G
        </span>
        <span
          className={`relative z-10 w-12 text-center text-xs font-bold py-1 transition-colors duration-200 ${
            isDaw ? 'text-white' : (isDaw ? 'text-daw-muted' : 'text-lab-muted')
          }`}
        >
          C
        </span>
      </motion.button>

      {/* Mode label */}
      <span
        className={`text-xs font-semibold transition-colors duration-300 ${
          isDaw ? 'text-daw-accent-alt font-mono' : 'text-lab-accent'
        }`}
      >
        {isDaw ? '2° MEDIO — DAW' : '5° Básico — Lab'}
      </span>
    </div>
  );
}
