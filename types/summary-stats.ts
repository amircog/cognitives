// Summary Statistics / Ensemble Perception Experiment

export type StimulusType = 'circles' | 'line-lengths';
export type StatType = 'mean';
export type TrialType = 'ensemble' | 'recognition';
export type ProbeType = 'target' | 'foil-mean' | 'foil-non-mean';
// FoilType kept for backward compat with old DB rows
export type FoilType = 'mean' | 'non-mean';

// A single item in a stimulus array
export interface ArrayItem {
  id: number;
  x: number;   // center x in SVG coordinate space (0–500)
  y: number;   // center y in SVG coordinate space (0–500)
  value: number; // radius (circles), length in px (line-lengths)
}

// ──────────────────────────────────────────────
// Trial types (2AFC removed — mean assessment + recognition only)
// ──────────────────────────────────────────────

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

export type Trial = EnsembleTrial | RecognitionTrial;

// ──────────────────────────────────────────────
// DB-storable result types (snake_case for Supabase)
// ──────────────────────────────────────────────

export interface EnsembleResult {
  session_id: string;
  participant_name?: string;
  trial_type: 'ensemble';
  trial_number: number;
  stimulus_type: string;      // string (not StimulusType) to handle old 'line-orientations' rows
  stat_type: string;
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
  stimulus_type: string;
  n_items: number;
  probe_value: number;
  probe_is_target: boolean;
  probe_type: string | null;   // null for old rows that predate probe_type column
  response_yes: boolean;
  is_correct: boolean;
  reaction_time_ms: number;
}

// Kept for backward compatibility with old DB data; no longer generated in new experiments
export interface TwoAFCResult {
  session_id: string;
  participant_name?: string;
  trial_type: '2afc';
  trial_number: number;
  stimulus_type: string;
  n_items: number;
  true_value: number;
  foil_value: number;
  foil_type: string | null;
  correct_is_a: boolean;
  chose_a: boolean;
  is_correct: boolean;
  reaction_time_ms: number;
}

export type TrialResult = EnsembleResult | RecognitionResult | TwoAFCResult;
