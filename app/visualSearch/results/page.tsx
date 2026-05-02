'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ComposedChart, BarChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { Search, Clock, CheckCircle } from 'lucide-react';
import { VisualSearchResult } from '@/types/visual-search';

const SS_LEVELS = [1, 2, 4, 8];
const BIN_MS = 100;

interface SetSizePoint {
  setSize: number;
  rt: number | null;
  accuracy: number | null;
}

interface HistPoint {
  bin: number;
  count: number;
}

function sdClean(results: VisualSearchResult[]): VisualSearchResult[] {
  const rts = results.filter(r => r.rt_ms != null).map(r => r.rt_ms as number);
  if (rts.length < 2) return results;
  const mean = rts.reduce((a, b) => a + b, 0) / rts.length;
  const sd = Math.sqrt(rts.reduce((a, b) => a + (b - mean) ** 2, 0) / (rts.length - 1));
  const lo = mean - 2.5 * sd;
  const hi = mean + 2.5 * sd;
  return results.filter(r => r.rt_ms == null || (r.rt_ms >= lo && r.rt_ms <= hi));
}

function computeStats(results: VisualSearchResult[]) {
  const correct = results.filter(r => r.correct && r.rt_ms != null);
  const avgRT = correct.length > 0
    ? Math.round(correct.reduce((s, r) => s + (r.rt_ms ?? 0), 0) / correct.length)
    : 0;
  const accuracy = results.length > 0
    ? Math.round((results.filter(r => r.correct).length / results.length) * 100)
    : 0;

  const meanRT = (rows: VisualSearchResult[]) => {
    const hits = rows.filter(r => r.correct && r.rt_ms != null);
    return hits.length > 0 ? Math.round(hits.reduce((s, r) => s + (r.rt_ms ?? 0), 0) / hits.length) : null;
  };
  const acc = (rows: VisualSearchResult[]) =>
    rows.length > 0 ? Math.round((rows.filter(r => r.correct).length / rows.length) * 100) : null;

  const targetSSData: SetSizePoint[] = SS_LEVELS.map(ss => ({
    setSize: ss,
    rt: meanRT(results.filter(r => r.target_set_size === ss)),
    accuracy: acc(results.filter(r => r.target_set_size === ss)),
  }));

  const distractorSSData: SetSizePoint[] = SS_LEVELS.map(ss => ({
    setSize: ss,
    rt: meanRT(results.filter(r => r.distractor_set_size === ss)),
    accuracy: acc(results.filter(r => r.distractor_set_size === ss)),
  }));

  return { avgRT, accuracy, targetSSData, distractorSSData };
}

function computeHistogram(results: VisualSearchResult[]): HistPoint[] {
  const rts = results.filter(r => r.correct && r.rt_ms != null).map(r => r.rt_ms as number);
  if (rts.length === 0) return [];
  const minBin = Math.floor(Math.min(...rts) / BIN_MS) * BIN_MS;
  const maxBin = Math.ceil(Math.max(...rts) / BIN_MS) * BIN_MS;
  const points: HistPoint[] = [];
  for (let b = minBin; b <= maxBin; b += BIN_MS) {
    points.push({ bin: b, count: rts.filter(rt => rt >= b && rt < b + BIN_MS).length });
  }
  return points;
}

export default function VisualSearchResultsPage() {
  const router = useRouter();
  const [rawResults, setRawResults] = useState<VisualSearchResult[]>([]);
  const [mode, setMode] = useState<'raw' | 'sdclean'>('raw');

  useEffect(() => {
    const stored = sessionStorage.getItem('visual_search_results');
    if (!stored) { router.push('/visualSearch'); return; }
    try {
      const all: VisualSearchResult[] = JSON.parse(stored);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRawResults(all.filter(r => !r.is_practice));
    } catch {
      router.push('/visualSearch');
    }
  }, [router]);

  const activeResults = useMemo(
    () => mode === 'sdclean' ? sdClean(rawResults) : rawResults,
    [rawResults, mode],
  );

  const stats = useMemo(() => computeStats(activeResults), [activeResults]);
  const rtHist = useMemo(() => computeHistogram(activeResults), [activeResults]);
  const excludedCount = rawResults.length - activeResults.length;

  if (rawResults.length === 0) {
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
        <p className="text-muted text-center mb-6">ניסוי חיפוש חזותי</p>

        {/* Mode toggle */}
        <div className="flex flex-col items-center gap-2 mb-8">
          <div className="flex rounded-xl border border-border bg-card overflow-hidden">
            <button
              onClick={() => setMode('raw')}
              className={`px-5 py-2 text-sm font-medium transition-colors ${
                mode === 'raw' ? 'bg-rose-500 text-white' : 'text-muted hover:text-foreground'
              }`}
            >
              Raw Data
            </button>
            <button
              onClick={() => setMode('sdclean')}
              className={`px-5 py-2 text-sm font-medium transition-colors ${
                mode === 'sdclean' ? 'bg-rose-500 text-white' : 'text-muted hover:text-foreground'
              }`}
            >
              SD-Clean (±2.5)
            </button>
          </div>
          <p className="text-xs text-muted h-4">
            {mode === 'sdclean'
              ? excludedCount > 0
                ? `${excludedCount} trial${excludedCount > 1 ? 's' : ''} excluded (${rawResults.length - excludedCount} of ${rawResults.length} kept)`
                : 'No trials excluded'
              : `${rawResults.length} trials`}
          </p>
        </div>

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

        {/* Chart 1: RT & Accuracy vs Target Set Size */}
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
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <Tooltip contentStyle={chartStyle} formatter={(v: any) => v != null ? [v, ''] : ['N/A', '']} />
              <Legend verticalAlign="top" wrapperStyle={{ color: '#a1a1aa', paddingBottom: 8 }} />
              <Bar yAxisId="rt" dataKey="rt" name="RT (ms)" fill="#3b82f6" opacity={0.7} radius={[3, 3, 0, 0]} />
              <Line yAxisId="acc" type="monotone" dataKey="accuracy" name="Accuracy (%)"
                stroke="#fb7185" strokeWidth={2.5} dot={{ r: 5, fill: '#fb7185' }} connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Chart 2: RT & Accuracy vs Distractor Set Size */}
        <div className="bg-card border border-border rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-1">RT & Accuracy vs Distractor Set Size</h2>
          <p className="text-sm text-muted mb-4">Opposite-color T&apos;s in display</p>
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={stats.distractorSSData} margin={{ left: 10, right: 40, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
              <XAxis dataKey="setSize" tick={axisStyle}
                label={{ value: 'Distractor Set Size', position: 'insideBottom', offset: -10, style: axisStyle }} />
              <YAxis yAxisId="rt" orientation="left" tick={axisStyle}
                label={{ value: 'RT (ms)', angle: -90, position: 'insideLeft', style: axisStyle }} />
              <YAxis yAxisId="acc" orientation="right" domain={[0, 100]} tick={axisStyle}
                label={{ value: 'Accuracy (%)', angle: 90, position: 'insideRight', style: axisStyle }} />
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <Tooltip contentStyle={chartStyle} formatter={(v: any) => v != null ? [v, ''] : ['N/A', '']} />
              <Legend verticalAlign="top" wrapperStyle={{ color: '#a1a1aa', paddingBottom: 8 }} />
              <Bar yAxisId="rt" dataKey="rt" name="RT (ms)" fill="#a855f7" opacity={0.7} radius={[3, 3, 0, 0]} />
              <Line yAxisId="acc" type="monotone" dataKey="accuracy" name="Accuracy (%)"
                stroke="#fb7185" strokeWidth={2.5} dot={{ r: 5, fill: '#fb7185' }} connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Chart 5: RT Distribution */}
        <div className="bg-card border border-border rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold mb-1">RT Distribution</h2>
          <p className="text-sm text-muted mb-4">
            Correct trials · {BIN_MS}ms bins
            {mode === 'sdclean' && ' · SD-cleaned'}
          </p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={rtHist} margin={{ left: 10, right: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
              <XAxis
                dataKey="bin"
                tick={axisStyle}
                interval="preserveStartEnd"
                label={{ value: 'RT (ms)', position: 'insideBottom', offset: -10, style: axisStyle }}
              />
              <YAxis
                tick={axisStyle}
                allowDecimals={false}
                label={{ value: 'Count', angle: -90, position: 'insideLeft', style: axisStyle }}
              />
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <Tooltip contentStyle={chartStyle} formatter={(v: any) => [v, 'trials']} labelFormatter={(l) => `${l}–${(l as number) + BIN_MS}ms`} />
              <Bar dataKey="count" name="Trials" fill="#34d399" opacity={0.8} radius={[2, 2, 0, 0]} />
            </BarChart>
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
