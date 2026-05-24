import { StudyWord, DistractorProblem } from '@/types/serial-order';

export const FIXATION_MS = 500;
export const WORD_DISPLAY_MS = 2000;
export const BLANK_MS = 500;
export const DISTRACTOR_DURATION_MS = 25000;
export const RECALL_DURATION_MS = 120000;

export const STUDY_LIST: StudyWord[] = [
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
  { serial_position: 21, word: 'מנוע' },
  { serial_position: 22, word: 'פרח' },
  { serial_position: 23, word: 'אי' },
  { serial_position: 24, word: 'שעון' },
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
