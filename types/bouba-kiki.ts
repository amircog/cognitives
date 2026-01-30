// Bouba-Kiki Effect Experiment Type Definitions
// Demonstrates cross-modal sound symbolism (rounded shapes → "bouba", spiky → "kiki")

export interface Trial {
  id: number;
  word: string;
  wordType: 'rounded' | 'spiky'; // Expected conventional mapping
  leftShape: string; // Image filename
  rightShape: string;
  leftShapeType: 'rounded' | 'spiky';
  rightShapeType: 'rounded' | 'spiky';
  isControl: boolean; // Control question vs main trial
}

export interface TrialResult {
  id?: string;
  session_id: string;
  participant_name?: string;
  trial_number: number;
  word: string;
  word_type: 'rounded' | 'spiky';
  left_shape: string;
  right_shape: string;
  response: 'left' | 'right';
  is_correct: boolean;
  reaction_time_ms: number;
  is_control: boolean;
  created_at?: string;
}

export interface Summary {
  totalTrials: number;
  correctTrials: number;
  accuracy: number;
  boubaAccuracy: number; // % correct for bouba-type words (rounded)
  kikiAccuracy: number; // % correct for kiki-type words (spiky)
  meanRT: number;
  controlAccuracy: number; // % correct for control trials
}
