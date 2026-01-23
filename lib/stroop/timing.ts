/**
 * High-precision timing utilities using performance.now()
 * Provides millisecond-precision timing for reaction time measurements
 */

export function getTimestamp(): number {
  return performance.now();
}

export function calculateReactionTime(startTime: number): number {
  return performance.now() - startTime;
}

export function formatReactionTime(ms: number): string {
  return `${ms.toFixed(0)}ms`;
}

export function calculateAverage(times: number[]): number {
  if (times.length === 0) return 0;
  return times.reduce((sum, t) => sum + t, 0) / times.length;
}
