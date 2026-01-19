'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface ResultsChartProps {
  congruentAvg: number;
  incongruentAvg: number;
}

export function ResultsChart({ congruentAvg, incongruentAvg }: ResultsChartProps) {
  const data = [
    {
      name: 'Congruent',
      avgTime: Math.round(congruentAvg),
      fill: '#34d399',
    },
    {
      name: 'Incongruent',
      avgTime: Math.round(incongruentAvg),
      fill: '#f43f5e',
    },
  ];

  return (
    <div className="w-full h-80 md:h-96">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis
            dataKey="name"
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
            formatter={(value) => [`${value}ms`, 'Average Time']}
          />
          <Bar dataKey="avgTime" radius={[8, 8, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
