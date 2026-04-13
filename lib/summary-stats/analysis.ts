// Summary Statistics – Analysis for Teacher Dashboard
// Designed to handle both new data (circles/line-lengths) and
// old data (line-orientations) gracefully.

import { EnsembleResult, RecognitionResult, TrialResult, ProbeType } from '@/types/summary-stats';
import { VALUE_RANGES, SET_SIZES } from '@/lib/summary-stats/stimuli';

const VALID_STIM_TYPES = ['circles', 'line-lengths'] as const;
type ValidType = typeof VALID_STIM_TYPES[number];

function mean(vals: number[]): number {
  if (vals.length === 0) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

export function computeSEM(vals: number[]): number {
  if (vals.length < 2) return 0;
  const m = mean(vals);
  const variance = vals.reduce((acc, v) => acc + (v - m) ** 2, 0) / (vals.length - 1);
  return Math.sqrt(variance / vals.length);
}

// Normalize absolute error → accuracy % (0=worst, 100=perfect)
// Handles unknown types gracefully (returns null to be excluded from aggregation)
function normalizeEnsembleAcc(absError: number, type: string): number | null {
  const info = VALUE_RANGES[type as ValidType];
  if (!info) return null; // skip unknown types (e.g. old 'line-orientations' rows)
  return Math.max(0, 100 - (absError / (info.max - info.min)) * 100);
}

function safeAcc(correct: number, total: number): number {
  return total > 0 ? (correct / total) * 100 : 50;
}

function aggWithSEM(vals: number[]): { val: number; sem: number } {
  return {
    val: Math.round(mean(vals) * 10) / 10,
    sem: Math.round(computeSEM(vals) * 10) / 10,
  };
}

// ──────────────────────────────────────────────
// Per-participant stats
// ──────────────────────────────────────────────

interface PerParticipant {
  sessionId: string;
  participantName: string;
  recognitionAccByType: Record<ValidType, number>;
  ensembleAccByType:    Record<ValidType, number>;
  recognitionAccByTypeSS: Record<ValidType, Record<number, number>>;
  ensembleAccByTypeSS:    Record<ValidType, Record<number, number>>;
  recAccByTypeProbe: Record<ValidType, Record<ProbeType, number>>;
  ensembleAccOverall:    number;
  recognitionAccOverall: number;
}

function computePerParticipant(sessionId: string, rows: TrialResult[]): PerParticipant {
  const name = rows.find(r => r.participant_name)?.participant_name ?? 'Anonymous';

  const ensRows = rows.filter(
    (r): r is EnsembleResult =>
      r.trial_type === 'ensemble' &&
      VALID_STIM_TYPES.includes(r.stimulus_type as ValidType) &&
      !(r as EnsembleResult).is_practice,
  );
  const recRows = rows.filter(
    (r): r is RecognitionResult =>
      r.trial_type === 'recognition' &&
      VALID_STIM_TYPES.includes(r.stimulus_type as ValidType),
  );

  const recognitionAccByType = {} as Record<ValidType, number>;
  const ensembleAccByType    = {} as Record<ValidType, number>;
  const recognitionAccByTypeSS = {} as Record<ValidType, Record<number, number>>;
  const ensembleAccByTypeSS    = {} as Record<ValidType, Record<number, number>>;
  const recAccByTypeProbe = {} as Record<ValidType, Record<ProbeType, number>>;

  const probeTypes: ProbeType[] = ['target', 'foil-mean', 'foil-non-mean'];

  for (const t of VALID_STIM_TYPES) {
    const recT = recRows.filter(r => r.stimulus_type === t);
    const ensT = ensRows.filter(r => r.stimulus_type === t);

    // Chart 1 – overall per type
    recognitionAccByType[t] = safeAcc(recT.filter(r => r.is_correct).length, recT.length);
    const ensAccVals = ensT.map(r => normalizeEnsembleAcc(r.absolute_error, r.stimulus_type)).filter((v): v is number => v !== null);
    ensembleAccByType[t] = ensAccVals.length > 0 ? mean(ensAccVals) : 50;

    // Charts 2-3 – by set size
    recognitionAccByTypeSS[t] = {};
    ensembleAccByTypeSS[t]    = {};
    for (const sz of SET_SIZES) {
      const rc = recT.filter(r => r.n_items === sz);
      const en = ensT.filter(r => r.n_items === sz);
      recognitionAccByTypeSS[t][sz] = safeAcc(rc.filter(r => r.is_correct).length, rc.length);
      const enAccVals = en.map(r => normalizeEnsembleAcc(r.absolute_error, r.stimulus_type)).filter((v): v is number => v !== null);
      ensembleAccByTypeSS[t][sz] = enAccVals.length > 0 ? mean(enAccVals) : 50;
    }

    // Chart 4 – recognition by probe type
    recAccByTypeProbe[t] = {} as Record<ProbeType, number>;
    for (const pt of probeTypes) {
      const rc = recT.filter(r => r.probe_type === pt);
      recAccByTypeProbe[t][pt] = safeAcc(rc.filter(r => r.is_correct).length, rc.length);
    }
  }

  // Chart 5 – overall
  const allEnsAccVals = ensRows.map(r => normalizeEnsembleAcc(r.absolute_error, r.stimulus_type)).filter((v): v is number => v !== null);
  const ensembleAccOverall = allEnsAccVals.length > 0 ? mean(allEnsAccVals) : 50;
  const recognitionAccOverall = safeAcc(recRows.filter(r => r.is_correct).length, recRows.length);

  return {
    sessionId, participantName: name,
    recognitionAccByType, ensembleAccByType,
    recognitionAccByTypeSS, ensembleAccByTypeSS,
    recAccByTypeProbe,
    ensembleAccOverall, recognitionAccOverall,
  };
}

// ──────────────────────────────────────────────
// Chart data types
// ──────────────────────────────────────────────

export interface Chart1Point {
  name: string;
  recognition: number; recognitionSEM: number;
  ensemble: number;    ensembleSEM: number;
}
export interface SetSizePoint {
  setSize: number;
  circles: number; circlesSEM: number;
  lines: number;   linesSEM: number;
}
export interface Chart4Point {
  name: string;
  target: number;    targetSEM: number;
  foil_mean: number; foil_meanSEM: number;
  foil_nm: number;   foil_nmSEM: number;
}
export interface ScatterPoint { x: number; y: number; name: string; }

export interface TeacherData {
  chart1: Chart1Point[];   // recognition + ensemble accuracy by stimulus type
  chart2: SetSizePoint[];  // recognition accuracy × set size
  chart3: SetSizePoint[];  // ensemble accuracy × set size
  chart4: Chart4Point[];   // recognition accuracy × probe type
  chart5: ScatterPoint[];  // per-participant scatter
  nParticipants: number;
}

// ──────────────────────────────────────────────
// Main computation
// ──────────────────────────────────────────────

export function computeTeacherData(allRows: TrialResult[]): TeacherData {
  const bySession: Record<string, TrialResult[]> = {};
  for (const row of allRows) {
    const sid = row.session_id;
    if (!sid) continue;
    if (!bySession[sid]) bySession[sid] = [];
    bySession[sid].push(row);
  }

  const pStats = Object.entries(bySession).map(([sid, rows]) =>
    computePerParticipant(sid, rows)
  );

  const n = pStats.length;

  const TYPE_NAMES: Record<ValidType, string> = { circles: 'Circles', 'line-lengths': 'Lines' };

  const chart1: Chart1Point[] = VALID_STIM_TYPES.map(t => {
    const recVals = pStats.map(p => p.recognitionAccByType[t]);
    const ensVals = pStats.map(p => p.ensembleAccByType[t]);
    const rec = aggWithSEM(recVals); const ens = aggWithSEM(ensVals);
    return { name: TYPE_NAMES[t], recognition: rec.val, recognitionSEM: rec.sem, ensemble: ens.val, ensembleSEM: ens.sem };
  });

  const chart2: SetSizePoint[] = SET_SIZES.map(sz => {
    const cVals = pStats.map(p => p.recognitionAccByTypeSS['circles'][sz]);
    const lVals = pStats.map(p => p.recognitionAccByTypeSS['line-lengths'][sz]);
    const c = aggWithSEM(cVals); const l = aggWithSEM(lVals);
    return { setSize: sz, circles: c.val, circlesSEM: c.sem, lines: l.val, linesSEM: l.sem };
  });

  const chart3: SetSizePoint[] = SET_SIZES.map(sz => {
    const cVals = pStats.map(p => p.ensembleAccByTypeSS['circles'][sz]);
    const lVals = pStats.map(p => p.ensembleAccByTypeSS['line-lengths'][sz]);
    const c = aggWithSEM(cVals); const l = aggWithSEM(lVals);
    return { setSize: sz, circles: c.val, circlesSEM: c.sem, lines: l.val, linesSEM: l.sem };
  });

  const chart4: Chart4Point[] = VALID_STIM_TYPES.map(t => {
    const tgVals = pStats.map(p => p.recAccByTypeProbe[t]['target']);
    const fmVals = pStats.map(p => p.recAccByTypeProbe[t]['foil-mean']);
    const fnVals = pStats.map(p => p.recAccByTypeProbe[t]['foil-non-mean']);
    const tg = aggWithSEM(tgVals); const fm = aggWithSEM(fmVals); const fn = aggWithSEM(fnVals);
    return { name: TYPE_NAMES[t], target: tg.val, targetSEM: tg.sem, foil_mean: fm.val, foil_meanSEM: fm.sem, foil_nm: fn.val, foil_nmSEM: fn.sem };
  });

  const chart5: ScatterPoint[] = pStats.map(p => ({
    x: Math.round(p.ensembleAccOverall    * 10) / 10,
    y: Math.round(p.recognitionAccOverall * 10) / 10,
    name: p.participantName,
  }));

  return { chart1, chart2, chart3, chart4, chart5, nParticipants: n };
}
