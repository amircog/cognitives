// Summary Statistics – Analysis for Teacher Dashboard

import { EnsembleResult, RecognitionResult, TwoAFCResult, TrialResult, StimulusType, ProbeType, FoilType } from '@/types/summary-stats';
import { VALUE_RANGES, SET_SIZES } from '@/lib/summary-stats/stimuli';

const STIM_TYPES: StimulusType[] = ['circles', 'line-lengths'];
const TYPE_NAME: Record<StimulusType, string> = { circles: 'Circles', 'line-lengths': 'Lines' };

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

// Normalize absolute error to accuracy %: 0 error → 100%, max possible error → 0%
function normalizeEnsembleAcc(absError: number, type: StimulusType): number {
  const { min, max } = VALUE_RANGES[type];
  return Math.max(0, 100 - (absError / (max - min)) * 100);
}

// ──────────────────────────────────────────────
// Per-participant stats (computed once, reused for all charts)
// ──────────────────────────────────────────────

interface PerParticipant {
  sessionId: string;
  participantName: string;
  // Chart 1: overall accuracy per type
  twoAFCAccByType:      Record<StimulusType, number>;
  recognitionAccByType: Record<StimulusType, number>;
  // Charts 2-4: accuracy per (type, setSize)
  twoAFCAccByTypeSS:      Record<StimulusType, Record<number, number>>;
  recognitionAccByTypeSS: Record<StimulusType, Record<number, number>>;
  ensembleAccByTypeSS:    Record<StimulusType, Record<number, number>>;
  // Chart 5: 2AFC accuracy per (type, foilType)
  twoAFCAccByTypeFoil: Record<StimulusType, Record<FoilType, number>>;
  // Chart 6: recognition accuracy per (type, probeType)
  recAccByTypeProbe: Record<StimulusType, Record<ProbeType, number>>;
  // Chart 7: overall scores
  ensembleAccOverall: number;
  avgBinaryAcc: number; // avg(2AFC, recognition) overall
}

function safeAcc(correct: number, total: number): number {
  return total > 0 ? (correct / total) * 100 : 50;
}

function computePerParticipant(sessionId: string, rows: TrialResult[]): PerParticipant {
  const name = rows.find(r => r.participant_name)?.participant_name ?? 'Anonymous';

  const ensRows = rows.filter((r): r is EnsembleResult  => r.trial_type === 'ensemble'    && !(r as EnsembleResult).is_practice);
  const recRows = rows.filter((r): r is RecognitionResult => r.trial_type === 'recognition');
  const afcRows = rows.filter((r): r is TwoAFCResult    => r.trial_type === '2afc');

  // Chart 1
  const twoAFCAccByType = {} as Record<StimulusType, number>;
  const recognitionAccByType = {} as Record<StimulusType, number>;
  for (const t of STIM_TYPES) {
    const af = afcRows.filter(r => r.stimulus_type === t);
    const rc = recRows.filter(r => r.stimulus_type === t);
    twoAFCAccByType[t]      = safeAcc(af.filter(r => r.is_correct).length, af.length);
    recognitionAccByType[t] = safeAcc(rc.filter(r => r.is_correct).length, rc.length);
  }

  // Charts 2-4
  const twoAFCAccByTypeSS      = {} as Record<StimulusType, Record<number, number>>;
  const recognitionAccByTypeSS = {} as Record<StimulusType, Record<number, number>>;
  const ensembleAccByTypeSS    = {} as Record<StimulusType, Record<number, number>>;
  for (const t of STIM_TYPES) {
    twoAFCAccByTypeSS[t]      = {};
    recognitionAccByTypeSS[t] = {};
    ensembleAccByTypeSS[t]    = {};
    for (const sz of SET_SIZES) {
      const af = afcRows.filter(r => r.stimulus_type === t && r.n_items === sz);
      const rc = recRows.filter(r => r.stimulus_type === t && r.n_items === sz);
      const en = ensRows.filter(r => r.stimulus_type === t && r.n_items === sz);
      twoAFCAccByTypeSS[t][sz]      = safeAcc(af.filter(r => r.is_correct).length, af.length);
      recognitionAccByTypeSS[t][sz] = safeAcc(rc.filter(r => r.is_correct).length, rc.length);
      ensembleAccByTypeSS[t][sz]    = en.length > 0
        ? mean(en.map(r => normalizeEnsembleAcc(r.absolute_error, r.stimulus_type as StimulusType)))
        : 50;
    }
  }

  // Chart 5
  const twoAFCAccByTypeFoil = {} as Record<StimulusType, Record<FoilType, number>>;
  const foilTypes: FoilType[] = ['mean', 'non-mean'];
  for (const t of STIM_TYPES) {
    twoAFCAccByTypeFoil[t] = {} as Record<FoilType, number>;
    for (const ft of foilTypes) {
      const af = afcRows.filter(r => r.stimulus_type === t && r.foil_type === ft);
      twoAFCAccByTypeFoil[t][ft] = safeAcc(af.filter(r => r.is_correct).length, af.length);
    }
  }

  // Chart 6
  const recAccByTypeProbe = {} as Record<StimulusType, Record<ProbeType, number>>;
  const probeTypes: ProbeType[] = ['target', 'foil-mean', 'foil-non-mean'];
  for (const t of STIM_TYPES) {
    recAccByTypeProbe[t] = {} as Record<ProbeType, number>;
    for (const pt of probeTypes) {
      const rc = recRows.filter(r => r.stimulus_type === t && r.probe_type === pt);
      recAccByTypeProbe[t][pt] = safeAcc(rc.filter(r => r.is_correct).length, rc.length);
    }
  }

  // Chart 7
  const ensembleAccOverall = ensRows.length > 0
    ? mean(ensRows.map(r => normalizeEnsembleAcc(r.absolute_error, r.stimulus_type as StimulusType)))
    : 50;
  const twoAFCOverall      = safeAcc(afcRows.filter(r => r.is_correct).length, afcRows.length);
  const recOverall         = safeAcc(recRows.filter(r => r.is_correct).length, recRows.length);
  const avgBinaryAcc       = (twoAFCOverall + recOverall) / 2;

  return {
    sessionId, participantName: name,
    twoAFCAccByType, recognitionAccByType,
    twoAFCAccByTypeSS, recognitionAccByTypeSS, ensembleAccByTypeSS,
    twoAFCAccByTypeFoil, recAccByTypeProbe,
    ensembleAccOverall, avgBinaryAcc,
  };
}

// ──────────────────────────────────────────────
// Aggregation helpers
// ──────────────────────────────────────────────

function aggWithSEM(vals: number[]): { val: number; sem: number } {
  return { val: Math.round(mean(vals) * 10) / 10, sem: Math.round(computeSEM(vals) * 10) / 10 };
}

// ──────────────────────────────────────────────
// Chart data types
// ──────────────────────────────────────────────

export interface Chart1Point {
  name: string;
  twoAFC: number;      twoAFCSEM: number;
  recognition: number; recognitionSEM: number;
}

export interface SetSizePoint {
  setSize: number;
  circles: number | null; circlesSEM: number | null;
  lines: number | null;   linesSEM: number | null;
}

export interface Chart5Point {
  name: string;
  mean_foil: number;    mean_foilSEM: number;
  nonmean_foil: number; nonmean_foilSEM: number;
}

export interface Chart6Point {
  name: string;
  target: number;     targetSEM: number;
  foil_mean: number;  foil_meanSEM: number;
  foil_nm: number;    foil_nmSEM: number;
}

export interface ScatterPoint { x: number; y: number; name: string; }

export interface TeacherData {
  chart1: Chart1Point[];
  chart2: SetSizePoint[];  // 2AFC by set size
  chart3: SetSizePoint[];  // recognition by set size
  chart4: SetSizePoint[];  // ensemble accuracy by set size
  chart5: Chart5Point[];   // 2AFC by foil type
  chart6: Chart6Point[];   // recognition by probe type
  chart7: ScatterPoint[];  // per participant scatter
  nParticipants: number;
}

// ──────────────────────────────────────────────
// Main computation
// ──────────────────────────────────────────────

export function computeTeacherData(allRows: TrialResult[]): TeacherData {
  // Group by session
  const bySession: Record<string, TrialResult[]> = {};
  for (const row of allRows) {
    if (!bySession[row.session_id]) bySession[row.session_id] = [];
    bySession[row.session_id].push(row);
  }

  const pStats = Object.entries(bySession).map(([sid, rows]) =>
    computePerParticipant(sid, rows)
  );

  const n = pStats.length;

  // Chart 1
  const chart1: Chart1Point[] = STIM_TYPES.map(t => {
    const afVals = pStats.map(p => p.twoAFCAccByType[t]);
    const rcVals = pStats.map(p => p.recognitionAccByType[t]);
    const af = aggWithSEM(afVals);
    const rc = aggWithSEM(rcVals);
    return { name: TYPE_NAME[t], twoAFC: af.val, twoAFCSEM: af.sem, recognition: rc.val, recognitionSEM: rc.sem };
  });

  // Charts 2-4
  const chart2: SetSizePoint[] = SET_SIZES.map(sz => {
    const cVals = pStats.map(p => p.twoAFCAccByTypeSS['circles'][sz]);
    const lVals = pStats.map(p => p.twoAFCAccByTypeSS['line-lengths'][sz]);
    const c = aggWithSEM(cVals); const l = aggWithSEM(lVals);
    return { setSize: sz, circles: c.val, circlesSEM: c.sem, lines: l.val, linesSEM: l.sem };
  });

  const chart3: SetSizePoint[] = SET_SIZES.map(sz => {
    const cVals = pStats.map(p => p.recognitionAccByTypeSS['circles'][sz]);
    const lVals = pStats.map(p => p.recognitionAccByTypeSS['line-lengths'][sz]);
    const c = aggWithSEM(cVals); const l = aggWithSEM(lVals);
    return { setSize: sz, circles: c.val, circlesSEM: c.sem, lines: l.val, linesSEM: l.sem };
  });

  const chart4: SetSizePoint[] = SET_SIZES.map(sz => {
    const cVals = pStats.map(p => p.ensembleAccByTypeSS['circles'][sz]);
    const lVals = pStats.map(p => p.ensembleAccByTypeSS['line-lengths'][sz]);
    const c = aggWithSEM(cVals); const l = aggWithSEM(lVals);
    return { setSize: sz, circles: c.val, circlesSEM: c.sem, lines: l.val, linesSEM: l.sem };
  });

  // Chart 5
  const chart5: Chart5Point[] = STIM_TYPES.map(t => {
    const mVals  = pStats.map(p => p.twoAFCAccByTypeFoil[t]['mean']);
    const nmVals = pStats.map(p => p.twoAFCAccByTypeFoil[t]['non-mean']);
    const m = aggWithSEM(mVals); const nm = aggWithSEM(nmVals);
    return { name: TYPE_NAME[t], mean_foil: m.val, mean_foilSEM: m.sem, nonmean_foil: nm.val, nonmean_foilSEM: nm.sem };
  });

  // Chart 6
  const chart6: Chart6Point[] = STIM_TYPES.map(t => {
    const tgVals = pStats.map(p => p.recAccByTypeProbe[t]['target']);
    const fmVals = pStats.map(p => p.recAccByTypeProbe[t]['foil-mean']);
    const fnVals = pStats.map(p => p.recAccByTypeProbe[t]['foil-non-mean']);
    const tg = aggWithSEM(tgVals); const fm = aggWithSEM(fmVals); const fn = aggWithSEM(fnVals);
    return {
      name: TYPE_NAME[t],
      target: tg.val, targetSEM: tg.sem,
      foil_mean: fm.val, foil_meanSEM: fm.sem,
      foil_nm: fn.val, foil_nmSEM: fn.sem,
    };
  });

  // Chart 7
  const chart7: ScatterPoint[] = pStats.map(p => ({
    x: Math.round(p.ensembleAccOverall * 10) / 10,
    y: Math.round(p.avgBinaryAcc       * 10) / 10,
    name: p.participantName,
  }));

  return { chart1, chart2, chart3, chart4, chart5, chart6, chart7, nParticipants: n };
}

// Keep for backward compat
export { computeSEM as computeSEMExport };
export type { PerParticipant as ParticipantStats };
