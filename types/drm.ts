export interface WordList {
  theme: string;
  themeHe: string;
  criticalLure: string;
  studyWords: string[]; // Words presented during study (12 words)
  relatedDistractors: string[]; // Related but not presented (4 words)
  unrelatedDistractors: string[]; // Unrelated words (4 words)
}

export interface StudyTrial {
  word: string;
  listTheme: string;
  position: number; // Position in the list (1-12)
}

export interface TestItem {
  word: string;
  itemType: 'studied' | 'critical_lure' | 'related_distractor' | 'unrelated_distractor';
  listTheme: string;
  serialPosition?: number; // Position in original study list (1-15)
}

export interface TestResponse {
  word: string;
  itemType: 'studied' | 'critical_lure' | 'related_distractor' | 'unrelated_distractor';
  listTheme: string;
  response: 'old' | 'new';
  isCorrect: boolean;
  reactionTimeMs: number;
  serialPosition?: number; // Position in original study list (1-15)
  confidence?: 1 | 2 | 3 | 4 | 5; // Optional confidence rating
}

export interface DRMResult {
  id?: string;
  session_id: string;
  participant_name?: string;
  word: string;
  item_type: 'studied' | 'critical_lure' | 'related_distractor' | 'unrelated_distractor';
  list_theme: string;
  response: 'old' | 'new';
  is_correct: boolean;
  reaction_time_ms: number;
  serial_position?: number; // Position in original study list (1-15)
  confidence?: number;
  created_at?: string;
}

export interface DRMSummary {
  hitRate: number; // Correctly identifying studied words as "old"
  criticalLureRate: number; // False alarm rate for critical lures
  relatedFARate: number; // False alarm rate for related distractors
  unrelatedFARate: number; // False alarm rate for unrelated distractors
  correctRejectionRate: number; // Correctly identifying new words as "new"
  totalItems: number;
}
