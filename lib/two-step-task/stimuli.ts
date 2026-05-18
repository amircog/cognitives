import { TwoStepTrial } from '@/types/two-step-task';

// ── Tibetan characters ──────────────────────────────────────────────────────
// 6 distinct characters: 2 for Stage 1, 2 for each Stage 2 state
export const STAGE1_STIMULI = ['༄', '༅'];
export const STAGE2A_STIMULI = ['ༀ', '༁'];
export const STAGE2B_STIMULI = ['༂', '༃'];

// ── Transition structure ────────────────────────────────────────────────────
// Stage 1 left (STAGE1_STIMULI[0]) -> commonly (70%) reaches State A, rarely (30%) State B
// Stage 1 right (STAGE1_STIMULI[1]) -> commonly (70%) reaches State B, rarely (30%) State A
export const COMMON_PROB = 0.7;

// ── State colors ────────────────────────────────────────────────────────────
export const STATE_COLORS = {
  A: { bg: '#7c3aed', bgLight: 'rgba(124, 58, 237, 0.15)', border: '#8b5cf6', name: 'purple' },
  B: { bg: '#0891b2', bgLight: 'rgba(8, 145, 178, 0.15)', border: '#06b6d4', name: 'cyan' },
};

// ── Timing (ms) ─────────────────────────────────────────────────────────────
export const STAGE1_CHOICE_MS = 1500;
export const STAGE1_HIGHLIGHT_MS = 500;
export const TRANSITION_MS = 2000;
export const STAGE2_CHOICE_MS = 1500;
export const STAGE2_HIGHLIGHT_MS = 500;
export const REWARD_MS = 2000;
export const ISI_MS = 1500;

// ── Trial counts ────────────────────────────────────────────────────────────
export const PRACTICE_TRIALS = 25;
export const MAIN_TRIALS = 201;

// ── Reward probability drift ────────────────────────────────────────────────
const DRIFT_SD = 0.025;
const PROB_MIN = 0.25;
const PROB_MAX = 0.75;

function clampProb(p: number): number {
  if (p < PROB_MIN) return 2 * PROB_MIN - p;
  if (p > PROB_MAX) return 2 * PROB_MAX - p;
  return p;
}

function gaussianRandom(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

export function generateRewardWalks(nTrials: number): [number, number, number, number][] {
  let probs: [number, number, number, number] = [
    0.25 + Math.random() * 0.5,
    0.25 + Math.random() * 0.5,
    0.25 + Math.random() * 0.5,
    0.25 + Math.random() * 0.5,
  ];

  const walks: [number, number, number, number][] = [probs];

  for (let t = 1; t < nTrials; t++) {
    probs = probs.map(p => clampProb(p + gaussianRandom() * DRIFT_SD)) as [number, number, number, number];
    walks.push(probs);
  }
  return walks;
}

export function generateTrials(nTrials: number, isPractice: boolean): TwoStepTrial[] {
  const walks = generateRewardWalks(nTrials);
  return walks.map((rewardProbs, i) => ({
    trialIndex: i,
    isPractice,
    rewardProbs,
  }));
}

// ── Transition logic ────────────────────────────────────────────────────────
export function getTransition(stage1Choice: 'left' | 'right'): { state: 'A' | 'B'; type: 'common' | 'rare' } {
  const rand = Math.random();
  if (stage1Choice === 'left') {
    return rand < COMMON_PROB
      ? { state: 'A', type: 'common' }
      : { state: 'B', type: 'rare' };
  } else {
    return rand < COMMON_PROB
      ? { state: 'B', type: 'common' }
      : { state: 'A', type: 'rare' };
  }
}

// ── Reward logic ────────────────────────────────────────────────────────────
export function getReward(
  state: 'A' | 'B',
  choice: 'left' | 'right',
  rewardProbs: [number, number, number, number],
): boolean {
  const probIndex = state === 'A'
    ? (choice === 'left' ? 0 : 1)
    : (choice === 'left' ? 2 : 3);
  return Math.random() < rewardProbs[probIndex];
}

export function getStimulusForChoice(
  stage: 1 | 2,
  state: 'A' | 'B' | null,
  choice: 'left' | 'right',
): string {
  if (stage === 1) return STAGE1_STIMULI[choice === 'left' ? 0 : 1];
  if (state === 'A') return STAGE2A_STIMULI[choice === 'left' ? 0 : 1];
  return STAGE2B_STIMULI[choice === 'left' ? 0 : 1];
}
