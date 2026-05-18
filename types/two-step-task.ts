export interface TwoStepTrial {
  trialIndex: number;
  isPractice: boolean;
  rewardProbs: [number, number, number, number]; // reward probabilities for the 4 Stage 2 stimuli [S2A_left, S2A_right, S2B_left, S2B_right]
}

export interface TwoStepTrialResult {
  session_id: string;
  participant_name: string | null;
  trial_index: number;
  is_practice: boolean;
  stage1_choice: 'left' | 'right';
  stage1_stimulus: string;
  stage1_rt_ms: number | null;
  transition_type: 'common' | 'rare';
  stage2_state: 'A' | 'B';
  stage2_choice: 'left' | 'right';
  stage2_stimulus: string;
  stage2_rt_ms: number | null;
  rewarded: boolean;
  reward_prob_s2a_left: number;
  reward_prob_s2a_right: number;
  reward_prob_s2b_left: number;
  reward_prob_s2b_right: number;
  missed_stage1: boolean;
  missed_stage2: boolean;
}
