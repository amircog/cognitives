import { WordList, StudyTrial, TestItem } from '@/types/drm';

export const WORD_LISTS: WordList[] = [
  {
    theme: 'SLEEP',
    criticalLure: 'sleep',
    studyWords: [
      'bed', 'rest', 'awake', 'tired', 'dream',
      'wake', 'snore', 'nap', 'pillow', 'yawn',
    ],
  },
  {
    theme: 'CHAIR',
    criticalLure: 'chair',
    studyWords: [
      'table', 'sit', 'legs', 'seat', 'couch',
      'desk', 'sofa', 'wood', 'bench', 'stool',
    ],
  },
  {
    theme: 'NEEDLE',
    criticalLure: 'needle',
    studyWords: [
      'thread', 'pin', 'eye', 'sewing', 'sharp',
      'point', 'hurt', 'injection', 'hole', 'knit',
    ],
  },
  {
    theme: 'SWEET',
    criticalLure: 'sweet',
    studyWords: [
      'sour', 'candy', 'sugar', 'bitter', 'good',
      'taste', 'honey', 'cake', 'nice', 'pie',
    ],
  },
  {
    theme: 'ROUGH',
    criticalLure: 'rough',
    studyWords: [
      'smooth', 'bumpy', 'road', 'tough', 'hard',
      'sand', 'flat', 'stone', 'ground', 'rocky',
    ],
  },
];

export const UNRELATED_FOILS = [
  'lamp', 'river', 'pencil', 'garden', 'bottle',
  'music', 'cloud', 'silver', 'ocean', 'rabbit',
  'camera', 'flower', 'bridge', 'clock', 'paper',
  'candle', 'mirror', 'planet', 'kitchen', 'wallet',
  'island', 'hammer', 'window', 'bird', 'train',
];

export const WORDS_PER_LIST = 10;
export const WORD_DISPLAY_MS = 2000;
export const ISI_MS = 250;
export const LIST_INTRO_MS = 2000;
export const DISTRACTOR_DURATION_MS = 30_000;
export const RECALL_DURATION_MS = 90_000;
export const BREAK_DURATION_MS = 3000;

export function getStudyWordsForList(listIndex: number): StudyTrial[] {
  const list = WORD_LISTS[listIndex];
  return list.studyWords.map((word, i) => ({
    word,
    listTheme: list.theme,
    position: i + 1,
  }));
}

export function getTestItems(): TestItem[] {
  const items: TestItem[] = [];

  // 20 studied words: 2 per serial position (each from a different list)
  for (let pos = 1; pos <= WORDS_PER_LIST; pos++) {
    const listIndices = shuffleArray([...Array(WORD_LISTS.length).keys()]);
    const picked = listIndices.slice(0, 2);
    for (const li of picked) {
      const list = WORD_LISTS[li];
      items.push({
        word: list.studyWords[pos - 1],
        itemType: 'studied',
        listTheme: list.theme,
        serialPosition: pos,
      });
    }
  }

  // 5 critical lures (one per list)
  WORD_LISTS.forEach((list) => {
    items.push({
      word: list.criticalLure,
      itemType: 'critical_lure',
      listTheme: list.theme,
    });
  });

  // 25 unrelated foils
  UNRELATED_FOILS.forEach((word) => {
    items.push({
      word,
      itemType: 'unrelated_foil',
      listTheme: 'none',
    });
  });

  return constrainedShuffle(items);
}

function constrainedShuffle(items: TestItem[]): TestItem[] {
  for (let attempt = 0; attempt < 100; attempt++) {
    const shuffled = shuffleArray([...items]);
    if (isValidOrder(shuffled)) return shuffled;
  }
  return shuffleArray([...items]);
}

function isValidOrder(items: TestItem[]): boolean {
  let oldStreak = 0;
  let newStreak = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const isOld = item.itemType === 'studied';

    if (isOld) { oldStreak++; newStreak = 0; }
    else { newStreak++; oldStreak = 0; }

    if (oldStreak > 3 || newStreak > 3) return false;

    if (item.itemType === 'critical_lure') {
      let sameListBefore = 0;
      for (let j = Math.max(0, i - 3); j < i; j++) {
        if (items[j].listTheme === item.listTheme && items[j].itemType === 'studied') {
          sameListBefore++;
        }
      }
      if (sameListBefore >= 2) return false;
    }
  }
  return true;
}

export function scoreRecall(
  recalledWords: string[],
  listIndex: number,
  previousListIndices: number[]
): {
  correctCount: number;
  criticalLureRecalled: boolean;
  intrusionCount: number;
  priorListIntrusionCount: number;
} {
  const currentList = WORD_LISTS[listIndex];
  const currentStudyWords = new Set(currentList.studyWords.map(w => w.toLowerCase()));
  const lure = currentList.criticalLure.toLowerCase();

  const allPreviousWords = new Set<string>();
  const allPreviousLures = new Set<string>();
  for (const idx of previousListIndices) {
    WORD_LISTS[idx].studyWords.forEach(w => allPreviousWords.add(w.toLowerCase()));
    allPreviousLures.add(WORD_LISTS[idx].criticalLure.toLowerCase());
  }

  let correctCount = 0;
  let criticalLureRecalled = false;
  let intrusionCount = 0;
  let priorListIntrusionCount = 0;

  for (const word of recalledWords) {
    const w = word.toLowerCase().trim();
    if (!w) continue;

    if (currentStudyWords.has(w)) {
      correctCount++;
    } else if (w === lure) {
      criticalLureRecalled = true;
    } else if (allPreviousWords.has(w) || allPreviousLures.has(w)) {
      priorListIntrusionCount++;
    } else {
      intrusionCount++;
    }
  }

  return { correctCount, criticalLureRecalled, intrusionCount, priorListIntrusionCount };
}

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
