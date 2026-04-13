// Summary Statistics / Ensemble Perception Experiment

export type StimulusType = 'circles' | 'line-lengths';
export type StatType = 'mean';
export type TrialType = 'ensemble' | 'recognition' | '2afc';
export type ProbeType = 'target' | 'foil-mean' | 'foil-non-mean';
export type FoilType = 'mean' | 'non-mean';

// A single item in a stimulus array
export interface ArrayItem {
  id: number;
  x: number;   // center x in SVG coordinate space (0–500)
  y: number;   // center y in SVG coordinate space (0–500)
  value: number; // radius (circles), length in px (line-lengths)
}

// ──────────────────────────────────────────────
// Trial types
// ──────────────────────────────────────────────

// Ensemble: show array → report mean via slider
export interface EnsembleTrial {
  trialId: number;
  type: 'ensemble';
  stimulusType: StimulusType;
  statType: StatType;
  items: ArrayItem[];
  trueValue: number;
  nItems: number;
  isPractice: boolean;
}

// Recognition: show array → show probe → "did you see this exact item?"
export interface RecognitionTrial {
  trialId: number;
  type: 'recognition';
  stimulusType: StimulusType;
  items: ArrayItem[];
  nItems: number;
  probeValue: number;
  probeIsTarget: boolean;
  probeType: ProbeType;
  isPractice: boolean;
}

// 2AFC: show array → show two items → "which one appeared in the display?"
export interface TwoAFCTrial {
  trialId: number;
  type: '2afc';
  stimulusType: StimulusType;
  items: ArrayItem[];
  nItems: number;
  trueValue: number;   // a set member that WAS shown
  foilValue: number;   // a non-member (exact mean if foilType='mean', else other non-member)
  foilType: FoilType;
  correctIsA: boolean; // true = left option is correct
  isPractice: boolean;
}

export type Trial = EnsembleTrial | RecognitionTrial | TwoAFCTrial;

// ──────────────────────────────────────────────
// DB-storable result types (snake_case for Supabase)
// ──────────────────────────────────────────────

export interface EnsembleResult {
  session_id: string;
  participant_name?: string;
  trial_type: 'ensemble';
  trial_number: number;
  stimulus_type: StimulusType;
  stat_type: StatType;
  n_items: number;
  true_value: number;
  response_value: number;
  signed_error: number;
  absolute_error: number;
  reaction_time_ms: number;
  is_practice: boolean;
}

export interface RecognitionResult {
  session_id: string;
  participant_name?: string;
  trial_type: 'recognition';
  trial_number: number;
  stimulus_type: StimulusType;
  n_items: number;
  probe_value: number;
  probe_is_target: boolean;
  probe_type: ProbeType;
  response_yes: boolean;
  is_correct: boolean;
  reaction_time_ms: number;
}

export interface TwoAFCResult {
  session_id: string;
  participant_name?: string;
  trial_type: '2afc';
  trial_number: number;
  stimulus_type: StimulusType;
  n_items: number;
  true_value: number;
  foil_value: number;
  foil_type: FoilType;
  correct_is_a: boolean;
  chose_a: boolean;
  is_correct: boolean;
  reaction_time_ms: number;
}

export type TrialResult = EnsembleResult | RecognitionResult | TwoAFCResult;
