import { VisualSearchTrial, SearchItem, SearchType } from '@/types/visual-search';

const ROTATIONS: Array<0 | 90 | 180 | 270> = [0, 90, 180, 270];

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

/** Generate random positions that don't overlap too much. Falls back to grid. */
export function generatePositions(
  count: number,
  w: number,
  h: number,
  minDist: number,
): Array<{ x: number; y: number }> {
  const margin = 30;
  const positions: Array<{ x: number; y: number }> = [];
  const maxAttempts = count * 40;
  let attempts = 0;

  while (positions.length < count && attempts < maxAttempts) {
    attempts++;
    const x = margin + Math.random() * (w - 2 * margin);
    const y = margin + Math.random() * (h - 2 * margin);
    const tooClose = positions.some(
      (p) => Math.sqrt((p.x - x) ** 2 + (p.y - y) ** 2) < minDist,
    );
    if (!tooClose) {
      positions.push({ x, y });
    }
  }

  // Grid fallback for remaining positions
  if (positions.length < count) {
    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);
    const cellW = (w - 2 * margin) / cols;
    const cellH = (h - 2 * margin) / rows;
    let idx = 0;
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
    // Last resort: just fill without distance check
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

/** Build the items array for one trial. */
export function generateItems(
  searchType: SearchType,
  setSize: 8 | 16 | 24,
  targetPresent: boolean,
): SearchItem[] {
  const W = 600;
  const H = 600;
  const minDist = 60;

  const positions = shuffle(generatePositions(setSize, W, H, minDist));
  const items: SearchItem[] = [];

  let posIdx = 0;

  // Place target if present
  if (targetPresent) {
    const { x, y } = positions[posIdx++];
    items.push({ x, y, letter: 'T', color: 'red', rotation: 0, isTarget: true });
  }

  const distractorCount = setSize - (targetPresent ? 1 : 0);

  if (searchType === 'feature') {
    // Feature distractors: all blue T's, random rotation
    for (let i = 0; i < distractorCount; i++) {
      const { x, y } = positions[posIdx++];
      items.push({ x, y, letter: 'T', color: 'blue', rotation: randRotation(), isTarget: false });
    }
  } else {
    // Conjunction distractors: half red L's + half blue T's, random rotation
    const half = Math.floor(distractorCount / 2);
    const remainder = distractorCount - 2 * half; // 0 or 1 when odd

    for (let i = 0; i < half; i++) {
      const { x, y } = positions[posIdx++];
      items.push({ x, y, letter: 'L', color: 'red', rotation: randRotation(), isTarget: false });
    }
    for (let i = 0; i < half; i++) {
      const { x, y } = positions[posIdx++];
      items.push({ x, y, letter: 'T', color: 'blue', rotation: randRotation(), isTarget: false });
    }
    // Handle odd remainder with a red L
    for (let i = 0; i < remainder; i++) {
      const { x, y } = positions[posIdx++];
      items.push({ x, y, letter: 'L', color: 'red', rotation: randRotation(), isTarget: false });
    }
  }

  return items;
}

function makeTrial(
  id: number,
  searchType: SearchType,
  setSize: 8 | 16 | 24,
  targetPresent: boolean,
  isPractice: boolean,
): VisualSearchTrial {
  return {
    id,
    searchType,
    setSize,
    targetPresent,
    items: generateItems(searchType, setSize, targetPresent),
    isPractice,
  };
}

/** 12 practice trials: 1 per cell (2 types × 3 sizes × 2 presence). */
export function generatePracticeTrials(): VisualSearchTrial[] {
  const trials: VisualSearchTrial[] = [];
  let id = 0;
  for (const st of ['feature', 'conjunction'] as SearchType[]) {
    for (const sz of [8, 16, 24] as const) {
      for (const present of [true, false]) {
        trials.push(makeTrial(id++, st, sz, present, true));
      }
    }
  }
  return shuffle(trials).map((t, i) => ({ ...t, id: i }));
}

/** 60 block trials: 10 reps × 3 set sizes × 2 presence. */
export function generateBlockTrials(searchType: SearchType): VisualSearchTrial[] {
  const trials: VisualSearchTrial[] = [];
  let id = 0;
  for (const sz of [8, 16, 24] as const) {
    for (let rep = 0; rep < 10; rep++) {
      trials.push(makeTrial(id++, searchType, sz, true, false));
      trials.push(makeTrial(id++, searchType, sz, false, false));
    }
  }
  return shuffle(trials).map((t, i) => ({ ...t, id: i }));
}

/** Randomly returns block order. */
export function getBlockOrder(): ['feature', 'conjunction'] | ['conjunction', 'feature'] {
  return Math.random() < 0.5
    ? ['feature', 'conjunction']
    : ['conjunction', 'feature'];
}
