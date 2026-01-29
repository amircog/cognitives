import { WordList, StudyTrial, TestItem } from '@/types/drm';

// DRM word lists - 6 themes, 12 Hebrew words each
// Each list is semantically related to a critical lure (not presented during study)

export const WORD_LISTS: WordList[] = [
  {
    theme: 'Sleep',
    themeHe: 'שינה',
    criticalLure: 'שינה',
    studyWords: [
      'מיטה', 'מנוחה', 'ער', 'עייף', 'חלום',
      'להתעורר', 'לנמנם', 'שמיכה', 'כרית', 'לישון',
      'לפהק', 'מנומנם'
    ],
    relatedDistractors: ['שקט', 'לילה', 'נוח', 'להירגע'],
    unrelatedDistractors: [] // Will be populated with unrelated words from other lists
  },
  {
    theme: 'Doctor',
    themeHe: 'רופא',
    criticalLure: 'רופא',
    studyWords: [
      'אחות', 'חולה', 'תרופה', 'בריאות', 'בית חולים',
      'רופא שיניים', 'מחלה', 'מרפאה', 'סטטוסקופ',
      'טיפול', 'מרשם', 'מזרק'
    ],
    relatedDistractors: ['רפואי', 'חירום', 'אבחנה', 'ניתוח'],
    unrelatedDistractors: []
  },
  {
    theme: 'Chair',
    themeHe: 'כיסא',
    criticalLure: 'כיסא',
    studyWords: [
      'שולחן', 'לשבת', 'רגליים', 'מושב', 'ספה',
      'שולחן כתיבה', 'כורסה', 'עץ', 'כרית',
      'שרפרף', 'ספסל', 'רהיט'
    ],
    relatedDistractors: ['נוחות', 'משענת', 'עור', 'ריפוד'],
    unrelatedDistractors: []
  },
  {
    theme: 'Sweet',
    themeHe: 'מתוק',
    criticalLure: 'מתוק',
    studyWords: [
      'חמוץ', 'סוכריה', 'סוכר', 'מר', 'טעים',
      'טעם', 'שן', 'דבש', 'משקה',
      'שוקולד', 'עוגה', 'קינוח'
    ],
    relatedDistractors: ['מעדן', 'פאי', 'עוגיה', 'קרם'],
    unrelatedDistractors: []
  },
  {
    theme: 'Mountain',
    themeHe: 'הר',
    criticalLure: 'הר',
    studyWords: [
      'גבעה', 'עמק', 'לטפס', 'פסגה', 'ראש',
      'גבוה', 'צוק', 'תלול', 'מדרון', 'שלג',
      'גובה', 'נוף'
    ],
    relatedDistractors: ['אוורסט', 'רום', 'הרים', 'אלפים'],
    unrelatedDistractors: []
  },
  {
    theme: 'Cold',
    themeHe: 'קר',
    criticalLure: 'קר',
    studyWords: [
      'חם', 'שלג', 'חמים', 'חורף', 'קרח',
      'רטוב', 'קפוא', 'צונן', 'מזג אויר',
      'להקפיא', 'לרעוד', 'כפור'
    ],
    relatedDistractors: ['קרחון', 'קפוא', 'צינה', 'הקפאה'],
    unrelatedDistractors: []
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

// Get test items (studied + critical lures + unrelated distractors)
export function getTestItems(): TestItem[] {
  const testItems: TestItem[] = [];

  WORD_LISTS.forEach((list) => {
    // Add 2 words from early positions (1-4)
    const earlyWords = list.studyWords.slice(0, 4).map((word, index) => ({ word, position: index + 1 }));
    const selectedEarly = shuffleArray(earlyWords).slice(0, 2);
    selectedEarly.forEach(({ word, position }) => {
      testItems.push({
        word,
        itemType: 'studied',
        listTheme: list.theme,
        serialPosition: position
      });
    });

    // Add 2 words from middle positions (5-8)
    const middleWords = list.studyWords.slice(4, 8).map((word, index) => ({ word, position: index + 5 }));
    const selectedMiddle = shuffleArray(middleWords).slice(0, 2);
    selectedMiddle.forEach(({ word, position }) => {
      testItems.push({
        word,
        itemType: 'studied',
        listTheme: list.theme,
        serialPosition: position
      });
    });

    // Add 2 words from late positions (9-12)
    const lateWords = list.studyWords.slice(8, 12).map((word, index) => ({ word, position: index + 9 }));
    const selectedLate = shuffleArray(lateWords).slice(0, 2);
    selectedLate.forEach(({ word, position }) => {
      testItems.push({
        word,
        itemType: 'studied',
        listTheme: list.theme,
        serialPosition: position
      });
    });

    // Add critical lure (the non-presented word)
    testItems.push({
      word: list.criticalLure,
      itemType: 'critical_lure',
      listTheme: list.theme
    });
  });

  // Add 7 unrelated distractors per list (42 total)
  // These are words not in ANY list
  const unrelatedWords = [
    'כדור', 'עט', 'ספר', 'דלת', 'חלון',
    'פרח', 'בקבוק', 'מברשת', 'נר', 'מראה',
    'מגבת', 'מטבע', 'מקלדת', 'תמונה', 'מספריים',
    'בלון', 'אבן', 'נייר', 'רוח', 'כביש',
    'דשא', 'גלגל', 'תפוז', 'סבון', 'מסמר',
    'עלה', 'סלע', 'ענן', 'דג', 'מנורה',
    'מוזיקה', 'טלפון', 'חולצה', 'עץ', 'כובע',
    'מגף', 'מחברת', 'עיפרון', 'שעון', 'מפתח',
    'תיק', 'משקפיים'
  ];

  // Add 7 unrelated words per list (total 42)
  const shuffledUnrelated = shuffleArray(unrelatedWords);
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 7; j++) {
      const word = shuffledUnrelated[i * 7 + j];
      testItems.push({
        word,
        itemType: 'unrelated_distractor',
        listTheme: WORD_LISTS[i].theme
      });
    }
  }

  // Shuffle all test items
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
