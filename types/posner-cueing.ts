export type Validity = 'valid' | 'invalid' | 'catch' | 'exo_invalid';
export type CueDirection = 'left' | 'right';
export type TargetSide = 'left' | 'right' | null;

export interface PosnerTrial {
  id: number;
  cueDirection: CueDirection;
  targetSide: TargetSide;
  validity: Validity;
  soa: 300 | 500;
  isPractice: boolean;
}

export interface PosnerResult {
  id?: string;
  session_id: string;
  participant_name?: string;
  trial_number: number;
  cue_direction: string;
  target_side: string;
  validity: string;
  soa: number;
  response: string;
  correct: boolean;
  rt_ms: number | null;
  is_practice: boolean;
  created_at?: string;
}
