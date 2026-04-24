export type Condition = 'word' | 'pseudoword' | 'single-letter';

export interface Trial {
  condition: Condition;
  stimulus: string;       // what to show for 50ms
  correctLetter: string;  // letter that appeared at position 2
  foilLetter: string;     // the other forced-choice option
  wordLength: number;     // 3 or 4 (for mask and position display)
  isPractice: boolean;
}

export interface TrialResult {
  session_id: string;
  participant_name: string | null;
  trial_index: number;
  condition: string;
  stimulus: string;
  correct_letter: string;
  response_letter: string;
  is_correct: boolean;
  reaction_time_ms: number;
  is_practice: boolean;
}
