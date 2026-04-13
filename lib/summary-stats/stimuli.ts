// Summary Statistics – Stimulus & Trial Generation

import {
  StimulusType, StatType, ArrayItem, ProbeType, FoilType,
  EnsembleTrial, RecognitionTrial, TwoAFCTrial, Trial,
} from '@/types/summary-stats';

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────

export const DISPLAY_DURATION_MS  = 800;
export const BLANK_DURATION_MS    = 200;
export const FIXATION_DURATION_MS = 500;

export const SET_SIZES = [3, 5, 7];

export const VALUE_RANGES: Record<StimulusType, { min: number; max: number }> = {
  'circles':      { min: 15, max: 75 },
  'line-lengths': { min: 40, max: 200 },
};

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
// Labels
// ──────────────────────────────────────────────

export const STAT_LABELS: Record<StimulusType, { en: string; he: string }> = {
  'circles':      { en: 'What was the average circle size?', he: 'מהו גודל העיגול הממוצע?' },
  'line-lengths': { en: 'What was the average line length?', he: 'מהו אורך הקו הממוצע?' },
};

export const TWO_AFC_LABELS: Record<StimulusType, { en: string; he: string }> = {
  'circles':      { en: 'Which circle appeared in the display?', he: 'איזה עיגול הופיע בתצוגה?' },
  'line-lengths': { en: 'Which line appeared in the display?',   he: 'איזה קו הופיע בתצוגה?' },
};

export const RECOGNITION_LABEL = {
  en: 'Did this item appear in the display?',
  he: 'האם פריט זה הופיע בתצוגה?',
};

export const TYPE_LABELS: Record<StimulusType, { en: string; he: string }> = {
  'circles':      { en: 'Circles', he: 'עיגולים' },
  'line-lengths': { en: 'Lines',   he: 'קווים'   },
};

// ──────────────────────────────────────────────
// Helpers
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

// Generate array where Math.round(floatMean) is NOT a member value
export function generateArray(type: StimulusType, n: number): ArrayItem[] {
  const { min, max } = VALUE_RANGES[type];
  const positions = generatePositions(n);
  let items: ArrayItem[] = [];
  let attempts = 0;
  do {
    items = positions.map((pos, i) => ({
      id: i,
      x: pos.x,
      y: pos.y,
      value: Math.round(randFloat(min, max)),
    }));
    const floatMean = items.reduce((s, it) => s + it.value, 0) / items.length;
    const intMean = Math.round(floatMean);
    if (!items.some(it => it.value === intMean)) break;
    attempts++;
  } while (attempts < 100);
  return items;
}

export function calcTrueMean(items: ArrayItem[]): number {
  return Math.round(items.reduce((a, b) => a + b.value, 0) / items.length);
}

// Generate probe value for a given probe type
function generateProbe(
  items: ArrayItem[],
  probeType: ProbeType,
  type: StimulusType,
): { probeValue: number; probeIsTarget: boolean } {
  const { min, max } = VALUE_RANGES[type];
  const floatMean = items.reduce((s, i) => s + i.value, 0) / items.length;
  const intMean = Math.round(floatMean);
  const seenSet = new Set(items.map(i => i.value));

  if (probeType === 'target') {
    const probeValue = items[Math.floor(Math.random() * items.length)].value;
    return { probeValue, probeIsTarget: true };
  }
  if (probeType === 'foil-mean') {
    return { probeValue: intMean, probeIsTarget: false };
  }
  // foil-non-mean: not in array, not equal to intMean
  let probeValue = intMean;
  let att = 0;
  while ((seenSet.has(probeValue) || probeValue === intMean) && att < 500) {
    probeValue = Math.round(randFloat(min, max));
    att++;
  }
  return { probeValue, probeIsTarget: false };
}

// Generate 2AFC values for a given foil type
function generate2AFC(
  items: ArrayItem[],
  foilType: FoilType,
  type: StimulusType,
): { trueValue: number; foilValue: number } {
  const { min, max } = VALUE_RANGES[type];
  const floatMean = items.reduce((s, i) => s + i.value, 0) / items.length;
  const intMean = Math.round(floatMean);
  const seenSet = new Set(items.map(i => i.value));

  const trueValue = items[Math.floor(Math.random() * items.length)].value;

  if (foilType === 'mean') {
    return { trueValue, foilValue: intMean };
  }
  // non-mean: not in array, not equal to intMean
  let foilValue = intMean;
  let att = 0;
  while ((seenSet.has(foilValue) || foilValue === intMean) && att < 500) {
    foilValue = Math.round(randFloat(min, max));
    att++;
  }
  return { trueValue, foilValue };
}

// ──────────────────────────────────────────────
// Practice trial generation
// 10 trials: 4 ensemble + 3 recognition + 3 2AFC (shuffled)
// ──────────────────────────────────────────────

export function generatePracticeTrials(): Trial[] {
  const trials: Trial[] = [];
  let id = 1;

  // 4 ensemble (2 circles, 2 line-lengths)
  const ensembleCfgs: { type: StimulusType; n: number }[] = [
    { type: 'circles',      n: 3 },
    { type: 'circles',      n: 7 },
    { type: 'line-lengths', n: 5 },
    { type: 'line-lengths', n: 3 },
  ];
  for (const cfg of ensembleCfgs) {
    const items = generateArray(cfg.type, cfg.n);
    trials.push({
      trialId: id++, type: 'ensemble', stimulusType: cfg.type, statType: 'mean',
      items, trueValue: calcTrueMean(items), nItems: cfg.n, isPractice: true,
    });
  }

  // 3 recognition (one per probe type)
  const recCfgs: { type: StimulusType; probeType: ProbeType }[] = [
    { type: 'circles',      probeType: 'target'         },
    { type: 'line-lengths', probeType: 'foil-mean'      },
    { type: 'circles',      probeType: 'foil-non-mean'  },
  ];
  for (const cfg of recCfgs) {
    const n = SET_SIZES[Math.floor(Math.random() * SET_SIZES.length)];
    const items = generateArray(cfg.type, n);
    const { probeValue, probeIsTarget } = generateProbe(items, cfg.probeType, cfg.type);
    trials.push({
      trialId: id++, type: 'recognition', stimulusType: cfg.type,
      items, nItems: n, probeValue, probeIsTarget, probeType: cfg.probeType, isPractice: true,
    });
  }

  // 3 2AFC
  const afcCfgs: { type: StimulusType; foilType: FoilType }[] = [
    { type: 'circles',      foilType: 'mean'     },
    { type: 'line-lengths', foilType: 'non-mean' },
    { type: 'line-lengths', foilType: 'mean'     },
  ];
  for (const cfg of afcCfgs) {
    const n = SET_SIZES[Math.floor(Math.random() * SET_SIZES.length)];
    const items = generateArray(cfg.type, n);
    const { trueValue, foilValue } = generate2AFC(items, cfg.foilType, cfg.type);
    trials.push({
      trialId: id++, type: '2afc', stimulusType: cfg.type,
      items, nItems: n, trueValue, foilValue, foilType: cfg.foilType,
      correctIsA: Math.random() < 0.5, isPractice: true,
    });
  }

  return shuffle(trials);
}

// ──────────────────────────────────────────────
// Main trial generation
// 72 trials: 3 set sizes × 2 types × 3 question types × 4 reps
// ──────────────────────────────────────────────

export function generateMainTrials(): Trial[] {
  const TYPES: StimulusType[] = ['circles', 'line-lengths'];

  // Probe type pool: 24 recognition trials with 8 each
  const probePool: ProbeType[] = shuffle([
    ...(Array(8).fill('target') as ProbeType[]),
    ...(Array(8).fill('foil-mean') as ProbeType[]),
    ...(Array(8).fill('foil-non-mean') as ProbeType[]),
  ]);

  // Foil type pool: 24 2AFC trials with 12 each
  const foilPool: FoilType[] = shuffle([
    ...(Array(12).fill('mean') as FoilType[]),
    ...(Array(12).fill('non-mean') as FoilType[]),
  ]);

  let probeIdx = 0;
  let foilIdx  = 0;
  let id = 1;

  const ensembleTrials: EnsembleTrial[]   = [];
  const recTrials:      RecognitionTrial[] = [];
  const afcTrials:      TwoAFCTrial[]     = [];

  for (const type of TYPES) {
    for (const sz of SET_SIZES) {
      for (let rep = 0; rep < 4; rep++) {
        // Ensemble
        const eItems = generateArray(type, sz);
        ensembleTrials.push({
          trialId: id++, type: 'ensemble', stimulusType: type, statType: 'mean',
          items: eItems, trueValue: calcTrueMean(eItems), nItems: sz, isPractice: false,
        });

        // Recognition
        const rItems = generateArray(type, sz);
        const pt = probePool[probeIdx++ % probePool.length];
        const { probeValue, probeIsTarget } = generateProbe(rItems, pt, type);
        recTrials.push({
          trialId: id++, type: 'recognition', stimulusType: type,
          items: rItems, nItems: sz, probeValue, probeIsTarget, probeType: pt, isPractice: false,
        });

        // 2AFC
        const fItems = generateArray(type, sz);
        const ft = foilPool[foilIdx++ % foilPool.length];
        const { trueValue, foilValue } = generate2AFC(fItems, ft, type);
        afcTrials.push({
          trialId: id++, type: '2afc', stimulusType: type,
          items: fItems, nItems: sz, trueValue, foilValue, foilType: ft,
          correctIsA: Math.random() < 0.5, isPractice: false,
        });
      }
    }
  }

  // Interleave: shuffle all 72 trials
  return shuffle([...ensembleTrials, ...recTrials, ...afcTrials]);
}
