export type UserMode = 'C' | 'G';

export interface StringTuning {
  name: string;
  openNote: string;
  baseMidi: number;
  baseFreq: number;
  thickness: number;
  colorClass: string;
}

export interface FretSelection {
  fret: number;
  stringIdx: number;
  frequency: number;
  noteName: string;
  vibRatio: number;
  fractionLabel: string;
  powerLabel: string | null;
}

export type DrumTrack = 'kick' | 'snare' | 'hihat';

export interface BeatCell {
  active: boolean;
  velocity: number;
}

export interface BeatState {
  bpm: number;
  base: number;
  multiplier: number;
  grid: Record<DrumTrack, BeatCell[]>;
  isPlaying: boolean;
  currentStep: number;
}

export interface CurriculumNode {
  id: string;
  target_level: string;
  math_concept: string;
  audio_metaphor: string;
  description: string;
  interactive_module: string;
  difficulty: number;
  color_code?: string;
  learning_outcome: string;
}

export interface MusicExample {
  id: string;
  title: string;
  artist: string;
  genre: string;
  concept: string;
  bpm: number;
  instrumentation: string[];
  math_link: string;
  target_module: string;
  target_level: string;
  notes_demo: string[];
  fret_sequence?: number[];
}
