'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import { TrialResult, WORDS } from '@/types/stroop';

interface DifferenceChartProps {
  results: TrialResult[];
}

interface DifferenceScore {
  word: string;
  difference: number;
  congruentAvg: number;
  incongruentAvg: number;
}

function processData(results: TrialResult[]): {
  wordDifferences: DifferenceScore[];
  overallDifference: number;
} {
  const wordDifferences = WORDS.map((word) => {
    const congruentTrials = results.filter(
      (r) => r.word_text === word && r.is_congruent && r.is_correct
    );
    const incongruentTrials = results.filter(
      (r) => r.word_text === word && !r.is_congruent && r.is_correct
    );

    const congruentAvg =
      congruentTrials.length > 0
        ? congruentTrials.reduce((sum, r) => sum + r.reaction_time_ms, 0) / congruentTrials.length
        : 0;

    const incongruentAvg =
      incongruentTrials.length > 0
        ? incongruentTrials.reduce((sum, r) => sum + r.reaction_time_ms, 0) / incongruentTrials.length
        : 0;

    return {
      word: word.charAt(0).toUpperCase() + word.slice(1),
      difference: Math.round(incongruentAvg - congruentAvg),
      congruentAvg: Math.round(congruentAvg),
      incongruentAvg: Math.round(incongruentAvg),
    };
  });

  // Overall difference
  const allCongruent = results.filter((r) => r.is_congruent && r.is_correct);
  const allIncongruent = results.filter((r) => !r.is_congruent && r.is_correct);

  const overallCongruentAvg =
    allCongruent.length > 0
      ? allCongruent.reduce((sum, r) => sum + r.reaction_time_ms, 0) / allCongruent.length
      : 0;

  const overallIncongruentAvg =
    allIncongruent.length > 0
      ? allIncongruent.reduce((sum, r) => sum + r.reaction_time_ms, 0) / allIncongruent.length
      : 0;

  return {
    wordDifferences,
    overallDifference: Math.round(overallIncongruentAvg - overallCongruentAvg),
  };
}

export function DifferenceChart({ results }: DifferenceChartProps) {
  const { wordDifferences, overallDifference } = processData(results);

  // Add overall to the chart
  const chartData = [
    ...wordDifferences,
    { word: 'Overall', difference: overallDifference, congruentAvg: 0, incongruentAvg: 0 },
  ];

  return (
    <div className="w-full">
      <p className="text-sm text-muted mb-4">
        The Stroop Effect magnitude for each word (Incongruent RT − Congruent RT).
        Values above zero indicate interference—the hallmark of the Stroop Effect.
        Your overall effect is{' '}
        <span className={overallDifference > 0 ? 'text-amber-400 font-semibold' : 'text-emerald-400 font-semibold'}>
          {overallDifference > 0 ? '+' : ''}{overallDifference}ms
        </span>.
      </p>
      <div className="h-80 md:h-96">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis
              dataKey="word"
              stroke="#71717a"
              tick={{ fill: '#71717a' }}
            />
            <YAxis
              stroke="#71717a"
              tick={{ fill: '#71717a' }}
              label={{
                value: 'Difference (ms)',
                angle: -90,
                position: 'insideLeft',
                fill: '#71717a',
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#18181b',
                border: '1px solid #27272a',
                borderRadius: '8px',
                color: '#fafafa',
              }}
              formatter={(value) => [
                `${Number(value) > 0 ? '+' : ''}${value}ms`,
                'Stroop Effect',
              ]}
            />
            <ReferenceLine y={0} stroke="#71717a" strokeDasharray="3 3" />
            <Bar dataKey="difference" radius={[8, 8, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    entry.word === 'Overall'
                      ? '#fbbf24'
                      : entry.difference > 0
                      ? '#f43f5e'
                      : '#34d399'
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-center gap-6 mt-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-rose-500" />
          <span className="text-muted">Positive (slower on incongruent)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-400" />
          <span className="text-muted">Negative (faster on incongruent)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-amber-400" />
          <span className="text-muted">Overall</span>
        </div>
      </div>
    </div>
  );
}
