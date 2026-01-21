'use client';

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ZAxis,
} from 'recharts';
import { LanguageGroup } from '@/lib/language-groups';

interface SubjectData {
  sessionId: string;
  congruentMean: number;
  incongruentMean: number;
  accuracy: number;
  languageGroup: LanguageGroup;
}

interface IndividualScatterChartProps {
  data: SubjectData[];
}

const LANGUAGE_GROUP_COLORS: Record<LanguageGroup, string> = {
  English: '#3b82f6',
  Hebrew: '#a855f7',
  Spanish: '#f59e0b',
  'Non-words': '#6b7280',
};

export function IndividualScatterChart({ data }: IndividualScatterChartProps) {
  const groupedData = {
    English: data.filter((d) => d.languageGroup === 'English'),
    Hebrew: data.filter((d) => d.languageGroup === 'Hebrew'),
    Spanish: data.filter((d) => d.languageGroup === 'Spanish'),
    'Non-words': data.filter((d) => d.languageGroup === 'Non-words'),
  };

  const scatterData = (group: LanguageGroup) =>
    groupedData[group].map((d) => ({
      x: Math.round(d.congruentMean),
      y: Math.round(d.incongruentMean),
      name: group,
    }));

  return (
    <ResponsiveContainer width="100%" height={500}>
      <ScatterChart
        margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis
          type="number"
          dataKey="x"
          name="Congruent RT"
          stroke="#a1a1aa"
          tick={{ fill: '#a1a1aa' }}
          label={{ value: 'Congruent RT (ms)', position: 'insideBottom', offset: -5, fill: '#a1a1aa' }}
        />
        <YAxis
          type="number"
          dataKey="y"
          name="Incongruent RT"
          stroke="#a1a1aa"
          tick={{ fill: '#a1a1aa' }}
          label={{ value: 'Incongruent RT (ms)', angle: -90, position: 'insideLeft', fill: '#a1a1aa' }}
        />
        <ZAxis range={[100, 100]} />
        <Tooltip
          cursor={{ strokeDasharray: '3 3' }}
          contentStyle={{
            backgroundColor: '#18181b',
            border: '1px solid #27272a',
            borderRadius: '8px',
          }}
          labelStyle={{ color: '#fafafa' }}
          itemStyle={{ color: '#fafafa' }}
          formatter={(value: number | undefined) => value !== undefined ? `${value} ms` : ''}
        />
        <Legend
          wrapperStyle={{ color: '#a1a1aa' }}
        />
        <Scatter
          name="English"
          data={scatterData('English')}
          fill={LANGUAGE_GROUP_COLORS.English}
        />
        <Scatter
          name="Hebrew"
          data={scatterData('Hebrew')}
          fill={LANGUAGE_GROUP_COLORS.Hebrew}
        />
        <Scatter
          name="Spanish"
          data={scatterData('Spanish')}
          fill={LANGUAGE_GROUP_COLORS.Spanish}
        />
        <Scatter
          name="Non-words"
          data={scatterData('Non-words')}
          fill={LANGUAGE_GROUP_COLORS['Non-words']}
        />
      </ScatterChart>
    </ResponsiveContainer>
  );
}
