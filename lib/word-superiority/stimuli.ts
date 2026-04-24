import { Condition, Trial } from '@/types/word-superiority';

// ── Stimulus pairs ────────────────────────────────────────────────────────────
// Each pair: letter1/letter2 differ at string index 2 (3rd letter, RTL position 3).
// word1 contains letter1 at index 2; word2 contains letter2 at index 2.

interface Pair { letter1: string; letter2: string; word1: string; word2: string; }

export const WORD_PAIRS: Pair[] = [
  { letter1: 'ד', letter2: 'ר', word1: 'אחד', word2: 'אחר' },
  { letter1: 'ד', letter2: 'ר', word1: 'כבד', word2: 'כבר' },
  { letter1: 'ד', letter2: 'ר', word1: 'עוד', word2: 'עור' },
  { letter1: 'ד', letter2: 'ר', word1: 'עבד', word2: 'עבר' },
  { letter1: 'ח', letter2: 'ה', word1: 'לוח', word2: 'לוה' },
  { letter1: 'ח', letter2: 'ה', word1: 'פרח', word2: 'פרה' },
  { letter1: 'ח', letter2: 'ה', word1: 'נוח', word2: 'נוה' },
  { letter1: 'ב', letter2: 'ך', word1: 'ערב', word2: 'ערך' },
  { letter1: 'ב', letter2: 'ך', word1: 'חשב', word2: 'חשך' },
  { letter1: 'ת', letter2: 'ח', word1: 'שבת', word2: 'שבח' },
  { letter1: 'ר', letter2: 'ק', word1: 'ספר', word2: 'ספק' },
  { letter1: 'ג', letter2: 'ז', word1: 'ארג', word2: 'ארז' },
  { letter1: 'ר', letter2: 'נ', word1: 'מורה', word2: 'מונה' },
  { letter1: 'ת', letter2: 'נ', word1: 'כיתה', word2: 'כינה' },
  { letter1: 'ט', letter2: 'ד', word1: 'חיטה', word2: 'חידה' },
  { letter1: 'ט', letter2: 'ל', word1: 'מיטה', word2: 'מילה' },
  { letter1: 'ב', letter2: 'ל', word1: 'חובה', word2: 'חולה' },
  { letter1: 'ר', letter2: 'פ', word1: 'קורה', word2: 'קופה' },
  { letter1: 'מ', letter2: 'כ', word1: 'שומר', word2: 'שוכר' },
  { letter1: 'מ', letter2: 'ח', word1: 'דומה', word2: 'דוחה' },
  { letter1: 'מ', letter2: 'נ', word1: 'קומה', word2: 'קונה' },
  { letter1: 'ט', letter2: 'ח', word1: 'שיטה', word2: 'שיחה' },
  { letter1: 'נ', letter2: 'ד', word1: 'צינה', word2: 'צידה' },
  { letter1: 'ר', letter2: 'נ', word1: 'שורה', word2: 'שונה' },
];

export const NONWORD_PAIRS: Pair[] = [
  { letter1: 'ד', letter2: 'ר', word1: 'כודג', word2: 'כורג' },
  { letter1: 'ד', letter2: 'ר', word1: 'תידצ', word2: 'תירצ' },
  { letter1: 'ד', letter2: 'ר', word1: 'לודט', word2: 'לורט' },
  { letter1: 'ד', letter2: 'ר', word1: 'נידג', word2: 'נירג' },
  { letter1: 'ח', letter2: 'ה', word1: 'פוחס', word2: 'פוהס' },
  { letter1: 'ח', letter2: 'ה', word1: 'זיחג', word2: 'זיהג' },
  { letter1: 'ח', letter2: 'ה', word1: 'תוחק', word2: 'תוהק' },
  { letter1: 'ב', letter2: 'ך', word1: 'זולב', word2: 'זולך' },
  { letter1: 'ב', letter2: 'ך', word1: 'תירב', word2: 'תירך' },
  { letter1: 'ת', letter2: 'ח', word1: 'כיתג', word2: 'כיחג' },
  { letter1: 'ר', letter2: 'ק', word1: 'נירג', word2: 'ניקג' },
  { letter1: 'ג', letter2: 'ז', word1: 'תוגק', word2: 'תוזק' },
  { letter1: 'ר', letter2: 'נ', word1: 'טורק', word2: 'טונק' },
  { letter1: 'ת', letter2: 'נ', word1: 'ליתג', word2: 'לינג' },
  { letter1: 'ט', letter2: 'ד', word1: 'זיטק', word2: 'זידק' },
  { letter1: 'ט', letter2: 'ל', word1: 'ריטג', word2: 'רילג' },
  { letter1: 'ב', letter2: 'ל', word1: 'זובק', word2: 'זולק' },
  { letter1: 'ר', letter2: 'פ', word1: 'לורג', word2: 'לופג' },
  { letter1: 'מ', letter2: 'כ', word1: 'גומש', word2: 'גוכש' },
  { letter1: 'מ', letter2: 'ח', word1: 'תומק', word2: 'תוחק' },
  { letter1: 'מ', letter2: 'נ', word1: 'פומג', word2: 'פונג' },
  { letter1: 'ט', letter2: 'ח', word1: 'ניטס', word2: 'ניחס' },
  { letter1: 'נ', letter2: 'ד', word1: 'לינג', word2: 'לידג' },
  { letter1: 'ר', letter2: 'נ', word1: 'פורק', word2: 'פונק' },
];

// TARGET_IDX: index 2 in the string = 3rd letter = position 3 from the right in RTL reading
export const TARGET_IDX = 2;

// ── Helpers ──────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function sample<T>(arr: T[], n: number): T[] {
  return shuffle(arr).slice(0, n);
}

function makeTrial(
  condition: Condition,
  pair: Pair,
  isPractice: boolean,
): Trial {
  // Randomly pick word1 or word2 as the shown stimulus
  const showFirst = Math.random() < 0.5;
  const shownWord  = showFirst ? pair.word1 : pair.word2;
  const correctLet = showFirst ? pair.letter1 : pair.letter2;
  const foilLet    = showFirst ? pair.letter2 : pair.letter1;

  let stimulus: string;
  if (condition === 'word') {
    stimulus = shownWord;
  } else if (condition === 'pseudoword') {
    stimulus = shownWord; // nonword pair word
  } else {
    // single-letter: blanks except at TARGET_IDX
    const len = pair.word1.length;
    stimulus = Array.from({ length: len }, (_, i) => i === TARGET_IDX ? correctLet : '_').join('');
  }

  return {
    condition,
    stimulus,
    correctLetter: correctLet,
    foilLetter: foilLet,
    wordLength: pair.word1.length,
    isPractice,
  };
}

// ── Practice: 6 trials, 2 per condition ──────────────────────────────────────
// Uses last 4 pairs of each sheet (indices 20-23) to avoid overlap with main.

export function generatePracticeTrials(): Trial[] {
  const wPairs  = WORD_PAIRS.slice(20, 24);
  const nwPairs = NONWORD_PAIRS.slice(20, 24);

  const trials: Trial[] = [
    makeTrial('word',          wPairs[0],  true),
    makeTrial('word',          wPairs[1],  true),
    makeTrial('pseudoword',    nwPairs[0], true),
    makeTrial('pseudoword',    nwPairs[1], true),
    makeTrial('single-letter', wPairs[2],  true),
    makeTrial('single-letter', wPairs[3],  true),
  ];
  return shuffle(trials);
}

// ── Main: 60 trials = 20 per condition ───────────────────────────────────────
// Words and single-letter use word pairs (indices 0-19 shuffled).
// Pseudowords use nonword pairs (indices 0-19 shuffled).

export function generateMainTrials(): Trial[] {
  const wordSample   = sample(WORD_PAIRS.slice(0, 20), 20);
  const nwSample     = sample(NONWORD_PAIRS.slice(0, 20), 20);
  const slSample     = sample(WORD_PAIRS.slice(0, 20), 20); // same letters, single-letter display

  const trials: Trial[] = [
    ...wordSample.map(p => makeTrial('word',          p, false)),
    ...nwSample.map(p   => makeTrial('pseudoword',    p, false)),
    ...slSample.map(p   => makeTrial('single-letter', p, false)),
  ];
  return shuffle(trials);
}

export const CONDITION_LABELS: Record<Condition, { en: string; he: string }> = {
  'word':          { en: 'Word',         he: 'מילה' },
  'pseudoword':    { en: 'Pseudoword',   he: 'מילת תפל' },
  'single-letter': { en: 'Single Letter', he: 'אות בודדת' },
};

export const DISPLAY_MS  = 150; // stimulus duration in ms
export const MASK_MS     = 500;
export const FIXATION_MS = 500;
