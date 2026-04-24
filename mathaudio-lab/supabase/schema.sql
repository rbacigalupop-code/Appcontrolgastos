-- ============================================================
-- MathAudio Lab — Supabase Schema
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- Sesiones de práctica (anónimas — no requieren login)
CREATE TABLE IF NOT EXISTS practice_sessions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token   TEXT        NOT NULL UNIQUE,   -- token anónimo local del browser
  user_mode       TEXT        CHECK (user_mode IN ('C', 'G')) DEFAULT 'G',
  student_name    TEXT,                          -- nombre opcional (Grace, Cristóbal…)
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Eventos de práctica (qué nota tocó, qué beat configuró, etc.)
CREATE TABLE IF NOT EXISTS practice_events (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   UUID        NOT NULL REFERENCES practice_sessions(id) ON DELETE CASCADE,
  module       TEXT        NOT NULL CHECK (module IN ('FretboardMath','BeatMultiplier','VisualizerScreen')),
  event_type   TEXT        NOT NULL,  -- 'note_played', 'beat_started', 'mode_switched'…
  payload      JSONB       NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_events_session ON practice_events(session_id);
CREATE INDEX IF NOT EXISTS idx_events_module  ON practice_events(module);
CREATE INDEX IF NOT EXISTS idx_events_created ON practice_events(created_at DESC);

-- ── Row Level Security ────────────────────────────────────────────────────────
-- Habilitar RLS
ALTER TABLE practice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_events   ENABLE ROW LEVEL SECURITY;

-- Cualquiera puede insertar/leer su propia sesión (por token anónimo)
CREATE POLICY "insert own session"
  ON practice_sessions FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "update own session"
  ON practice_sessions FOR UPDATE TO anon
  USING (true);

CREATE POLICY "select own session"
  ON practice_sessions FOR SELECT TO anon
  USING (true);

-- Cualquiera puede insertar eventos (vinculados a su sesión)
CREATE POLICY "insert events"
  ON practice_events FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "select events"
  ON practice_events FOR SELECT TO anon
  USING (true);

-- ── Vista de resumen por estudiante (útil para revisar progreso) ──────────────
CREATE OR REPLACE VIEW student_progress AS
SELECT
  s.student_name,
  s.user_mode,
  s.started_at,
  s.last_active_at,
  COUNT(e.id)                                    AS total_events,
  COUNT(DISTINCT e.module)                       AS modules_used,
  COUNT(e.id) FILTER (WHERE e.module = 'FretboardMath')  AS fretboard_interactions,
  COUNT(e.id) FILTER (WHERE e.module = 'BeatMultiplier') AS beat_interactions
FROM practice_sessions s
LEFT JOIN practice_events e ON e.session_id = s.id
GROUP BY s.id
ORDER BY s.last_active_at DESC;
