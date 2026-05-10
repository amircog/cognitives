import { SrtTrial } from '@/types/srt';

// 1=down, 2=left, 3=right, 4=up
export const SEQUENCE_A = [3, 4, 2, 3, 1, 2, 1, 4, 3, 2, 4, 1];
export const SEQUENCE_B = [3, 4, 1, 2, 4, 3, 1, 4, 2, 1, 3, 2];

export const ISI_MS = 500;
export const MAX_RT_MS = 3000;
export const BLOCKS = 6;
export const TRIALS_PER_BLOCK = 108; // 9 repetitions of 12-item sequence
export const TOTAL_TRIALS = BLOCKS * TRIALS_PER_BLOCK; // 648

// Starting positions within the sequence for each block (0-indexed)
const BLOCK_START_POSITIONS = [0, 4, 9, 7, 3, 11];

export function generateTrials(mainIsA: boolean): SrtTrial[] {
  const mainSeq = mainIsA ? SEQUENCE_A : SEQUENCE_B;
  const intSeq = mainIsA ? SEQUENCE_B : SEQUENCE_A;
  const trials: SrtTrial[] = [];
  let trialOverall = 0;

  for (let block = 1; block <= BLOCKS; block++) {
    const isInterference = block === 5;
    const seq = isInterference ? intSeq : mainSeq;
    const startPos = BLOCK_START_POSITIONS[block - 1];

    for (let t = 0; t < TRIALS_PER_BLOCK; t++) {
      trialOverall++;
      const seqPos = (startPos + t) % 12;
      trials.push({
        block_number: block,
        trial_in_block: t + 1,
        trial_overall: trialOverall,
        sequence_position: seqPos,
        target_location: seq[seqPos],
        sequence_type: isInterference ? 'interference' : 'main',
      });
    }
  }

  return trials;
}

export const LOCATION_LABELS: Record<number, string> = {
  1: 'down',
  2: 'left',
  3: 'right',
  4: 'up',
};
