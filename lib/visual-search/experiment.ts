import { VisualSearchTrial, SearchItem, TargetSetSize, DistractorSetSize } from '@/types/visual-search';

const ROTATIONS: Array<0 | 90 | 180 | 270> = [0, 90, 180, 270];
const SET_SIZES: TargetSetSize[] = [1, 2, 4, 8];
const DISPLAY_W = 600;
const DISPLAY_H = 600;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function randRotation(): 0 | 90 | 180 | 270 {
  return ROTATIONS[Math.floor(Math.random() * 4)];
}

/** Generate random non-overlapping positions; falls back to grid. */
export function generatePositions(
  count: number,
  w: number,
  h: number,
  minDist: number,
): Array<{ x: number; y: number }> {
  const margin = 36;
  const positions: Array<{ x: number; y: number }> = [];
  const maxAttempts = count * 60;
  let attempts = 0;

  while (positions.length < count && attempts < maxAttempts) {
    attempts++;
    const x = margin + Math.random() * (w - 2 * margin);
    const y = margin + Math.random() * (h - 2 * margin);
    const tooClose = positions.some(
      (p) => Math.sqrt((p.x - x) ** 2 + (p.y - y) ** 2) < minDist,
    );
    if (!tooClose) positions.push({ x, y });
  }

  // Grid fallback
  if (positions.length < count) {
    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);
    const cellW = (w - 2 * margin) / cols;
    const cellH = (h - 2 * margin) / rows;
    let idx = positions.length;
    outer: for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (positions.length >= count) break outer;
        const x = margin + c * cellW + cellW / 2 + (Math.random() - 0.5) * cellW * 0.3;
        const y = margin + r * cellH + cellH / 2 + (Math.random() - 0.5) * cellH * 0.3;
        const tooClose = positions.some(
          (p) => Math.sqrt((p.x - x) ** 2 + (p.y - y) ** 2) < minDist * 0.6,
        );
        if (!tooClose) positions.push({ x, y });
        idx++;
      }
    }
    while (positions.length < count) {
      const c = idx % cols;
      const r = Math.floor(idx / cols) % rows;
      positions.push({
        x: margin + c * cellW + cellW / 2,
        y: margin + r * cellH + cellH / 2,
      });
      idx++;
    }
  }

  return positions.slice(0, count);
}

/**
 * Build items for one trial.
 *
 * Design: conjunction search
 *   Target-present:  1 targetColor-T + (targetSetSize-1) targetColor-L's  + distractorSetSize distractorColor-T's
 *   Target-absent:   targetSetSize targetColor-L's                         + distractorSetSize distractorColor-T's
 *
 * Participants must find the T in their assigned target color.
 */
export function generateItems(
  targetSetSize: TargetSetSize,
  distractorSetSize: DistractorSetSize,
  targetPresent: boolean,
  targetColor: 'red' | 'blue',
  distractorColor: 'red' | 'blue',
): SearchItem[] {
  const total = targetSetSize + distractorSetSize;
  const minDist = total <= 4 ? 90 : total <= 8 ? 70 : 55;
  const positions = shuffle(generatePositions(total, DISPLAY_W, DISPLAY_H, minDist));
  const items: SearchItem[] = [];
  let posIdx = 0;

  if (targetPresent) {
    // Place the target T
    const { x, y } = positions[posIdx++];
    items.push({ x, y, letter: 'T', color: targetColor, rotation: 0, isTarget: true });
    // Place (targetSetSize - 1) same-color L's
    for (let i = 0; i < targetSetSize - 1; i++) {
      const { x: lx, y: ly } = positions[posIdx++];
      items.push({ x: lx, y: ly, letter: 'L', color: targetColor, rotation: randRotation(), isTarget: false });
    }
  } else {
    // Place targetSetSize L's in target color (no T)
    for (let i = 0; i < targetSetSize; i++) {
      const { x, y } = positions[posIdx++];
      items.push({ x, y, letter: 'L', color: targetColor, rotation: randRotation(), isTarget: false });
    }
  }

  // Place distractorSetSize T's in distractor color
  for (let i = 0; i < distractorSetSize; i++) {
    const { x, y } = positions[posIdx++];
    items.push({ x, y, letter: 'T', color: distractorColor, rotation: randRotation(), isTarget: false });
  }

  return items;
}

function makeTrial(
  id: number,
  targetSetSize: TargetSetSize,
  distractorSetSize: DistractorSetSize,
  targetPresent: boolean,
  targetColor: 'red' | 'blue',
  isPractice: boolean,
): VisualSearchTrial {
  const distractorColor = targetColor === 'red' ? 'blue' : 'red';
  return {
    id,
    targetSetSize,
    distractorSetSize,
    targetPresent,
    targetColor,
    distractorColor,
    items: generateItems(targetSetSize, distractorSetSize, targetPresent, targetColor, distractorColor),
    isPractice,
  };
}

/** 8 practice trials sampling varied combinations. */
export function generatePracticeTrials(targetColor: 'red' | 'blue'): VisualSearchTrial[] {
  const specs: Array<[TargetSetSize, DistractorSetSize, boolean]> = [
    [1, 1, true], [1, 4, false],
    [2, 2, true], [2, 8, false],
    [4, 4, true], [8, 2, false],
    [4, 8, true], [8, 1, false],
  ];
  const trials = specs.map(([tss, dss, present], i) =>
    makeTrial(i, tss, dss, present, targetColor, true),
  );
  return shuffle(trials).map((t, i) => ({ ...t, id: i }));
}

/**
 * 128 main trials: 4×4 combinations × 2 (present/absent) × 4 reps.
 * Fully shuffled.
 */
export function generateMainTrials(targetColor: 'red' | 'blue'): VisualSearchTrial[] {
  const trials: VisualSearchTrial[] = [];
  let id = 0;
  for (const tss of SET_SIZES) {
    for (const dss of SET_SIZES as DistractorSetSize[]) {
      for (const present of [true, false]) {
        for (let rep = 0; rep < 4; rep++) {
          trials.push(makeTrial(id++, tss, dss, present, targetColor, false));
        }
      }
    }
  }
  return shuffle(trials).map((t, i) => ({ ...t, id: i }));
}
