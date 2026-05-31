export interface WordList {
  theme: string;
  criticalLure: string;
  studyWords: string[];
}

export interface StudyTrial {
  word: string;
  listTheme: string;
  position: number;
}

export interface RecallEntry {
  session_id: string;
  participant_name?: string;
  list_index: number;
  list_theme: string;
  recalled_words: string[];
  critical_lure_recalled: boolean;
  correct_count: number;
  intrusion_count: number;
  prior_list_intrusion_count: number;
}

export interface DistractorResult {
  session_id: string;
  list_index: number;
  total_trials: number;
  correct_count: number;
}

export interface TestItem {
  word: string;
  itemType: 'studied' | 'critical_lure' | 'unrelated_foil';
  listTheme: string;
  serialPosition?: number;
}

export interface TestResponse {
  word: string;
  itemType: 'studied' | 'critical_lure' | 'unrelated_foil';
  listTheme: string;
  response: 'old' | 'new';
  isCorrect: boolean;
  reactionTimeMs: number;
  serialPosition?: number;
  confidence: 1 | 2 | 3 | 4;
}

export interface DRMResult {
  id?: string;
  session_id: string;
  participant_name?: string;
  word: string;
  item_type: 'studied' | 'critical_lure' | 'unrelated_foil';
  list_theme: string;
  response: 'old' | 'new';
  is_correct: boolean;
  reaction_time_ms: number;
  serial_position?: number;
  confidence?: number;
  created_at?: string;
}

export interface DRMRecallResult {
  id?: string;
  session_id: string;
  participant_name?: string;
  list_index: number;
  list_theme: string;
  recalled_words: string;
  critical_lure_recalled: boolean;
  correct_count: number;
  intrusion_count: number;
  prior_list_intrusion_count: number;
  distractor_correct?: number;
  distractor_total?: number;
  created_at?: string;
}
