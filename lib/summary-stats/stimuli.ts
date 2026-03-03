// Summary Statistics – Stimulus & Trial Generation
// Implements classic ensemble perception paradigm

import {
  StimulusType, StatType, ArrayItem,
  EnsembleTrial, RecognitionTrial, SeenArray,
} from '@/types/summary-stats';

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────

export const DISPLAY_DURATION_MS = 400;   // Brief – prevents item counting
export const BLANK_DURATION_MS   = 200;
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
const MARGIN = 60; // keep items away from edges

// ──────────────────────────────────────────────
// Slider ↔ value mapping
// ──────────────────────────────────────────────

// Slider is always 0-100 (integer); maps to physical value
export function sliderToValue(slider: number, type: StimulusType): number {
  const { min, max } = VALUE_RANGES[type];
  return min + (slider / 100) * (max - min);
}

export function valueToSlider(value: number, type: StimulusType): number {
  const { min, max } = VALUE_RANGES[type];
  return Math.round(((value - min) / (max - min)) * 100);
}

// ──────────────────────────────────────────────
// Bilingual stat-type labels
// ──────────────────────────────────────────────

export const STAT_LABELS: Record<StimulusType, Record<StatType, { en: string; he: string }>> = {
  'circles': {
    mean: { en: 'What was the average circle size?',   he: 'מה הייתה גודל העיגול הממוצע?' },
    max:  { en: 'What was the largest circle size?',   he: 'מה הייתה גודל העיגול הגדול ביותר?' },
    min:  { en: 'What was the smallest circle size?',  he: 'מה הייתה גודל העיגול הקטן ביותר?' },
  },
  'line-lengths': {
    mean: { en: 'What was the average line length?',   he: 'מה הייתה אורך הקו הממוצע?' },
    max:  { en: 'What was the longest line?',          he: 'מה הייתה הקו הארוך ביותר?' },
    min:  { en: 'What was the shortest line?',         he: 'מה הייתה הקו הקצר ביותר?' },
  },
  'line-orientations': {
    mean: { en: 'What was the average line tilt?',         he: 'מה הייתה הנטייה הממוצעת של הקווים?' },
    max:  { en: 'What was the most clockwise tilt?',        he: 'מה הייתה הנטייה השעונית ביותר?' },
    min:  { en: 'What was the most counter-clockwise tilt?', he: 'מה הייתה הנטייה הנגד-שעונית ביותר?' },
  },
};

// Stimulus type labels
export const TYPE_LABELS: Record<StimulusType, { en: string; he: string }> = {
  'circles':           { en: 'Circles',      he: 'עיגולים' },
  'line-lengths':      { en: 'Lines',         he: 'קווים' },
  'line-orientations': { en: 'Orientations',  he: 'כיוונים' },
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

// Generate non-overlapping scatter positions within a grid with jitter
function generatePositions(n: number): { x: number; y: number }[] {
  // Place items in a grid, then jitter
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

// ──────────────────────────────────────────────
// True-value calculation
// ──────────────────────────────────────────────

export function calcTrueValue(items: ArrayItem[], statType: StatType): number {
  const values = items.map(it => it.value);
  if (statType === 'mean') return values.reduce((a, b) => a + b, 0) / values.length;
  if (statType === 'max')  return Math.max(...values);
  return Math.min(...values);
}

// ──────────────────────────────────────────────
// Practice trial generation (6 trials: 2 per type)
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
    const n = 8; // fixed size for practice
    const items = generateArray(cfg.type, n);
    return {
      trialId: i + 1,
      type: 'ensemble',
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
// Main ensemble trial generation (18 trials)
// 6 per stimulus type: 2×mean + 2×max + 2×min
// Set sizes balanced across {4, 8, 12}
// ──────────────────────────────────────────────

export function generateEnsembleTrials(): EnsembleTrial[] {
  const types: StimulusType[] = ['circles', 'line-lengths', 'line-orientations'];
  const stats: StatType[] = ['mean', 'mean', 'max', 'max', 'min', 'min'];

  // 18 set-size slots balanced: 6 of each size
  const setSizePool = shuffle([...SET_SIZES, ...SET_SIZES, ...SET_SIZES,
                                ...SET_SIZES, ...SET_SIZES, ...SET_SIZES]);

  const allTrials: EnsembleTrial[] = [];
  let idCounter = 1;
  let sizeIdx = 0;

  for (const type of types) {
    const shuffledStats = shuffle([...stats]);
    for (const stat of shuffledStats) {
      const n = setSizePool[sizeIdx++ % setSizePool.length];
      const items = generateArray(type, n);
      allTrials.push({
        trialId: idCounter++,
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

  return shuffle(allTrials);
}

// ──────────────────────────────────────────────
// Recognition probe generation (12 probes)
// 4 per type: 2 targets from seen arrays + 2 foils
// ──────────────────────────────────────────────

export function generateRecognitionTrials(seenArrays: SeenArray[]): RecognitionTrial[] {
  const types: StimulusType[] = ['circles', 'line-lengths', 'line-orientations'];
  const probes: RecognitionTrial[] = [];
  let idCounter = 1;

  for (const type of types) {
    const relevant = seenArrays.filter(a => a.stimulusType === type);
    if (relevant.length === 0) continue;

    // Collect all seen values for this type
    const allSeenValues: { value: number; trialId: number }[] = [];
    relevant.forEach(arr => {
      arr.items.forEach(item => allSeenValues.push({ value: item.value, trialId: arr.trialId }));
    });

    const { min, max } = VALUE_RANGES[type];

    // Pick 2 target items (actual values from seen arrays)
    const shuffledSeen = shuffle(allSeenValues);
    const targetItems = shuffledSeen.slice(0, 2);

    // Generate 2 foils: within range but not matching any seen value
    const seenValueSet = new Set(allSeenValues.map(v => v.value));
    const foils: number[] = [];
    let attempts = 0;
    while (foils.length < 2 && attempts < 1000) {
      const candidate = Math.round(randFloat(min, max));
      // Must not match any seen value (allow ±2 tolerance for continuous values)
      const isTooClose = allSeenValues.some(sv => Math.abs(sv.value - candidate) <= 2);
      if (!isTooClose && !foils.includes(candidate)) {
        foils.push(candidate);
      }
      attempts++;
    }
    // Fallback if foil generation fails
    while (foils.length < 2) {
      foils.push(Math.round(randFloat(min, max)));
    }

    // Add target probes
    for (const target of targetItems) {
      probes.push({
        trialId: idCounter++,
        type: 'recognition',
        stimulusType: type,
        probeValue: target.value,
        probeIsTarget: true,
        sourceTrialId: target.trialId,
      });
    }

    // Add foil probes
    for (const foilVal of foils) {
      probes.push({
        trialId: idCounter++,
        type: 'recognition',
        stimulusType: type,
        probeValue: foilVal,
        probeIsTarget: false,
      });
    }
  }

  return shuffle(probes);
}
