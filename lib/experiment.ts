import { Trial, COLORS, WORDS, PRACTICE_WORDS, ColorKey } from '@/types';

const COLOR_KEYS: ColorKey[] = ['red', 'green', 'yellow'];

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function createTrial(
  id: number,
  wordText: string,
  colorName: ColorKey
): Trial {
  // Determine if congruent: only English color words can be congruent
  const isCongruent = wordText === colorName;

  return {
    id,
    wordText,
    fontColor: COLORS[colorName].hex,
    colorName,
    isCongruent,
  };
}

export function generatePracticeTrials(): Trial[] {
  return PRACTICE_WORDS.map((item, index) =>
    createTrial(index, item.word, item.color)
  );
}

export function generateTrials(): Trial[] {
  const trials: Trial[] = [];

  // Generate all combinations: 12 words × 3 colors = 36 trials
  WORDS.forEach((word) => {
    COLOR_KEYS.forEach((color) => {
      trials.push(createTrial(trials.length, word, color));
    });
  });

  // Shuffle and reassign IDs
  const shuffled = shuffleArray(trials);
  return shuffled.map((trial, index) => ({ ...trial, id: index }));
}

export function getColorFromKey(key: string): ColorKey | null {
  const keyLower = key.toLowerCase();
  if (keyLower === 'r') return 'red';
  if (keyLower === 'g') return 'green';
  if (keyLower === 'y') return 'yellow';
  return null;
}

export function isCorrectResponse(trial: Trial, response: ColorKey): boolean {
  return trial.colorName === response;
}
