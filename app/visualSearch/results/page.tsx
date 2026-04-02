'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { Search, Clock, CheckCircle } from 'lucide-react';
import { VisualSearchResult } from '@/types/visual-search';

const SS_LEVELS = [1, 2, 4, 8];

interface SetSizePoint {
  setSize: number;
  rt: number | null;
  accuracy: number | null;
}

interface Stats {
  avgRT: number;
  accuracy: number;
  targetSSData: SetSizePoint[];
  distractorSSData: SetSizePoint[];
  targetColor: string;
}

function computeStats(results: VisualSearchResult[]): Stats {
  const main = results.filter(r => !r.is_practice);
  const correct = main.filter(r => r.correct);

  const avgRT = correct.length > 0
    ? Math.round(correct.reduce((s, r) => s + r.rt_ms, 0) / correct.length)
    : 0;
  const accuracy = main.length > 0
    ? Math.round((correct.length / main.length) * 100)
    : 0;

  const meanRT = (rows: VisualSearchResult[]) =>
    rows.length > 0 ? Math.round(rows.reduce((s, r) => s + r.rt_ms, 0) / rows.length) : null;
  const acc = (rows: VisualSearchResult[]) =>
    rows.length > 0 ? Math.round((rows.filter(r => r.correct).length / rows.length) * 100) : null;

  const targetSSData: SetSizePoint[] = SS_LEVELS.map(ss => ({
    setSize: ss,
    rt: meanRT(correct.filter(r => r.target_set_size === ss)),
    accuracy: acc(main.filter(r => r.target_set_size === ss)),
  }));

  const distractorSSData: SetSizePoint[] = SS_LEVELS.map(ss => ({
    setSize: ss,
    rt: meanRT(correct.filter(r => r.distractor_set_size === ss)),
    accuracy: acc(main.filter(r => r.distractor_set_size === ss)),
  }));

  const targetColor = main[0]?.target_color ?? 'red';
  return { avgRT, accuracy, targetSSData, distractorSSData, targetColor };
}

export default function VisualSearchResultsPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem('visual_search_results');
    if (!raw) { router.push('/visualSearch'); return; }
    try {
      const results: VisualSearchResult[] = JSON.parse(raw);
      setStats(computeStats(results));
    } catch {
      router.push('/visualSearch');
    }
  }, [router]);

  if (!stats) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-muted">טוען תוצאות...</p>
      </main>
    );
  }

  const chartStyle = { background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8 };
  const axisStyle = { fill: '#a1a1aa', fontSize: 11 };

  return (
    <main className="min-h-screen flex flex-col items-center py-8 px-4 md:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-4xl"
      >
        <div className="flex items-center justify-center gap-3 mb-2">
          <Search className="w-8 h-8 text-rose-400" />
          <h1 className="text-4xl md:text-5xl font-bold text-center">התוצאות שלך</h1>
        </div>
        <p className="text-muted text-center mb-8">ניסוי חיפוש חזותי</p>

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 text-muted text-sm mb-1">
              <Clock className="w-4 h-4 text-blue-400" />
              <span>Avg RT</span>
            </div>
            <div className="text-2xl font-bold text-blue-400">{stats.avgRT}ms</div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 text-muted text-sm mb-1">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>Accuracy</span>
            </div>
            <div className="text-2xl font-bold text-emerald-400">{stats.accuracy}%</div>
          </div>
        </div>

        {/* RT vs target set size */}
        <div className="bg-card border border-border rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-1">RT & Accuracy vs Target Set Size</h2>
          <p className="text-sm text-muted mb-4">Same-color items (including target T when present)</p>
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={stats.targetSSData} margin={{ left: 10, right: 40, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
              <XAxis dataKey="setSize" tick={axisStyle}
                label={{ value: 'Target Set Size', position: 'insideBottom', offset: -10, style: axisStyle }} />
              <YAxis yAxisId="rt" orientation="left" tick={axisStyle}
                label={{ value: 'RT (ms)', angle: -90, position: 'insideLeft', style: axisStyle }} />
              <YAxis yAxisId="acc" orientation="right" domain={[0, 100]} tick={axisStyle}
                label={{ value: 'Accuracy (%)', angle: 90, position: 'insideRight', style: axisStyle }} />
              <Tooltip contentStyle={chartStyle} formatter={(v: any) => v != null ? [v, ''] : ['N/A', ''] as any} />
              <Legend wrapperStyle={{ color: '#a1a1aa', paddingTop: 8 }} />
              <Bar yAxisId="rt" dataKey="rt" name="RT (ms)" fill="#3b82f6" opacity={0.7} radius={[3, 3, 0, 0]} />
              <Line yAxisId="acc" type="monotone" dataKey="accuracy" name="Accuracy (%)"
                stroke="#fb7185" strokeWidth={2.5} dot={{ r: 5, fill: '#fb7185' }} connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* RT vs distractor set size */}
        <div className="bg-card border border-border rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold mb-1">RT & Accuracy vs Distractor Set Size</h2>
          <p className="text-sm text-muted mb-4">Opposite-color T's in display</p>
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={stats.distractorSSData} margin={{ left: 10, right: 40, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
              <XAxis dataKey="setSize" tick={axisStyle}
                label={{ value: 'Distractor Set Size', position: 'insideBottom', offset: -10, style: axisStyle }} />
              <YAxis yAxisId="rt" orientation="left" tick={axisStyle}
                label={{ value: 'RT (ms)', angle: -90, position: 'insideLeft', style: axisStyle }} />
              <YAxis yAxisId="acc" orientation="right" domain={[0, 100]} tick={axisStyle}
                label={{ value: 'Accuracy (%)', angle: 90, position: 'insideRight', style: axisStyle }} />
              <Tooltip contentStyle={chartStyle} formatter={(v: any) => v != null ? [v, ''] : ['N/A', ''] as any} />
              <Legend wrapperStyle={{ color: '#a1a1aa', paddingTop: 8 }} />
              <Bar yAxisId="rt" dataKey="rt" name="RT (ms)" fill="#a855f7" opacity={0.7} radius={[3, 3, 0, 0]} />
              <Line yAxisId="acc" type="monotone" dataKey="accuracy" name="Accuracy (%)"
                stroke="#fb7185" strokeWidth={2.5} dot={{ r: 5, fill: '#fb7185' }} connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="flex justify-center">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-card border border-border rounded-xl font-medium transition-colors hover:bg-border"
          >
            חזרה לדף הבית
          </motion.button>
        </div>
      </motion.div>
    </main>
  );
}
