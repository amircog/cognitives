import { StudyWord, DistractorProblem } from '@/types/serial-order';

export const FIXATION_MS = 500;
export const WORD_DISPLAY_MS = 2000;
export const BLANK_MS = 500;
export const DISTRACTOR_DURATION_MS = 150000; // 2.5 minutes
export const RECALL_DURATION_MS = 120000;

export const STUDY_LIST_1: StudyWord[] = [
  { serial_position: 1, word: 'סולם' },
  { serial_position: 2, word: 'תפוז' },
  { serial_position: 3, word: 'מראה' },
  { serial_position: 4, word: 'נהר' },
  { serial_position: 5, word: 'עיפרון' },
  { serial_position: 6, word: 'מעיל' },
  { serial_position: 7, word: 'יער' },
  { serial_position: 8, word: 'כפית' },
  { serial_position: 9, word: 'אופניים' },
  { serial_position: 10, word: 'ענן' },
  { serial_position: 11, word: 'שטיח' },
  { serial_position: 12, word: 'בקבוק' },
  { serial_position: 13, word: 'הר' },
  { serial_position: 14, word: 'מלח' },
  { serial_position: 15, word: 'פסנתר' },
  { serial_position: 16, word: 'חלון' },
  { serial_position: 17, word: 'נר' },
  { serial_position: 18, word: 'גינה' },
  { serial_position: 19, word: 'קסדה' },
  { serial_position: 20, word: 'סל' },
];

export const STUDY_LIST_2: StudyWord[] = [
  { serial_position: 1, word: 'כיסא' },
  { serial_position: 2, word: 'לימון' },
  { serial_position: 3, word: 'גשר' },
  { serial_position: 4, word: 'מברשת' },
  { serial_position: 5, word: 'כוכב' },
  { serial_position: 6, word: 'ארנק' },
  { serial_position: 7, word: 'דג' },
  { serial_position: 8, word: 'מטריה' },
  { serial_position: 9, word: 'תמונה' },
  { serial_position: 10, word: 'כפפה' },
  { serial_position: 11, word: 'ספר' },
  { serial_position: 12, word: 'מזלג' },
  { serial_position: 13, word: 'ירח' },
  { serial_position: 14, word: 'חגורה' },
  { serial_position: 15, word: 'דלת' },
  { serial_position: 16, word: 'עוגה' },
  { serial_position: 17, word: 'כרית' },
  { serial_position: 18, word: 'שמש' },
  { serial_position: 19, word: 'מפתח' },
  { serial_position: 20, word: 'צלחת' },
];

export function generateArithmeticProblem(): DistractorProblem {
  const ops = ['+', '-', '×'] as const;
  const op = ops[Math.floor(Math.random() * ops.length)];
  let a = 0, b = 0, answer = 0;

  switch (op) {
    case '+':
      a = Math.floor(Math.random() * 80) + 10;
      b = Math.floor(Math.random() * 40) + 5;
      answer = a + b;
      break;
    case '-':
      a = Math.floor(Math.random() * 70) + 20;
      b = Math.floor(Math.random() * (a - 5)) + 5;
      answer = a - b;
      break;
    case '×':
      a = Math.floor(Math.random() * 9) + 2;
      b = Math.floor(Math.random() * 9) + 2;
      answer = a * b;
      break;
  }

  return { problem: `${a} ${op} ${b}`, correct_answer: answer };
}

export function matchResponse(response: string, studyList: StudyWord[]): StudyWord | null {
  const clean = response.trim();
  if (!clean) return null;
  return studyList.find(w => w.word === clean) ?? null;
}
