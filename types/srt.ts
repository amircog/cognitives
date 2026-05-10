export interface SrtTrial {
  block_number: number;
  trial_in_block: number;
  trial_overall: number;
  sequence_position: number;
  target_location: number; // 1=down, 2=left, 3=right, 4=up
  sequence_type: 'main' | 'interference';
}

export interface SrtTrialResult {
  session_id: string;
  participant_name: string | null;
  block_number: number;
  trial_in_block: number;
  trial_overall: number;
  sequence_position: number;
  target_location: number;
  response_location: number;
  correct: boolean;
  rt_ms: number | null;
  sequence_type: 'main' | 'interference';
  is_practice: boolean;
}
