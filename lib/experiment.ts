import { Trial, COLORS, WORDS, ColorKey } from '@/types';

const TOTAL_TRIALS = 20;

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
  wordText: ColorKey,
  colorName: ColorKey
): Trial {
  return {
    id,
    wordText,
    fontColor: COLORS[colorName].hex,
    colorName,
    isCongruent: wordText === colorName,
  };
}

export function generateTrials(): Trial[] {
  const trials: Trial[] = [];
  const halfTrials = Math.floor(TOTAL_TRIALS / 2);

  // Generate congruent trials (word matches color)
  for (let i = 0; i < halfTrials; i++) {
    const word = WORDS[i % WORDS.length];
    trials.push(createTrial(trials.length, word, word));
  }

  // Generate incongruent trials (word doesn't match color)
  for (let i = 0; i < TOTAL_TRIALS - halfTrials; i++) {
    const word = WORDS[i % WORDS.length];
    // Pick a different color than the word
    const otherColors = WORDS.filter((w) => w !== word);
    const color = otherColors[i % otherColors.length];
    trials.push(createTrial(trials.length, word, color));
  }

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
