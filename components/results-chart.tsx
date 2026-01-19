'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ErrorBar,
} from 'recharts';
import { TrialResult } from '@/types';

interface ResultsChartProps {
  results: TrialResult[];
}

interface WordStats {
  word: string;
  congruentMean: number;
  congruentSE: number;
  incongruentMean: number;
  incongruentSE: number;
}

function calculateMean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function calculateStandardError(values: number[]): number {
  if (values.length <= 1) return 0;
  const mean = calculateMean(values);
  const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
  const variance = squaredDiffs.reduce((sum, v) => sum + v, 0) / (values.length - 1);
  const stdDev = Math.sqrt(variance);
  return stdDev / Math.sqrt(values.length);
}

function processResults(results: TrialResult[]): WordStats[] {
  const words = ['red', 'green', 'yellow'];

  return words.map((word) => {
    const congruentTimes = results
      .filter((r) => r.word_text === word && r.is_congruent && r.is_correct)
      .map((r) => r.reaction_time_ms);

    const incongruentTimes = results
      .filter((r) => r.word_text === word && !r.is_congruent && r.is_correct)
      .map((r) => r.reaction_time_ms);

    return {
      word: word.charAt(0).toUpperCase() + word.slice(1),
      congruentMean: Math.round(calculateMean(congruentTimes)),
      congruentSE: Math.round(calculateStandardError(congruentTimes)),
      incongruentMean: Math.round(calculateMean(incongruentTimes)),
      incongruentSE: Math.round(calculateStandardError(incongruentTimes)),
    };
  });
}

export function ResultsChart({ results }: ResultsChartProps) {
  const data = processResults(results);

  return (
    <div className="w-full h-80 md:h-96">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          barGap={4}
          barCategoryGap="20%"
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis
            dataKey="word"
            stroke="#71717a"
            tick={{ fill: '#71717a' }}
            axisLine={{ stroke: '#27272a' }}
          />
          <YAxis
            stroke="#71717a"
            tick={{ fill: '#71717a' }}
            axisLine={{ stroke: '#27272a' }}
            label={{
              value: 'Average Reaction Time (ms)',
              angle: -90,
              position: 'insideLeft',
              fill: '#71717a',
              style: { textAnchor: 'middle' },
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
              const label = name === 'congruentMean' ? 'Congruent' : 'Incongruent';
              return [`${value}ms`, label];
            }}
            labelStyle={{ color: '#fafafa', fontWeight: 'bold' }}
          />
          <Legend
            formatter={(value) => {
              if (value === 'congruentMean') return 'Congruent';
              if (value === 'incongruentMean') return 'Incongruent';
              return value;
            }}
            wrapperStyle={{ color: '#71717a' }}
          />
          <Bar
            dataKey="congruentMean"
            fill="#34d399"
            radius={[4, 4, 0, 0]}
            name="congruentMean"
          >
            <ErrorBar
              dataKey="congruentSE"
              width={4}
              strokeWidth={2}
              stroke="#fafafa"
            />
          </Bar>
          <Bar
            dataKey="incongruentMean"
            fill="#f43f5e"
            radius={[4, 4, 0, 0]}
            name="incongruentMean"
          >
            <ErrorBar
              dataKey="incongruentSE"
              width={4}
              strokeWidth={2}
              stroke="#fafafa"
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
