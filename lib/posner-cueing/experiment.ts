import { PosnerTrial, CueDirection, TargetSide, Validity } from '@/types/posner-cueing';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeTrial(
  id: number,
  cueDirection: CueDirection,
  targetSide: TargetSide,
  validity: Validity,
  soa: 300 | 500,
  isPractice: boolean,
): PosnerTrial {
  return { id, cueDirection, targetSide, validity, soa, isPractice };
}

export function generatePracticeTrials(): PosnerTrial[] {
  // 8 trials: 6 valid, 1 invalid, 1 catch — mixed SOAs
  const trials: PosnerTrial[] = [
    // Valid (cue matches target)
    makeTrial(0, 'left',  'left',  'valid',   300, true),
    makeTrial(1, 'right', 'right', 'valid',   500, true),
    makeTrial(2, 'left',  'left',  'valid',   500, true),
    makeTrial(3, 'right', 'right', 'valid',   300, true),
    makeTrial(4, 'left',  'left',  'valid',   300, true),
    makeTrial(5, 'right', 'right', 'valid',   500, true),
    // Invalid (cue opposite target)
    makeTrial(6, 'left',  'right', 'invalid', 300, true),
    // Catch (no target)
    makeTrial(7, 'right', null,    'catch',   500, true),
  ];
  return shuffle(trials).map((t, i) => ({ ...t, id: i }));
}

export function generateMainTrials(): PosnerTrial[] {
  const trials: PosnerTrial[] = [];
  let id = 0;

  for (const soa of [300, 500] as const) {
    // 40 valid: 20 cue-left/target-left, 20 cue-right/target-right
    for (let i = 0; i < 20; i++) {
      trials.push(makeTrial(id++, 'left',  'left',  'valid', soa, false));
      trials.push(makeTrial(id++, 'right', 'right', 'valid', soa, false));
    }
    // 10 invalid: 5 cue-left/target-right, 5 cue-right/target-left
    for (let i = 0; i < 5; i++) {
      trials.push(makeTrial(id++, 'left',  'right', 'invalid', soa, false));
      trials.push(makeTrial(id++, 'right', 'left',  'invalid', soa, false));
    }
    // 6 catch: 3 cue-left/no-target, 3 cue-right/no-target
    for (let i = 0; i < 3; i++) {
      trials.push(makeTrial(id++, 'left',  null, 'catch', soa, false));
      trials.push(makeTrial(id++, 'right', null, 'catch', soa, false));
    }
  }

  // Shuffle all 112 together and re-index
  return shuffle(trials).map((t, i) => ({ ...t, id: i }));
}
