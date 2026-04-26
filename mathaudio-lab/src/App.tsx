import { AnimatePresence, motion } from 'framer-motion';
import { AudioEngineProvider } from './context/AudioEngineContext';
import { UserModeProvider, useUserMode } from './context/UserModeContext';
import { ProgressProvider } from './context/supabase/ProgressContext';
import DawLayout from './layouts/DawLayout';
import LabLayout from './layouts/LabLayout';

function AppContent() {
  const { mode } = useUserMode();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={mode}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className={mode === 'C' ? 'dark' : ''}
      >
        {mode === 'C' ? <DawLayout /> : <LabLayout />}
      </motion.div>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <UserModeProvider>
      <ProgressProvider>
        <AudioEngineProvider>
          <AppContent />
        </AudioEngineProvider>
      </ProgressProvider>
    </UserModeProvider>
  );
}
