import React, { createContext, useContext, useState, useCallback } from 'react';
import type { UserMode } from '../types';

interface UserModeContextValue {
  mode: UserMode;
  toggleMode: () => void;
  setMode: (m: UserMode) => void;
}

const UserModeContext = createContext<UserModeContextValue | null>(null);

const STORAGE_KEY = 'mathaudio_user_mode';

export function UserModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<UserMode>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'C' ? 'C' : 'G';
  });

  const setMode = useCallback((m: UserMode) => {
    localStorage.setItem(STORAGE_KEY, m);
    setModeState(m);
  }, []);

  const toggleMode = useCallback(() => {
    setMode(mode === 'C' ? 'G' : 'C');
  }, [mode, setMode]);

  return (
    <UserModeContext.Provider value={{ mode, toggleMode, setMode }}>
      {children}
    </UserModeContext.Provider>
  );
}

export function useUserMode() {
  const ctx = useContext(UserModeContext);
  if (!ctx) throw new Error('useUserMode must be used within UserModeProvider');
  return ctx;
}
