export type TargetSetSize = 1 | 2 | 4 | 8;
export type DistractorSetSize = 1 | 2 | 4 | 8;

export interface SearchItem {
  x: number;
  y: number;
  letter: 'T' | 'L';
  color: 'red' | 'blue';
  rotation: 0 | 90 | 180 | 270;
  isTarget: boolean;
}

export interface VisualSearchTrial {
  id: number;
  targetSetSize: TargetSetSize;
  distractorSetSize: DistractorSetSize;
  targetPresent: boolean;
  targetColor: 'red' | 'blue';
  distractorColor: 'red' | 'blue';
  items: SearchItem[];
  isPractice: boolean;
}

export interface VisualSearchResult {
  id?: string;
  session_id: string;
  participant_name?: string;
  trial_number: number;
  target_set_size: number;
  distractor_set_size: number;
  target_present: boolean;
  target_color: string;
  response: string;
  correct: boolean;
  rt_ms: number;
  target_distance_from_center: number | null;
  is_practice: boolean;
  created_at?: string;
}
