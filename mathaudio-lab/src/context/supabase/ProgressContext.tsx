import React, {
  createContext, useContext, useRef, useCallback, useEffect, useState,
} from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase, isSupabaseEnabled } from '../../lib/supabase';
import { useUserMode } from '../UserModeContext';

// ─── Types ────────────────────────────────────────────────────────────────────

type Module = 'FretboardMath' | 'BeatMultiplier' | 'VisualizerScreen';

interface ProgressContextValue {
  sessionId: string | null;
  studentName: string | null;
  setStudentName: (name: string) => Promise<void>;
  trackEvent: (module: Module, eventType: string, payload?: Record<string, unknown>) => void;
  isEnabled: boolean;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ProgressContext = createContext<ProgressContextValue | null>(null);

function getOrCreateToken(): string {
  const key = 'mathaudio_session_token';
  let token = localStorage.getItem(key);
  if (!token) {
    token = `anon_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(key, token);
  }
  return token;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const { mode } = useUserMode();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [studentName, setStudentNameState] = useState<string | null>(
    () => localStorage.getItem('mathaudio_student_name')
  );
  const tokenRef = useRef(getOrCreateToken());
  const eventBuffer = useRef<Array<{ module: Module; eventType: string; payload: Record<string, unknown> }>>([]);

  // ── Bootstrap session ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isSupabaseEnabled || !supabase) return;
    const db = supabase as SupabaseClient;

    const bootstrap = async () => {
      const { data, error } = await db
        .from('practice_sessions')
        .upsert(
          {
            session_token: tokenRef.current,
            user_mode: mode,
            student_name: studentName,
            last_active_at: new Date().toISOString(),
          },
          { onConflict: 'session_token' }
        )
        .select('id')
        .single();

      if (error || !data) {
        console.warn('[MathAudio] Supabase session error:', error?.message);
        return;
      }

      const id = (data as { id: string }).id;
      setSessionId(id);

      const buffered = eventBuffer.current.splice(0);
      if (buffered.length > 0) {
        await db.from('practice_events').insert(
          buffered.map(e => ({
            session_id: id,
            module: e.module,
            event_type: e.eventType,
            payload: e.payload,
          }))
        );
      }
    };

    bootstrap();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // ── Track event ──────────────────────────────────────────────────────────────
  const trackEvent = useCallback(
    (module: Module, eventType: string, payload: Record<string, unknown> = {}) => {
      if (!isSupabaseEnabled || !supabase) return;
      const db = supabase as SupabaseClient;

      if (!sessionId) {
        eventBuffer.current.push({ module, eventType, payload });
        return;
      }

      db.from('practice_events')
        .insert({ session_id: sessionId, module, event_type: eventType, payload })
        .then(({ error }) => {
          if (error) console.warn('[MathAudio] Event track error:', error.message);
        });
    },
    [sessionId]
  );

  // ── Update student name ──────────────────────────────────────────────────────
  const setStudentName = useCallback(
    async (name: string) => {
      setStudentNameState(name);
      localStorage.setItem('mathaudio_student_name', name);
      if (!isSupabaseEnabled || !supabase || !sessionId) return;
      const db = supabase as SupabaseClient;
      await db.from('practice_sessions').update({ student_name: name }).eq('id', sessionId);
    },
    [sessionId]
  );

  return (
    <ProgressContext.Provider
      value={{ sessionId, studentName, setStudentName, trackEvent, isEnabled: isSupabaseEnabled }}
    >
      {children}
    </ProgressContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useProgress() {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgress must be used within ProgressProvider');
  return ctx;
}
