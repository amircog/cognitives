// Mental Representation Experiment Type Definitions
// Combines Mental Scanning (Kosslyn) and Mental Rotation (Shepard & Metzler)

// ============ MENTAL SCANNING TYPES ============

export interface Landmark {
  id: string;
  name: string;
  nameHe: string;
  x: number; // Position on map (0-100 scale)
  y: number;
}

export interface ScanningTrial {
  id: number;
  fromLandmark: Landmark;
  toLandmark: Landmark;
  distance: number; // Euclidean distance between landmarks
}

export interface ScanningTrialResult {
  id?: string;
  session_id: string;
  participant_name?: string;
  experiment_type: 'scanning';
  trial_number: number;
  from_landmark: string;
  to_landmark: string;
  distance: number;
  found_target: boolean;
  reaction_time_ms: number;
  created_at?: string;
}

// ============ MENTAL ROTATION TYPES ============

export interface RotationFigure {
  id: string;
  baseImage: string; // Path to base image
  rotatedImages: { [angle: number]: string }; // angle -> path
}

export interface RotationTrial {
  id: number;
  figureId: string;
  leftAngle: number;
  rightAngle: number;
  isSame: boolean; // Whether figures are same (vs mirror)
  rotationDifference: number; // Angular difference
  isPractice: boolean;
}

export interface RotationTrialResult {
  id?: string;
  session_id: string;
  participant_name?: string;
  experiment_type: 'rotation';
  trial_number: number;
  figure_id: string;
  left_angle: number;
  right_angle: number;
  is_same: boolean;
  rotation_difference: number;
  response: 'same' | 'different';
  is_correct: boolean;
  reaction_time_ms: number;
  is_practice: boolean;
  created_at?: string;
}

// ============ COMBINED TYPES ============

export type TrialResult = ScanningTrialResult | RotationTrialResult;

export interface ScanningStats {
  totalTrials: number;
  correctTrials: number;
  accuracy: number;
  meanRT: number;
  rtByDistance: { distance: number; meanRT: number }[];
  correlation: number; // Correlation between distance and RT
}

export interface RotationStats {
  totalTrials: number;
  correctTrials: number;
  accuracy: number;
  meanRT: number;
  rtByAngle: { angle: number; meanRT: number }[];
  correlation: number; // Correlation between rotation angle and RT
}

export interface MentalRepSummary {
  scanning: ScanningStats;
  rotation: RotationStats;
}

// ============ EXPERIMENT PHASES ============

export type ExperimentPhase =
  | 'intro'
  | 'scanning-study'    // Map memorization
  | 'scanning-test'     // Mental scanning trials
  | 'rotation-practice' // Rotation practice with feedback
  | 'rotation-main'     // Main rotation experiment
  | 'results';

// ============ SESSION DATA ============

export interface SessionData {
  sessionId: string;
  participantName: string;
  language: 'en' | 'he';
  scanningResults: ScanningTrialResult[];
  rotationResults: RotationTrialResult[];
}
