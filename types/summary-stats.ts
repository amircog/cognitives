// Summary Statistics / Ensemble Perception Experiment
// Based on Ariely (2001), Chong & Treisman (2003), Alvarez (2011)

export type StimulusType = 'circles' | 'line-lengths' | 'line-orientations';
export type StatType = 'mean' | 'max' | 'min';
export type TrialType = 'ensemble' | 'recognition' | '2afc';

// A single item in a stimulus array
export interface ArrayItem {
  id: number;
  x: number;   // center x in SVG coordinate space (0–500)
  y: number;   // center y in SVG coordinate space (0–500)
  value: number; // radius (circles), length in px (lines), degrees (orientations)
}

// ──────────────────────────────────────────────
// Trial types – all include items so display is within-trial
// ──────────────────────────────────────────────

// Ensemble: show array → report summary stat via slider
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
  items: ArrayItem[];   // the array shown before the probe
  nItems: number;
  probeValue: number;
  probeIsTarget: boolean;  // true = item was in the array; false = foil
}

// 2AFC: show array → show two options → "which was the [mean/max/min]?"
export interface TwoAFCTrial {
  trialId: number;
  type: '2afc';
  stimulusType: StimulusType;
  statType: StatType;
  items: ArrayItem[];
  nItems: number;
  trueValue: number;   // the correct option value
  foilValue: number;   // the wrong option value
  correctIsA: boolean; // true = left option is correct
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
  probe_value: number;
  probe_is_target: boolean;
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
  stat_type: StatType;
  n_items: number;
  true_value: number;
  foil_value: number;
  correct_is_a: boolean;
  chose_a: boolean;
  is_correct: boolean;
  reaction_time_ms: number;
}

export type TrialResult = EnsembleResult | RecognitionResult | TwoAFCResult;

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

export interface TwoAFCSummary {
  byType: Record<StimulusType, { accuracy: number; count: number }>;
  overallAccuracy: number;
}

export interface SessionSummary {
  ensemble: EnsembleSummary;
  recognition: RecognitionSummary;
  twoAFC: TwoAFCSummary;
}

// For the old API (SeenArray) – kept for backward compatibility but unused in new flow
export interface SeenArray {
  trialId: number;
  stimulusType: StimulusType;
  items: ArrayItem[];
}
