import { TrialResult } from '@/types/composite-face';

function mean(vals: number[]): number {
  if (!vals.length) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function sem(vals: number[]): number {
  if (vals.length < 2) return 0;
  const m = mean(vals);
  const variance = vals.reduce((acc, v) => acc + (v - m) ** 2, 0) / (vals.length - 1);
  return Math.sqrt(variance / vals.length);
}

function round1(n: number) { return Math.round(n * 10) / 10; }

function acc(rows: TrialResult[]): number {
  if (!rows.length) return 0;
  return (rows.filter(r => r.is_correct).length / rows.length) * 100;
}

function rtMean(rows: TrialResult[]): number {
  const correct = rows.filter(r => r.is_correct);
  return correct.length ? mean(correct.map(r => r.reaction_time_ms)) : 0;
}

// ── Per-participant ──────────────────────────────────────────────────────────

interface PerParticipant {
  name: string;
  alignedAcc:     number;
  smallAcc:       number;
  largeAcc:       number;
  misalignedAcc:  number; // average of small + large
  alignedRT:      number;
  smallRT:        number;
  largeRT:        number;
  misalignedRT:   number;
}

function computePerParticipant(rows: TrialResult[]): PerParticipant {
  const main = rows.filter(r => !r.is_practice);
  const aligned = main.filter(r => r.condition === 'aligned');
  const small   = main.filter(r => r.condition === 'small-misaligned');
  const large   = main.filter(r => r.condition === 'large-misaligned');

  const aA = acc(aligned), sA = acc(small), lA = acc(large);
  const aRT = rtMean(aligned), sRT = rtMean(small), lRT = rtMean(large);

  return {
    name:           rows.find(r => r.participant_name)?.participant_name ?? 'Anonymous',
    alignedAcc:     aA,
    smallAcc:       sA,
    largeAcc:       lA,
    misalignedAcc:  (sA + lA) / 2,
    alignedRT:      aRT,
    smallRT:        sRT,
    largeRT:        lRT,
    misalignedRT:   (sRT + lRT) / 2,
  };
}

// ── Public types ─────────────────────────────────────────────────────────────

export interface BarPoint { name: string; value: number; sem: number; }
export interface ScatterPoint { x: number; y: number; name: string; }

export interface TeacherData {
  chart1: BarPoint[];   // accuracy: aligned vs. misaligned (collapsed)
  chart2: BarPoint[];   // RT: aligned vs. misaligned (collapsed)
  chart3: BarPoint[];   // accuracy: small vs. large misalignment
  chart4: BarPoint[];   // RT: small vs. large misalignment
  chart5: ScatterPoint[]; // per participant scatter
  nParticipants: number;
}

// ── Main computation ─────────────────────────────────────────────────────────

export function computeTeacherData(allRows: TrialResult[]): TeacherData {
  const bySession: Record<string, TrialResult[]> = {};
  for (const row of allRows) {
    if (!row.session_id) continue;
    (bySession[row.session_id] ??= []).push(row);
  }

  const pStats = Object.values(bySession).map(computePerParticipant);
  const n = pStats.length;

  function barPoints(
    keys: (keyof PerParticipant)[],
    labels: string[],
    getter: (p: PerParticipant, k: keyof PerParticipant) => number,
  ): BarPoint[] {
    return keys.map((k, i) => {
      const vals = pStats.map(p => getter(p, k));
      return { name: labels[i], value: round1(mean(vals)), sem: round1(sem(vals)) };
    });
  }

  const chart1 = barPoints(
    ['alignedAcc', 'misalignedAcc'],
    ['Aligned', 'Misaligned'],
    (p, k) => p[k] as number,
  );
  const chart2 = barPoints(
    ['alignedRT', 'misalignedRT'],
    ['Aligned', 'Misaligned'],
    (p, k) => p[k] as number,
  );
  const chart3 = barPoints(
    ['smallAcc', 'largeAcc'],
    ['Small Misaligned', 'Large Misaligned'],
    (p, k) => p[k] as number,
  );
  const chart4 = barPoints(
    ['smallRT', 'largeRT'],
    ['Small Misaligned', 'Large Misaligned'],
    (p, k) => p[k] as number,
  );
  const chart5: ScatterPoint[] = pStats.map(p => ({
    x: round1(p.alignedAcc),
    y: round1(p.misalignedAcc),
    name: p.name,
  }));

  return { chart1, chart2, chart3, chart4, chart5, nParticipants: n };
}
