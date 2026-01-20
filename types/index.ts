export interface Trial {
  id: number;
  wordText: string;
  fontColor: string;
  colorName: string;
  isCongruent: boolean;
}

export interface TrialResult {
  id?: string;
  session_id: string;
  word_text: string;
  font_color: string;
  is_congruent: boolean;
  reaction_time_ms: number;
  user_response: string;
  is_correct: boolean;
  created_at?: string;
}

export interface ExperimentState {
  sessionId: string;
  currentTrialIndex: number;
  trials: Trial[];
  results: TrialResult[];
  isComplete: boolean;
}

export interface ResultsSummary {
  congruentAvg: number;
  incongruentAvg: number;
  stroopEffect: number;
  totalTrials: number;
  correctTrials: number;
  accuracy: number;
}

export type ColorKey = 'red' | 'green' | 'yellow';

export const COLORS: Record<ColorKey, { hex: string; name: string }> = {
  red: { hex: '#f43f5e', name: 'red' },
  green: { hex: '#34d399', name: 'green' },
  yellow: { hex: '#fbbf24', name: 'yellow' },
};

// All experimental words (12 total)
export const WORDS = [
  // English
  'red', 'green', 'yellow',
  // Hebrew (transliterated)
  'adom', 'yarok', 'tsahov',
  // Spanish
  'rojo', 'verde', 'amarillo',
  // Non-words
  'flurg', 'blaket', 'zorphin'
];

// Practice trial words
export const PRACTICE_WORDS = [
  { word: 'welcome', color: 'red' as ColorKey },
  { word: 'cognition', color: 'green' as ColorKey },
  { word: 'class', color: 'yellow' as ColorKey },
  { word: 'enjoy', color: 'green' as ColorKey },
  { word: 'experiment', color: 'red' as ColorKey }
];
