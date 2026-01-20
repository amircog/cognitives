'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ErrorBar,
} from 'recharts';
import { LanguageGroup } from '@/lib/language-groups';

interface AggregateData {
  languageGroup: LanguageGroup;
  congruentMean: number;
  congruentSEM: number;
  incongruentMean: number;
  incongruentSEM: number;
  congruentCount: number;
  incongruentCount: number;
}

interface LanguageGroupBarChartProps {
  data: AggregateData[];
}

export function LanguageGroupBarChart({ data }: LanguageGroupBarChartProps) {
  const chartData = data.map((d) => ({
    name: d.languageGroup,
    Congruent: Math.round(d.congruentMean),
    CongruentSEM: Math.round(d.congruentSEM),
    Incongruent: Math.round(d.incongruentMean),
    IncongruentSEM: Math.round(d.incongruentSEM),
  }));

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart
        data={chartData}
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis
          dataKey="name"
          stroke="#a1a1aa"
          tick={{ fill: '#a1a1aa' }}
        />
        <YAxis
          stroke="#a1a1aa"
          tick={{ fill: '#a1a1aa' }}
          label={{ value: 'Reaction Time (ms)', angle: -90, position: 'insideLeft', fill: '#a1a1aa' }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#18181b',
            border: '1px solid #27272a',
            borderRadius: '8px',
          }}
          labelStyle={{ color: '#fafafa' }}
          itemStyle={{ color: '#fafafa' }}
        />
        <Legend
          wrapperStyle={{ color: '#a1a1aa' }}
        />
        <Bar dataKey="Congruent" fill="#34d399" radius={[8, 8, 0, 0]}>
          <ErrorBar dataKey="CongruentSEM" width={4} strokeWidth={2} stroke="#34d399" />
        </Bar>
        <Bar dataKey="Incongruent" fill="#f43f5e" radius={[8, 8, 0, 0]}>
          <ErrorBar dataKey="IncongruentSEM" width={4} strokeWidth={2} stroke="#f43f5e" />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
