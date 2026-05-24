export interface StudyWord {
  serial_position: number;
  word: string;
}

export interface DistractorProblem {
  problem: string;
  correct_answer: number;
}

export interface DistractorResult {
  session_id: string;
  participant_name: string | null;
  problem: string;
  correct_answer: number;
  participant_answer: number | null;
  accuracy: boolean;
  reaction_time_ms: number;
  onset_time: string;
}

export interface RecallResponse {
  session_id: string;
  participant_name: string | null;
  session_number: number;
  output_position: number;
  response_raw: string;
  response_clean: string;
  matched_word: string | null;
  matched_serial_position: number | null;
  is_correct_recall: boolean;
  is_repetition: boolean;
  recall_submission_time: string;
}

export interface StudyEvent {
  session_id: string;
  participant_name: string | null;
  session_number: number;
  serial_position: number;
  word: string;
  word_onset_time: string;
  word_offset_time: string;
}
