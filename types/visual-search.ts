export type SearchType = 'feature' | 'conjunction';

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
  searchType: SearchType;
  setSize: 8 | 16 | 24;
  targetPresent: boolean;
  items: SearchItem[];
  isPractice: boolean;
}

export interface VisualSearchResult {
  id?: string;
  session_id: string;
  participant_name?: string;
  trial_number: number;
  block: string;
  set_size: number;
  target_present: boolean;
  response: string;
  correct: boolean;
  rt_ms: number;
  is_practice: boolean;
  created_at?: string;
}
