import { Condition, Trial } from '@/types/composite-face';

// ── Face pool ────────────────────────────────────────────────────────────────
// 52 distinct identities: c2_1_1..c2_1_26 (group 1) + c2_2_1..c2_2_26 (group 2)
// Practice uses c2_1_1..c2_1_4; main experiment uses the remaining 48.

export const CUT_FRAC = 0.55; // fraction from top where the face is cut (nose center)
export const FACE_SIZE = 240; // px — face display size

export const OFFSETS: Record<Condition, number> = {
  'aligned':          0,
  'small-misaligned': 0.08,
  'large-misaligned': 0.33,
};

const PRACTICE_FACES = [1, 2, 3, 4].map(n => `c2_1_${n}`);

const MAIN_FACES: string[] = [
  ...Array.from({ length: 22 }, (_, i) => `c2_1_${i + 5}`),  // c2_1_5..c2_1_26
  ...Array.from({ length: 26 }, (_, i) => `c2_2_${i + 1}`),  // c2_2_1..c2_2_26
]; // 48 faces

export function faceUrl(faceId: string): string {
  return `/faces/${faceId}.jpg`;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickOther(pool: string[], ...exclude: string[]): string {
  const candidates = pool.filter(x => !exclude.includes(x));
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function makeTrial(
  condition: Condition,
  isSame: boolean,
  pool: string[],
  isPractice: boolean,
): Trial {
  const studyId  = pool[Math.floor(Math.random() * pool.length)];
  const bottomId = pickOther(pool, studyId);
  const topId    = isSame ? studyId : pickOther(pool, studyId, bottomId);
  return {
    condition,
    studyFace:      faceUrl(studyId),
    testTopFace:    faceUrl(topId),
    testBottomFace: faceUrl(bottomId),
    isSame,
    isPractice,
  };
}

// ── Practice trials: 6 total (2 per condition, 1 same + 1 different each) ───

export function generatePracticeTrials(): Trial[] {
  const conditions: Condition[] = ['aligned', 'small-misaligned', 'large-misaligned'];
  const trials: Trial[] = [];
  for (const cond of conditions) {
    trials.push(makeTrial(cond, true,  PRACTICE_FACES, true));
    trials.push(makeTrial(cond, false, PRACTICE_FACES, true));
  }
  return shuffle(trials);
}

// ── Main trials: 40 total ─────────────────────────────────────────────────
// 20 aligned (10 same + 10 diff) + 10 small (5+5) + 10 large (5+5)

export function generateMainTrials(): Trial[] {
  const specs: Array<{ condition: Condition; isSame: boolean; count: number }> = [
    { condition: 'aligned',          isSame: true,  count: 10 },
    { condition: 'aligned',          isSame: false, count: 10 },
    { condition: 'small-misaligned', isSame: true,  count: 5  },
    { condition: 'small-misaligned', isSame: false, count: 5  },
    { condition: 'large-misaligned', isSame: true,  count: 5  },
    { condition: 'large-misaligned', isSame: false, count: 5  },
  ];
  const trials: Trial[] = [];
  for (const s of specs) {
    for (let i = 0; i < s.count; i++) {
      trials.push(makeTrial(s.condition, s.isSame, MAIN_FACES, false));
    }
  }
  return shuffle(trials);
}

// ── Image preloading ─────────────────────────────────────────────────────────
// Call once at page mount so browser caches all face images before trial 1.
export function preloadAllFaces(): void {
  const urls = [
    ...Array.from({ length: 26 }, (_, i) => `/faces/c2_1_${i + 1}.jpg`),
    ...Array.from({ length: 26 }, (_, i) => `/faces/c2_2_${i + 1}.jpg`),
  ];
  urls.forEach(src => { const img = new Image(); img.src = src; });
}

export const CONDITION_LABELS: Record<Condition, { en: string; he: string }> = {
  'aligned':          { en: 'Aligned',         he: 'מיושר' },
  'small-misaligned': { en: 'Misaligned (S)',   he: 'לא מיושר (ק)' },
  'large-misaligned': { en: 'Misaligned (L)',   he: 'לא מיושר (ג)' },
};
