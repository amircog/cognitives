// Summary Statistics / Ensemble Perception Experiment
// Based on Ariely (2001), Chong & Treisman (2003), Alvarez (2011)

export type StimulusType = 'circles' | 'line-lengths' | 'line-orientations';
export type StatType = 'mean' | 'max' | 'min';
export type TrialType = 'ensemble' | 'recognition';

// A single item in a stimulus array
export interface ArrayItem {
  id: number;
  x: number;   // center x in SVG coordinate space (0–500)
  y: number;   // center y in SVG coordinate space (0–500)
  value: number; // radius (circles), length in px (lines), degrees (orientations)
}

// An ensemble trial: show array → report summary stat
export interface EnsembleTrial {
  trialId: number;
  type: 'ensemble';
  stimulusType: StimulusType;
  statType: StatType;
  items: ArrayItem[];
  trueValue: number;      // actual mean/max/min of item values
  nItems: number;         // 4, 8, or 12
  isPractice: boolean;
}

// A recognition trial: show single probe → was it in a previous array?
export interface RecognitionTrial {
  trialId: number;
  type: 'recognition';
  stimulusType: StimulusType;
  probeValue: number;
  probeIsTarget: boolean;  // true = item appeared in ensemble phase
  sourceTrialId?: number;  // which ensemble trial it came from (if target)
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
  stimulus_type: StimulusType;
  stat_type: StatType;
  n_items: number;
  true_value: number;
  response_value: number;
  signed_error: number;    // response - trueValue
  absolute_error: number;  // |response - trueValue|
  reaction_time_ms: number;
  is_practice: boolean;
}

export interface RecognitionResult {
  session_id: string;
  participant_name?: string;
  trial_type: 'recognition';
  trial_number: number;
  stimulus_type: StimulusType;
  probe_value: number;
  probe_is_target: boolean;
  response_yes: boolean;   // true = participant said "yes, saw it"
  is_correct: boolean;
  reaction_time_ms: number;
}

export type TrialResult = EnsembleResult | RecognitionResult;

// ──────────────────────────────────────────────
// Summary stats for results pages
// ──────────────────────────────────────────────

export interface EnsembleSummary {
  byType: Record<StimulusType, { meanAbsError: number; count: number }>;
  byStat: Record<StatType, { meanAbsError: number; count: number }>;
  bySetSize: { setSize: number; meanAbsError: number; count: number }[];
  overallMeanAbsError: number;
}

export interface RecognitionSummary {
  byType: Record<StimulusType, { accuracy: number; hitRate: number; faRate: number; count: number }>;
  overallAccuracy: number;
  overallHitRate: number;
  overallFARate: number;
}

export interface SessionSummary {
  ensemble: EnsembleSummary;
  recognition: RecognitionSummary;
}

// For storing seen arrays (used to generate recognition probes)
export interface SeenArray {
  trialId: number;
  stimulusType: StimulusType;
  items: ArrayItem[];
}
