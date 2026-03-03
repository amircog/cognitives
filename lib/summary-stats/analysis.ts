// Summary Statistics – Analysis Utilities

import {
  EnsembleResult, RecognitionResult, TrialResult,
  StimulusType, StatType,
  EnsembleSummary, RecognitionSummary, SessionSummary,
} from '@/types/summary-stats';

// ──────────────────────────────────────────────
// Ensemble analysis
// ──────────────────────────────────────────────

export function computeEnsembleSummary(results: EnsembleResult[]): EnsembleSummary {
  const types: StimulusType[] = ['circles', 'line-lengths', 'line-orientations'];
  const stats: StatType[] = ['mean', 'max', 'min'];

  const byType = {} as EnsembleSummary['byType'];
  for (const t of types) {
    const subset = results.filter(r => r.stimulus_type === t);
    byType[t] = {
      meanAbsError: subset.length > 0
        ? subset.reduce((s, r) => s + r.absolute_error, 0) / subset.length
        : 0,
      count: subset.length,
    };
  }

  const byStat = {} as EnsembleSummary['byStat'];
  for (const s of stats) {
    const subset = results.filter(r => r.stat_type === s);
    byStat[s] = {
      meanAbsError: subset.length > 0
        ? subset.reduce((sum, r) => sum + r.absolute_error, 0) / subset.length
        : 0,
      count: subset.length,
    };
  }

  const setSizes = [4, 8, 12];
  const bySetSize = setSizes.map(sz => {
    const subset = results.filter(r => r.n_items === sz);
    return {
      setSize: sz,
      meanAbsError: subset.length > 0
        ? subset.reduce((s, r) => s + r.absolute_error, 0) / subset.length
        : 0,
      count: subset.length,
    };
  });

  const overallMeanAbsError = results.length > 0
    ? results.reduce((s, r) => s + r.absolute_error, 0) / results.length
    : 0;

  return { byType, byStat, bySetSize, overallMeanAbsError };
}

// ──────────────────────────────────────────────
// Recognition analysis
// ──────────────────────────────────────────────

export function computeRecognitionSummary(results: RecognitionResult[]): RecognitionSummary {
  const types: StimulusType[] = ['circles', 'line-lengths', 'line-orientations'];

  const byType = {} as RecognitionSummary['byType'];
  for (const t of types) {
    const subset = results.filter(r => r.stimulus_type === t);
    const hits = subset.filter(r => r.probe_is_target && r.response_yes).length;
    const targets = subset.filter(r => r.probe_is_target).length;
    const fas = subset.filter(r => !r.probe_is_target && r.response_yes).length;
    const foils = subset.filter(r => !r.probe_is_target).length;
    byType[t] = {
      accuracy: subset.length > 0
        ? (subset.filter(r => r.is_correct).length / subset.length) * 100
        : 50,
      hitRate: targets > 0 ? (hits / targets) * 100 : 0,
      faRate: foils > 0 ? (fas / foils) * 100 : 0,
      count: subset.length,
    };
  }

  const overallCorrect = results.filter(r => r.is_correct).length;
  const overallHits = results.filter(r => r.probe_is_target && r.response_yes).length;
  const overallTargets = results.filter(r => r.probe_is_target).length;
  const overallFAs = results.filter(r => !r.probe_is_target && r.response_yes).length;
  const overallFoils = results.filter(r => !r.probe_is_target).length;

  return {
    byType,
    overallAccuracy: results.length > 0 ? (overallCorrect / results.length) * 100 : 50,
    overallHitRate: overallTargets > 0 ? (overallHits / overallTargets) * 100 : 0,
    overallFARate: overallFoils > 0 ? (overallFAs / overallFoils) * 100 : 0,
  };
}

// ──────────────────────────────────────────────
// Combined session summary
// ──────────────────────────────────────────────

export function computeSessionSummary(allResults: TrialResult[]): SessionSummary {
  const ensembleResults = allResults.filter(
    (r): r is EnsembleResult => r.trial_type === 'ensemble' && !r.is_practice
  );
  const recognitionResults = allResults.filter(
    (r): r is RecognitionResult => r.trial_type === 'recognition'
  );
  return {
    ensemble: computeEnsembleSummary(ensembleResults),
    recognition: computeRecognitionSummary(recognitionResults),
  };
}

// ──────────────────────────────────────────────
// Per-participant summary for teacher dashboard
// ──────────────────────────────────────────────

export interface ParticipantStats {
  sessionId: string;
  participantName: string;
  ensembleError: number;  // overall mean abs error
  ensembleByType: Record<StimulusType, number>; // mean abs error
  recognitionAcc: number; // overall accuracy %
  recognitionByType: Record<StimulusType, number>;
  nEnsemble: number;
  nRecognition: number;
}

export function computeParticipantStats(
  sessionId: string,
  results: TrialResult[]
): ParticipantStats {
  const participantName =
    results.find(r => r.participant_name)?.participant_name ?? 'Anonymous';

  const ensembleResults = results.filter(
    (r): r is EnsembleResult => r.trial_type === 'ensemble' && !r.is_practice
  );
  const recognitionResults = results.filter(
    (r): r is RecognitionResult => r.trial_type === 'recognition'
  );

  const types: StimulusType[] = ['circles', 'line-lengths', 'line-orientations'];
  const ensembleByType = {} as Record<StimulusType, number>;
  const recognitionByType = {} as Record<StimulusType, number>;

  for (const t of types) {
    const eSubset = ensembleResults.filter(r => r.stimulus_type === t);
    ensembleByType[t] = eSubset.length > 0
      ? eSubset.reduce((s, r) => s + r.absolute_error, 0) / eSubset.length
      : 0;

    const rSubset = recognitionResults.filter(r => r.stimulus_type === t);
    recognitionByType[t] = rSubset.length > 0
      ? (rSubset.filter(r => r.is_correct).length / rSubset.length) * 100
      : 50;
  }

  const ensembleError = ensembleResults.length > 0
    ? ensembleResults.reduce((s, r) => s + r.absolute_error, 0) / ensembleResults.length
    : 0;

  const recognitionAcc = recognitionResults.length > 0
    ? (recognitionResults.filter(r => r.is_correct).length / recognitionResults.length) * 100
    : 50;

  return {
    sessionId,
    participantName,
    ensembleError,
    ensembleByType,
    recognitionAcc,
    recognitionByType,
    nEnsemble: ensembleResults.length,
    nRecognition: recognitionResults.length,
  };
}
