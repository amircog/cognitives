export type Condition = 'aligned' | 'small-misaligned' | 'large-misaligned';

export interface Trial {
  condition: Condition;
  studyFace: string;      // URL — whole face shown during study phase
  testTopFace: string;    // URL — top half of composite test face
  testBottomFace: string; // URL — bottom half of composite test face (always different)
  isSame: boolean;        // true = test top is same identity as study face
  isPractice: boolean;
}

export interface TrialResult {
  session_id: string;
  participant_name: string | null;
  trial_index: number;
  condition: string;
  is_same: boolean;
  response: 'same' | 'different';
  is_correct: boolean;
  reaction_time_ms: number;
  study_face: string;
  test_top_face: string;
  test_bottom_face: string;
  is_practice: boolean;
}
