// Summary Statistics – Stimulus & Trial Generation
// Implements classic ensemble perception paradigm

import {
  StimulusType, StatType, ArrayItem,
  EnsembleTrial, RecognitionTrial, TwoAFCTrial,
} from '@/types/summary-stats';

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────

export const DISPLAY_DURATION_MS  = 400;  // Brief – prevents item counting
export const BLANK_DURATION_MS    = 200;
export const FIXATION_DURATION_MS = 500;

export const SET_SIZES = [4, 8, 12];

// Value ranges per stimulus type
export const VALUE_RANGES: Record<StimulusType, { min: number; max: number }> = {
  'circles':           { min: 15, max: 75 },   // radius in px
  'line-lengths':      { min: 40, max: 200 },   // length in px
  'line-orientations': { min: -60, max: 60 },   // degrees from vertical
};

// SVG display area
const SVG_W = 500;
const SVG_H = 500;
const MARGIN = 60;

// ──────────────────────────────────────────────
// Slider ↔ value mapping
// ──────────────────────────────────────────────

export function sliderToValue(slider: number, type: StimulusType): number {
  const { min, max } = VALUE_RANGES[type];
  return min + (slider / 100) * (max - min);
}

export function valueToSlider(value: number, type: StimulusType): number {
  const { min, max } = VALUE_RANGES[type];
  return Math.round(((value - min) / (max - min)) * 100);
}

// ──────────────────────────────────────────────
// Bilingual stat-type labels (improved Hebrew)
// ──────────────────────────────────────────────

export const STAT_LABELS: Record<StimulusType, Record<StatType, { en: string; he: string }>> = {
  'circles': {
    mean: { en: 'What was the average circle size?',  he: 'מהו גודל העיגול הממוצע?' },
    max:  { en: 'What was the largest circle size?',  he: 'מהו גודל העיגול הגדול ביותר?' },
    min:  { en: 'What was the smallest circle size?', he: 'מהו גודל העיגול הקטן ביותר?' },
  },
  'line-lengths': {
    mean: { en: 'What was the average line length?',  he: 'מהו אורך הקו הממוצע?' },
    max:  { en: 'What was the longest line?',         he: 'מהו הקו הארוך ביותר?' },
    min:  { en: 'What was the shortest line?',        he: 'מהו הקו הקצר ביותר?' },
  },
  'line-orientations': {
    mean: { en: 'What was the average line tilt?',          he: 'מהו הסיבוב הממוצע של הקווים?' },
    max:  { en: 'What was the most rightward (CW) tilt?',   he: 'מהו הסיבוב הימני ביותר?' },
    min:  { en: 'What was the most leftward (CCW) tilt?',   he: 'מהו הסיבוב השמאלי ביותר?' },
  },
};

// 2AFC question labels (after seeing an array, pick which option is the stat)
export const TWO_AFC_LABELS: Record<StimulusType, Record<StatType, { en: string; he: string }>> = {
  'circles': {
    mean: { en: 'Which circle matches the average size?',   he: 'איזה עיגול תואם את הגודל הממוצע?' },
    max:  { en: 'Which circle was the largest?',            he: 'איזה עיגול היה הגדול ביותר?' },
    min:  { en: 'Which circle was the smallest?',           he: 'איזה עיגול היה הקטן ביותר?' },
  },
  'line-lengths': {
    mean: { en: 'Which line matches the average length?',   he: 'איזה קו תואם את האורך הממוצע?' },
    max:  { en: 'Which line was the longest?',              he: 'איזה קו היה הארוך ביותר?' },
    min:  { en: 'Which line was the shortest?',             he: 'איזה קו היה הקצר ביותר?' },
  },
  'line-orientations': {
    mean: { en: 'Which tilt matches the average tilt?',     he: 'איזה קו תואם את הסיבוב הממוצע?' },
    max:  { en: 'Which was the most rightward (CW) tilt?',  he: 'איזה קו נטה הכי ימינה?' },
    min:  { en: 'Which was the most leftward (CCW) tilt?',  he: 'איזה קו נטה הכי שמאלה?' },
  },
};

export const TYPE_LABELS: Record<StimulusType, { en: string; he: string }> = {
  'circles':           { en: 'Circles',      he: 'עיגולים' },
  'line-lengths':      { en: 'Lines',        he: 'קווים' },
  'line-orientations': { en: 'Orientations', he: 'כיוונים' },
};

export const STAT_SHORT: Record<StatType, { en: string; he: string }> = {
  mean: { en: 'Average', he: 'ממוצע' },
  max:  { en: 'Largest',  he: 'גדול ביותר' },
  min:  { en: 'Smallest', he: 'קטן ביותר' },
};

// ──────────────────────────────────────────────
// Item generation helpers
// ──────────────────────────────────────────────

function randFloat(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generatePositions(n: number): { x: number; y: number }[] {
  const cols = Math.ceil(Math.sqrt(n * 1.5));
  const rows = Math.ceil(n / cols);
  const cellW = (SVG_W - 2 * MARGIN) / cols;
  const cellH = (SVG_H - 2 * MARGIN) / rows;

  const positions: { x: number; y: number }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (positions.length >= n) break;
      const cx = MARGIN + c * cellW + cellW / 2 + randFloat(-cellW * 0.25, cellW * 0.25);
      const cy = MARGIN + r * cellH + cellH / 2 + randFloat(-cellH * 0.25, cellH * 0.25);
      positions.push({ x: Math.round(cx), y: Math.round(cy) });
    }
  }
  return shuffle(positions).slice(0, n);
}

export function generateArray(type: StimulusType, n: number): ArrayItem[] {
  const { min, max } = VALUE_RANGES[type];
  const positions = generatePositions(n);
  return positions.map((pos, i) => ({
    id: i,
    x: pos.x,
    y: pos.y,
    value: Math.round(randFloat(min, max)),
  }));
}

export function calcTrueValue(items: ArrayItem[], statType: StatType): number {
  const values = items.map(it => it.value);
  if (statType === 'mean') return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  if (statType === 'max')  return Math.max(...values);
  return Math.min(...values);
}

// Generate a 2AFC foil: plausibly different from the true value (20–50% of range away)
export function generate2AFCFoil(trueValue: number, type: StimulusType): number {
  const { min, max } = VALUE_RANGES[type];
  const range = max - min;
  const minDiff = range * 0.20;
  const maxDiff = range * 0.48;

  const direction = Math.random() < 0.5 ? 1 : -1;
  const diff = minDiff + Math.random() * (maxDiff - minDiff);
  let foil = Math.round(trueValue + direction * diff);

  foil = Math.max(min, Math.min(max, foil));
  // If we got clamped and the result is too close, try other direction
  if (Math.abs(foil - trueValue) < minDiff) {
    foil = Math.round(trueValue - direction * diff);
    foil = Math.max(min, Math.min(max, foil));
  }
  return foil;
}

// ──────────────────────────────────────────────
// Practice trial generation (6 trials: 2 per type, ensemble only, with feedback)
// ──────────────────────────────────────────────

export function generatePracticeTrials(): EnsembleTrial[] {
  const configs: { type: StimulusType; stat: StatType }[] = [
    { type: 'circles',           stat: 'mean' },
    { type: 'circles',           stat: 'max'  },
    { type: 'line-lengths',      stat: 'mean' },
    { type: 'line-lengths',      stat: 'min'  },
    { type: 'line-orientations', stat: 'mean' },
    { type: 'line-orientations', stat: 'max'  },
  ];

  return shuffle(configs).map((cfg, i) => {
    const n = 8;
    const items = generateArray(cfg.type, n);
    return {
      trialId: i + 1,
      type: 'ensemble' as const,
      stimulusType: cfg.type,
      statType: cfg.stat,
      items,
      trueValue: calcTrueValue(items, cfg.stat),
      nItems: n,
      isPractice: true,
    };
  });
}

// ──────────────────────────────────────────────
// Main interleaved trial generation
// 9 ensemble + 9 recognition + 6 2AFC = 24 trials
// Each trial shows its own array immediately before the question
// ──────────────────────────────────────────────

export function generateMainTrials(): (EnsembleTrial | RecognitionTrial | TwoAFCTrial)[] {
  const TYPES: StimulusType[] = ['circles', 'line-lengths', 'line-orientations'];
  const STATS: StatType[] = ['mean', 'max', 'min'];

  // Set size pool: 24 total, each size appears 8 times
  const setSizePool = shuffle([
    ...SET_SIZES, ...SET_SIZES, ...SET_SIZES,
    ...SET_SIZES, ...SET_SIZES, ...SET_SIZES,
    ...SET_SIZES, ...SET_SIZES,
  ]);
  let sizeIdx = 0;
  const nextSize = () => setSizePool[sizeIdx++ % setSizePool.length];

  // ── 9 Ensemble trials: 3 per type (one of each stat), balanced set sizes ──
  const ensembleTrials: EnsembleTrial[] = [];
  let eid = 1;
  for (const type of TYPES) {
    for (const stat of shuffle([...STATS])) {
      const n = nextSize();
      const items = generateArray(type, n);
      ensembleTrials.push({
        trialId: eid++,
        type: 'ensemble',
        stimulusType: type,
        statType: stat,
        items,
        trueValue: calcTrueValue(items, stat),
        nItems: n,
        isPractice: false,
      });
    }
  }

  // ── 9 Recognition trials: 3 per type (within-trial probe, ~50% targets) ──
  const recTrials: RecognitionTrial[] = [];
  let rid = 100;
  for (const type of TYPES) {
    // Use [true, true, false] so 2 targets + 1 foil per type = 18/9 hit rate controlled
    const isTargetFlags = shuffle([true, true, false]);
    for (let i = 0; i < 3; i++) {
      const n = nextSize();
      const items = generateArray(type, n);
      const isTarget = isTargetFlags[i];
      const { min, max } = VALUE_RANGES[type];
      let probeValue: number;

      if (isTarget) {
        // Pick a random item from the array
        probeValue = items[Math.floor(Math.random() * items.length)].value;
      } else {
        // Generate a foil not in the array
        const seenSet = new Set(items.map(it => it.value));
        let attempts = 0;
        do {
          probeValue = Math.round(randFloat(min, max));
          attempts++;
        } while (seenSet.has(probeValue) && attempts < 500);
      }

      recTrials.push({
        trialId: rid++,
        type: 'recognition',
        stimulusType: type,
        items,
        nItems: n,
        probeValue,
        probeIsTarget: isTarget,
      });
    }
  }

  // ── 6 2AFC trials: 2 per type (mean + one of max/min, randomised) ──
  const twoAFCTrials: TwoAFCTrial[] = [];
  let fid = 200;
  for (const type of TYPES) {
    const stats2afc: StatType[] = shuffle(['mean', Math.random() < 0.5 ? 'max' : 'min'] as StatType[]);
    for (const stat of stats2afc) {
      const n = nextSize();
      const items = generateArray(type, n);
      const trueValue = calcTrueValue(items, stat);
      const foilValue = generate2AFCFoil(trueValue, type);
      twoAFCTrials.push({
        trialId: fid++,
        type: '2afc',
        stimulusType: type,
        statType: stat,
        items,
        nItems: n,
        trueValue,
        foilValue,
        correctIsA: Math.random() < 0.5,
      });
    }
  }

  // ── Interleave: build blocks so no type dominates a stretch ──
  // Pattern: E R F E R F E R E R F E R F E R E R E R F E R F  (9E 9R 6F)
  // Simple approach: create 6 "mini-blocks" of (E, R, F) and 3 "pairs" of (E, R)
  const eShuf = shuffle(ensembleTrials);
  const rShuf = shuffle(recTrials);
  const fShuf = shuffle(twoAFCTrials);

  const interleaved: (EnsembleTrial | RecognitionTrial | TwoAFCTrial)[] = [];
  // 6 blocks of (E, R, F)
  for (let i = 0; i < 6; i++) {
    interleaved.push(eShuf[i]);
    interleaved.push(rShuf[i]);
    interleaved.push(fShuf[i]);
  }
  // Remaining 3E + 3R
  for (let i = 6; i < 9; i++) {
    interleaved.push(eShuf[i]);
    interleaved.push(rShuf[i]);
  }

  return interleaved; // 6×3 + 3×2 = 24 trials in nice ERF-ERF-... pattern
}
