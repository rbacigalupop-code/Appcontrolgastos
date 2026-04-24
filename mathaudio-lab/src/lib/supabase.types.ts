// Auto-generated from Supabase schema — run `supabase gen types` to regenerate.

export interface Database {
  public: {
    Tables: {
      practice_sessions: {
        Row: {
          id: string;
          session_token: string;
          user_mode: 'C' | 'G';
          student_name: string | null;
          started_at: string;
          last_active_at: string;
        };
        Insert: {
          id?: string;
          session_token: string;
          user_mode: 'C' | 'G';
          student_name?: string | null;
          started_at?: string;
          last_active_at?: string;
        };
        Update: {
          user_mode?: 'C' | 'G';
          student_name?: string | null;
          last_active_at?: string;
        };
      };
      practice_events: {
        Row: {
          id: string;
          session_id: string;
          module: 'FretboardMath' | 'BeatMultiplier' | 'VisualizerScreen';
          event_type: string;
          payload: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          module: 'FretboardMath' | 'BeatMultiplier' | 'VisualizerScreen';
          event_type: string;
          payload?: Record<string, unknown>;
          created_at?: string;
        };
        Update: never;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
