import { WordList, StudyTrial, TestItem } from '@/types/drm';

// Classic DRM word lists - 10 themes, 15 words each
// Each list is semantically related to a critical lure (not presented during study)

export const WORD_LISTS: WordList[] = [
  {
    theme: 'Sleep',
    themeHe: 'שינה',
    criticalLure: 'sleep',
    studyWords: [
      'bed', 'rest', 'awake', 'tired', 'dream',
      'wake', 'snooze', 'blanket', 'doze', 'slumber',
      'snore', 'nap', 'pillow', 'yawn', 'drowsy'
    ],
    relatedDistractors: ['peace', 'night', 'comfort', 'relax'],
    unrelatedDistractors: ['chair', 'pen', 'cup', 'door']
  },
  {
    theme: 'Doctor',
    themeHe: 'רופא',
    criticalLure: 'doctor',
    studyWords: [
      'nurse', 'sick', 'medicine', 'health', 'hospital',
      'dentist', 'physician', 'ill', 'patient', 'office',
      'stethoscope', 'surgeon', 'clinic', 'cure', 'therapy'
    ],
    relatedDistractors: ['medical', 'emergency', 'prescription', 'diagnosis'],
    unrelatedDistractors: ['book', 'tree', 'phone', 'shirt']
  },
  {
    theme: 'Chair',
    themeHe: 'כיסא',
    criticalLure: 'chair',
    studyWords: [
      'table', 'sit', 'legs', 'seat', 'couch',
      'desk', 'recliner', 'sofa', 'wood', 'cushion',
      'swivel', 'stool', 'bench', 'sitting', 'furniture'
    ],
    relatedDistractors: ['comfort', 'armrest', 'rocker', 'leather'],
    unrelatedDistractors: ['cloud', 'fish', 'lamp', 'music']
  },
  {
    theme: 'Sweet',
    themeHe: 'מתוק',
    criticalLure: 'sweet',
    studyWords: [
      'sour', 'candy', 'sugar', 'bitter', 'good',
      'taste', 'tooth', 'nice', 'honey', 'soda',
      'chocolate', 'cake', 'dessert', 'flavor', 'syrup'
    ],
    relatedDistractors: ['delicious', 'pie', 'cookie', 'cream'],
    unrelatedDistractors: ['stone', 'paper', 'wind', 'road']
  },
  {
    theme: 'Mountain',
    themeHe: 'הר',
    criticalLure: 'mountain',
    studyWords: [
      'hill', 'valley', 'climb', 'summit', 'top',
      'molehill', 'peak', 'range', 'altitude', 'high',
      'cliff', 'steep', 'slope', 'snow', 'hike'
    ],
    relatedDistractors: ['Everest', 'elevation', 'ridge', 'alps'],
    unrelatedDistractors: ['keyboard', 'mirror', 'towel', 'coin']
  },
  {
    theme: 'Needle',
    themeHe: 'מחט',
    criticalLure: 'needle',
    studyWords: [
      'thread', 'pin', 'eye', 'sewing', 'sharp',
      'point', 'prick', 'thimble', 'haystack', 'thorn',
      'hurt', 'injection', 'syringe', 'cloth', 'knitting'
    ],
    relatedDistractors: ['stitch', 'pierce', 'poke', 'painful'],
    unrelatedDistractors: ['window', 'orange', 'grass', 'wheel']
  },
  {
    theme: 'Smoke',
    themeHe: 'עשן',
    criticalLure: 'smoke',
    studyWords: [
      'cigarette', 'puff', 'blaze', 'billows', 'pollution',
      'ashes', 'cigar', 'chimney', 'fire', 'tobacco',
      'stink', 'pipe', 'lungs', 'cancer', 'inhale'
    ],
    relatedDistractors: ['fumes', 'vapor', 'smolder', 'fog'],
    unrelatedDistractors: ['pencil', 'desk', 'hat', 'boot']
  },
  {
    theme: 'Cold',
    themeHe: 'קר',
    criticalLure: 'cold',
    studyWords: [
      'hot', 'snow', 'warm', 'winter', 'ice',
      'wet', 'frigid', 'chilly', 'heat', 'weather',
      'freeze', 'air', 'shiver', 'arctic', 'frost'
    ],
    relatedDistractors: ['glacier', 'icy', 'chill', 'freezing'],
    unrelatedDistractors: ['notebook', 'picture', 'scissors', 'balloon']
  },
  {
    theme: 'Slow',
    themeHe: 'איטי',
    criticalLure: 'slow',
    studyWords: [
      'fast', 'lethargic', 'stop', 'listless', 'snail',
      'sluggish', 'delay', 'traffic', 'turtle', 'speed',
      'quick', 'pace', 'crawl', 'gradual', 'lag'
    ],
    relatedDistractors: ['leisurely', 'dawdle', 'tardy', 'unhurried'],
    unrelatedDistractors: ['flower', 'bottle', 'brush', 'candle']
  },
  {
    theme: 'Music',
    themeHe: 'מוזיקה',
    criticalLure: 'music',
    studyWords: [
      'note', 'sound', 'piano', 'sing', 'radio',
      'band', 'melody', 'horn', 'concert', 'instrument',
      'symphony', 'jazz', 'orchestra', 'art', 'rhythm'
    ],
    relatedDistractors: ['tune', 'harmony', 'song', 'composer'],
    unrelatedDistractors: ['rock', 'leaf', 'soap', 'nail']
  }
];

// Get all study words across all lists (for the study phase)
export function getAllStudyWords(): StudyTrial[] {
  const allWords: StudyTrial[] = [];

  WORD_LISTS.forEach((list) => {
    list.studyWords.forEach((word, index) => {
      allWords.push({
        word,
        listTheme: list.theme,
        position: index + 1
      });
    });
  });

  // Shuffle to present words from different lists intermixed
  return shuffleArray(allWords);
}

// Get test items (studied + critical lures + distractors)
export function getTestItems(): TestItem[] {
  const testItems: TestItem[] = [];

  WORD_LISTS.forEach((list) => {
    // Add 3 studied words from each list (randomly selected, preserving serial position)
    const wordsWithPositions = list.studyWords.map((word, index) => ({ word, position: index + 1 }));
    const studiedSample = shuffleArray(wordsWithPositions).slice(0, 3);
    studiedSample.forEach(({ word, position }) => {
      testItems.push({
        word,
        itemType: 'studied',
        listTheme: list.theme,
        serialPosition: position
      });
    });

    // Add critical lure
    testItems.push({
      word: list.criticalLure,
      itemType: 'critical_lure',
      listTheme: list.theme
    });

    // Add 1 related distractor
    testItems.push({
      word: list.relatedDistractors[0],
      itemType: 'related_distractor',
      listTheme: list.theme
    });

    // Add 1 unrelated distractor
    testItems.push({
      word: list.unrelatedDistractors[0],
      itemType: 'unrelated_distractor',
      listTheme: list.theme
    });
  });

  // Shuffle test items
  return shuffleArray(testItems);
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
