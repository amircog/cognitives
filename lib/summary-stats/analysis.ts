// Summary Statistics – Analysis Utilities

import {
  EnsembleResult, RecognitionResult, TwoAFCResult, TrialResult,
  StimulusType, StatType,
  EnsembleSummary, RecognitionSummary, TwoAFCSummary, SessionSummary,
} from '@/types/summary-stats';

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

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

const STIM_TYPES: StimulusType[] = ['circles', 'line-lengths', 'line-orientations'];
const STAT_TYPES: StatType[] = ['mean', 'max', 'min'];

// ──────────────────────────────────────────────
// Ensemble analysis
// ──────────────────────────────────────────────

export function computeEnsembleSummary(results: EnsembleResult[]): EnsembleSummary {
  const byType = {} as EnsembleSummary['byType'];
  for (const t of STIM_TYPES) {
    const subset = results.filter(r => r.stimulus_type === t);
    byType[t] = {
      meanAbsError: mean(subset.map(r => r.absolute_error)),
      count: subset.length,
    };
  }

  const byStat = {} as EnsembleSummary['byStat'];
  for (const s of STAT_TYPES) {
    const subset = results.filter(r => r.stat_type === s);
    byStat[s] = {
      meanAbsError: mean(subset.map(r => r.absolute_error)),
      count: subset.length,
    };
  }

  const bySetSize = [4, 8, 12].map(sz => {
    const subset = results.filter(r => r.n_items === sz);
    return {
      setSize: sz,
      meanAbsError: mean(subset.map(r => r.absolute_error)),
      count: subset.length,
    };
  });

  return {
    byType,
    byStat,
    bySetSize,
    overallMeanAbsError: mean(results.map(r => r.absolute_error)),
  };
}

// ──────────────────────────────────────────────
// Recognition analysis
// ──────────────────────────────────────────────

export function computeRecognitionSummary(results: RecognitionResult[]): RecognitionSummary {
  const byType = {} as RecognitionSummary['byType'];
  for (const t of STIM_TYPES) {
    const subset  = results.filter(r => r.stimulus_type === t);
    const hits    = subset.filter(r =>  r.probe_is_target &&  r.response_yes).length;
    const targets = subset.filter(r =>  r.probe_is_target).length;
    const fas     = subset.filter(r => !r.probe_is_target &&  r.response_yes).length;
    const foils   = subset.filter(r => !r.probe_is_target).length;
    byType[t] = {
      accuracy:  subset.length > 0 ? (subset.filter(r => r.is_correct).length / subset.length) * 100 : 50,
      hitRate:   targets > 0 ? (hits / targets) * 100 : 0,
      faRate:    foils   > 0 ? (fas  / foils)   * 100 : 0,
      count:     subset.length,
    };
  }

  const correct = results.filter(r => r.is_correct).length;
  const hits    = results.filter(r =>  r.probe_is_target &&  r.response_yes).length;
  const targets = results.filter(r =>  r.probe_is_target).length;
  const fas     = results.filter(r => !r.probe_is_target &&  r.response_yes).length;
  const foils   = results.filter(r => !r.probe_is_target).length;

  return {
    byType,
    overallAccuracy: results.length > 0 ? (correct / results.length) * 100 : 50,
    overallHitRate:  targets > 0 ? (hits / targets) * 100 : 0,
    overallFARate:   foils   > 0 ? (fas  / foils)   * 100 : 0,
  };
}

// ──────────────────────────────────────────────
// 2AFC analysis
// ──────────────────────────────────────────────

export function compute2AFCSummary(results: TwoAFCResult[]): TwoAFCSummary {
  const byType = {} as TwoAFCSummary['byType'];
  for (const t of STIM_TYPES) {
    const subset = results.filter(r => r.stimulus_type === t);
    byType[t] = {
      accuracy: subset.length > 0
        ? (subset.filter(r => r.is_correct).length / subset.length) * 100
        : 50,
      count: subset.length,
    };
  }
  return {
    byType,
    overallAccuracy: results.length > 0
      ? (results.filter(r => r.is_correct).length / results.length) * 100
      : 50,
  };
}

// ──────────────────────────────────────────────
// Combined session summary
// ──────────────────────────────────────────────

export function computeSessionSummary(allResults: TrialResult[]): SessionSummary {
  const ensembleResults    = allResults.filter((r): r is EnsembleResult    => r.trial_type === 'ensemble'    && !(r as EnsembleResult).is_practice);
  const recognitionResults = allResults.filter((r): r is RecognitionResult => r.trial_type === 'recognition');
  const twoAFCResults      = allResults.filter((r): r is TwoAFCResult      => r.trial_type === '2afc');

  return {
    ensemble:    computeEnsembleSummary(ensembleResults),
    recognition: computeRecognitionSummary(recognitionResults),
    twoAFC:      compute2AFCSummary(twoAFCResults),
  };
}

// ──────────────────────────────────────────────
// Per-participant summary for teacher dashboard
// ──────────────────────────────────────────────

export interface ParticipantStats {
  sessionId: string;
  participantName: string;
  ensembleError: number;
  ensembleByType: Record<StimulusType, number>;
  recognitionAcc: number;
  recognitionByType: Record<StimulusType, number>;
  twoAFCAcc: number;
  twoAFCByType: Record<StimulusType, number>;
  nEnsemble: number;
  nRecognition: number;
  nTwoAFC: number;
}

export function computeParticipantStats(
  sessionId: string,
  results: TrialResult[],
): ParticipantStats {
  const participantName =
    results.find(r => r.participant_name)?.participant_name ?? 'Anonymous';

  const ensembleResults    = results.filter((r): r is EnsembleResult    => r.trial_type === 'ensemble'    && !(r as EnsembleResult).is_practice);
  const recognitionResults = results.filter((r): r is RecognitionResult => r.trial_type === 'recognition');
  const twoAFCResults      = results.filter((r): r is TwoAFCResult      => r.trial_type === '2afc');

  const ensembleByType    = {} as Record<StimulusType, number>;
  const recognitionByType = {} as Record<StimulusType, number>;
  const twoAFCByType      = {} as Record<StimulusType, number>;

  for (const t of STIM_TYPES) {
    const eS = ensembleResults.filter(r => r.stimulus_type === t);
    ensembleByType[t] = mean(eS.map(r => r.absolute_error));

    const rS = recognitionResults.filter(r => r.stimulus_type === t);
    recognitionByType[t] = rS.length > 0
      ? (rS.filter(r => r.is_correct).length / rS.length) * 100
      : 50;

    const fS = twoAFCResults.filter(r => r.stimulus_type === t);
    twoAFCByType[t] = fS.length > 0
      ? (fS.filter(r => r.is_correct).length / fS.length) * 100
      : 50;
  }

  return {
    sessionId,
    participantName,
    ensembleError:   mean(ensembleResults.map(r => r.absolute_error)),
    ensembleByType,
    recognitionAcc:  recognitionResults.length > 0
      ? (recognitionResults.filter(r => r.is_correct).length / recognitionResults.length) * 100 : 50,
    recognitionByType,
    twoAFCAcc:       twoAFCResults.length > 0
      ? (twoAFCResults.filter(r => r.is_correct).length / twoAFCResults.length) * 100 : 50,
    twoAFCByType,
    nEnsemble:    ensembleResults.length,
    nRecognition: recognitionResults.length,
    nTwoAFC:      twoAFCResults.length,
  };
}

// ──────────────────────────────────────────────
// Aggregate chart + scatter data for teacher page
// ──────────────────────────────────────────────

export interface AggChartPoint {
  name: string;
  recognition: number;
  recognitionSEM: number;
  twoAFC: number;
  twoAFCSEM: number;
}

export function computeAggChartData(
  participants: ParticipantStats[],
  language: 'en' | 'he',
  typeLabels: Record<StimulusType, { en: string; he: string }>,
): AggChartPoint[] {
  return STIM_TYPES.map(st => {
    const recVals = participants.map(p => p.recognitionByType[st]);
    const twVals  = participants.map(p => p.twoAFCByType[st]);
    return {
      name:           typeLabels[st][language],
      recognition:    Math.round(mean(recVals) * 10) / 10,
      recognitionSEM: Math.round(computeSEM(recVals) * 10) / 10,
      twoAFC:         Math.round(mean(twVals) * 10) / 10,
      twoAFCSEM:      Math.round(computeSEM(twVals) * 10) / 10,
    };
  });
}

export interface ScatterPoint { x: number; y: number; name: string; }

/** Scatter 4a: ensemble error (x-axis) vs 2AFC accuracy (y-axis) */
export function scatterEnsembleVs2AFC(participants: ParticipantStats[]): ScatterPoint[] {
  return participants.map(p => ({
    x: Math.round(p.ensembleError * 10) / 10,
    y: Math.round(p.twoAFCAcc    * 10) / 10,
    name: p.participantName,
  }));
}

/** Scatter 4b: 2AFC accuracy (x-axis) vs item recognition accuracy (y-axis) */
export function scatter2AFCVsRecognition(participants: ParticipantStats[]): ScatterPoint[] {
  return participants.map(p => ({
    x: Math.round(p.twoAFCAcc      * 10) / 10,
    y: Math.round(p.recognitionAcc * 10) / 10,
    name: p.participantName,
  }));
}
