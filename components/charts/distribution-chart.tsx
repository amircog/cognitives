'use client';

import {
  ComposedChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  Cell,
} from 'recharts';
import { TrialResult } from '@/types';

interface DistributionChartProps {
  results: TrialResult[];
}

interface DataPoint {
  condition: string;
  x: number;
  rt: number;
  isCorrect: boolean;
}

function calculateQuartiles(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  if (n === 0) return { q1: 0, median: 0, q3: 0, min: 0, max: 0 };

  const q1 = sorted[Math.floor(n * 0.25)];
  const median = sorted[Math.floor(n * 0.5)];
  const q3 = sorted[Math.floor(n * 0.75)];
  const iqr = q3 - q1;
  const min = Math.max(sorted[0], q1 - 1.5 * iqr);
  const max = Math.min(sorted[n - 1], q3 + 1.5 * iqr);

  return { q1, median, q3, min, max };
}

function processData(results: TrialResult[]): {
  scatterData: DataPoint[];
  congruentStats: ReturnType<typeof calculateQuartiles>;
  incongruentStats: ReturnType<typeof calculateQuartiles>;
} {
  const congruentRTs = results
    .filter((r) => r.is_congruent && r.is_correct)
    .map((r) => r.reaction_time_ms);

  const incongruentRTs = results
    .filter((r) => !r.is_congruent && r.is_correct)
    .map((r) => r.reaction_time_ms);

  const scatterData: DataPoint[] = [];

  // Add jittered points for congruent (x around 1)
  results
    .filter((r) => r.is_congruent)
    .forEach((r) => {
      scatterData.push({
        condition: 'Congruent',
        x: 1 + (Math.random() - 0.5) * 0.3,
        rt: r.reaction_time_ms,
        isCorrect: r.is_correct,
      });
    });

  // Add jittered points for incongruent (x around 2)
  results
    .filter((r) => !r.is_congruent)
    .forEach((r) => {
      scatterData.push({
        condition: 'Incongruent',
        x: 2 + (Math.random() - 0.5) * 0.3,
        rt: r.reaction_time_ms,
        isCorrect: r.is_correct,
      });
    });

  return {
    scatterData,
    congruentStats: calculateQuartiles(congruentRTs),
    incongruentStats: calculateQuartiles(incongruentRTs),
  };
}

export function DistributionChart({ results }: DistributionChartProps) {
  const { scatterData, congruentStats, incongruentStats } = processData(results);

  return (
    <div className="w-full">
      <p className="text-sm text-muted mb-4">
        Each dot represents a single trial. Shaded areas show the interquartile range (IQR),
        with the median line in the center. This visualization reveals the full distribution
        of your reaction times.
      </p>
      <div className="h-80 md:h-96">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis
              type="number"
              domain={[0.5, 2.5]}
              ticks={[1, 2]}
              tickFormatter={(value) => (value === 1 ? 'Congruent' : 'Incongruent')}
              stroke="#71717a"
              tick={{ fill: '#71717a' }}
            />
            <YAxis
              stroke="#71717a"
              tick={{ fill: '#71717a' }}
              label={{
                value: 'Reaction Time (ms)',
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
              formatter={(value) => [`${Math.round(Number(value))}ms`, 'RT']}
              labelFormatter={(label) => (label < 1.5 ? 'Congruent' : 'Incongruent')}
            />

            {/* Congruent IQR box */}
            <ReferenceArea
              x1={0.7}
              x2={1.3}
              y1={congruentStats.q1}
              y2={congruentStats.q3}
              fill="#34d399"
              fillOpacity={0.2}
              stroke="#34d399"
              strokeOpacity={0.5}
            />
            {/* Congruent median */}
            <ReferenceLine
              segment={[
                { x: 0.7, y: congruentStats.median },
                { x: 1.3, y: congruentStats.median },
              ]}
              stroke="#34d399"
              strokeWidth={2}
            />

            {/* Incongruent IQR box */}
            <ReferenceArea
              x1={1.7}
              x2={2.3}
              y1={incongruentStats.q1}
              y2={incongruentStats.q3}
              fill="#f43f5e"
              fillOpacity={0.2}
              stroke="#f43f5e"
              strokeOpacity={0.5}
            />
            {/* Incongruent median */}
            <ReferenceLine
              segment={[
                { x: 1.7, y: incongruentStats.median },
                { x: 2.3, y: incongruentStats.median },
              ]}
              stroke="#f43f5e"
              strokeWidth={2}
            />

            {/* Scatter points */}
            <Scatter data={scatterData} dataKey="rt">
              {scatterData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.condition === 'Congruent' ? '#34d399' : '#f43f5e'}
                  fillOpacity={entry.isCorrect ? 0.7 : 0.3}
                  stroke={entry.isCorrect ? 'none' : '#fafafa'}
                  strokeWidth={entry.isCorrect ? 0 : 1}
                />
              ))}
            </Scatter>
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-center gap-6 mt-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-400 opacity-70" />
          <span className="text-muted">Congruent (correct)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-rose-500 opacity-70" />
          <span className="text-muted">Incongruent (correct)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full border border-white opacity-50" />
          <span className="text-muted">Incorrect</span>
        </div>
      </div>
    </div>
  );
}
