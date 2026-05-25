export type Condition = 'baseline' | 'restudy' | 'retrieval';
export type CounterbalanceGroup = 1 | 2 | 3;

export interface CueTargetPair {
  cue: string;
  target: string;
}

export interface TrialResult {
  session_id: string;
  participant_name: string;
  counterbalance_group: number;
  session_number: number;
  phase: string;
  practice_round: number | null;
  trial_index: number;
  cue: string;
  target: string;
  condition: string;
  trial_type: string;
  response: string | null;
  is_correct: boolean | null;
  reaction_time_ms: number | null;
}
