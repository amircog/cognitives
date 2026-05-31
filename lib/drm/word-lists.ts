import { WordList, StudyTrial, TestItem } from '@/types/drm';

export const WORD_LISTS: WordList[] = [
  {
    theme: 'SLEEP',
    criticalLure: 'sleep',
    studyWords: [
      'bed', 'rest', 'awake', 'tired', 'dream',
      'wake', 'snooze', 'blanket', 'doze', 'slumber',
      'snore', 'nap',
    ],
  },
  {
    theme: 'CHAIR',
    criticalLure: 'chair',
    studyWords: [
      'table', 'sit', 'legs', 'seat', 'couch',
      'desk', 'recliner', 'sofa', 'wood', 'cushion',
      'swivel', 'stool',
    ],
  },
  {
    theme: 'MOUNTAIN',
    criticalLure: 'mountain',
    studyWords: [
      'hill', 'valley', 'climb', 'summit', 'top',
      'molehill', 'peak', 'plain', 'glacier', 'goat',
      'bike', 'climber',
    ],
  },
  {
    theme: 'NEEDLE',
    criticalLure: 'needle',
    studyWords: [
      'thread', 'pin', 'eye', 'sewing', 'sharp',
      'point', 'prick', 'thimble', 'haystack', 'thorn',
      'hurt', 'injection',
    ],
  },
  {
    theme: 'ROUGH',
    criticalLure: 'rough',
    studyWords: [
      'smooth', 'bumpy', 'road', 'tough', 'sandpaper',
      'jagged', 'ready', 'coarse', 'uneven', 'riders',
      'rugged', 'sand',
    ],
  },
  {
    theme: 'SWEET',
    criticalLure: 'sweet',
    studyWords: [
      'sour', 'candy', 'sugar', 'bitter', 'good',
      'taste', 'tooth', 'nice', 'honey', 'soda',
      'chocolate', 'heart',
    ],
  },
];

export const UNRELATED_FOILS = [
  'lamp', 'river', 'pencil', 'garden', 'bottle', 'music',
  'cloud', 'engine', 'silver', 'ocean', 'rabbit', 'camera',
  'flower', 'bridge', 'clock', 'paper', 'village', 'candle',
  'mirror', 'planet', 'kitchen', 'wallet', 'island', 'hammer',
];

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

  WORD_LISTS.forEach((list) => {
    list.studyWords.forEach((word, i) => {
      items.push({
        word,
        itemType: 'studied',
        listTheme: list.theme,
        serialPosition: i + 1,
      });
    });

    items.push({
      word: list.criticalLure,
      itemType: 'critical_lure',
      listTheme: list.theme,
    });
  });

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
