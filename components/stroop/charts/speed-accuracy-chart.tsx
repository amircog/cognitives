'use client';

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';
import { TrialResult, WORDS } from '@/types/stroop';

interface SpeedAccuracyChartProps {
  results: TrialResult[];
}

interface DataPoint {
  word: string;
  condition: string;
  avgRT: number;
  errorRate: number;
  totalTrials: number;
  errors: number;
}

function processData(results: TrialResult[]): DataPoint[] {
  const conditions = ['congruent', 'incongruent'];
  const dataPoints: DataPoint[] = [];

  WORDS.forEach((word) => {
    conditions.forEach((condition) => {
      const isCongruent = condition === 'congruent';
      const trials = results.filter(
        (r) => r.word_text === word && r.is_congruent === isCongruent
      );

      if (trials.length > 0) {
        const avgRT =
          trials.reduce((sum, r) => sum + r.reaction_time_ms, 0) / trials.length;
        const errors = trials.filter((r) => !r.is_correct).length;
        const errorRate = (errors / trials.length) * 100;

        dataPoints.push({
          word: word.charAt(0).toUpperCase() + word.slice(1),
          condition,
          avgRT: Math.round(avgRT),
          errorRate: Math.round(errorRate * 10) / 10,
          totalTrials: trials.length,
          errors,
        });
      }
    });
  });

  return dataPoints;
}

export function SpeedAccuracyChart({ results }: SpeedAccuracyChartProps) {
  const data = processData(results);

  const congruentData = data.filter((d) => d.condition === 'congruent');
  const incongruentData = data.filter((d) => d.condition === 'incongruent');

  // Check for speed-accuracy trade-off pattern
  const hasTradeOff = incongruentData.some((d) => d.errorRate > 0);

  return (
    <div className="w-full">
      <p className="text-sm text-muted mb-4">
        This plot reveals the speed-accuracy trade-off. Points in the upper-left (fast but many errors)
        suggest guessing, while points in the lower-right (slow but accurate) indicate careful responding.
        {hasTradeOff ? (
          <span className="text-amber-400"> You made some errors—check if they cluster in specific conditions.</span>
        ) : (
          <span className="text-emerald-400"> Perfect accuracy! You didn&apos;t sacrifice speed for accuracy.</span>
        )}
      </p>
      <div className="h-80 md:h-96">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis
              type="number"
              dataKey="avgRT"
              name="Reaction Time"
              stroke="#71717a"
              tick={{ fill: '#71717a' }}
              label={{
                value: 'Mean Reaction Time (ms)',
                position: 'bottom',
                fill: '#71717a',
                offset: 0,
              }}
            />
            <YAxis
              type="number"
              dataKey="errorRate"
              name="Error Rate"
              stroke="#71717a"
              tick={{ fill: '#71717a' }}
              domain={[0, 'auto']}
              label={{
                value: 'Error Rate (%)',
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
              formatter={(value, name) => {
                if (name === 'Reaction Time') return [`${value}ms`, 'Mean RT'];
                if (name === 'Error Rate') return [`${value}%`, 'Error Rate'];
                return [value, String(name)];
              }}
              labelFormatter={(_, payload) => {
                if (payload && payload[0]) {
                  const data = payload[0].payload as DataPoint;
                  return `${data.word} (${data.condition})`;
                }
                return '';
              }}
            />
            <ReferenceLine y={0} stroke="#71717a" strokeDasharray="3 3" />
            <Scatter name="Congruent" data={congruentData} fill="#34d399">
              {congruentData.map((entry, index) => (
                <Cell
                  key={`congruent-${index}`}
                  fill="#34d399"
                  stroke="#34d399"
                  strokeWidth={2}
                  r={8}
                />
              ))}
            </Scatter>
            <Scatter name="Incongruent" data={incongruentData} fill="#f43f5e">
              {incongruentData.map((entry, index) => (
                <Cell
                  key={`incongruent-${index}`}
                  fill="#f43f5e"
                  stroke="#f43f5e"
                  strokeWidth={2}
                  r={8}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-center gap-6 mt-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-400" />
          <span className="text-muted">Congruent</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-rose-500" />
          <span className="text-muted">Incongruent</span>
        </div>
      </div>
      <p className="text-xs text-muted text-center mt-2">
        Each point represents one word in one condition
      </p>
    </div>
  );
}
