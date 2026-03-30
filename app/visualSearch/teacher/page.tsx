'use client';

import { useEffect, useState, FormEvent, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { GraduationCap, RefreshCw, Search } from 'lucide-react';
import { getSupabase } from '@/lib/supabase';

const PW_HASH = '5f63c8759a4968d6e814db98e85f7658554882b44213d85f3a3b15480f47e69f';

async function sha256(str: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Simple linear regression slope */
function linearSlope(points: Array<{ x: number; y: number }>): number {
  if (points.length < 2) return 0;
  const n = points.length;
  const sx = points.reduce((s, p) => s + p.x, 0);
  const sy = points.reduce((s, p) => s + p.y, 0);
  const sxy = points.reduce((s, p) => s + p.x * p.y, 0);
  const sx2 = points.reduce((s, p) => s + p.x * p.x, 0);
  const d = n * sx2 - sx * sx;
  return d === 0 ? 0 : (n * sxy - sx * sy) / d;
}

interface AggStats {
  totalParticipants: number;
  featureSlope: number;
  conjunctionSlope: number;
}

interface ChartPoint {
  setSize: number;
  Feature: number | null;
  Conjunction: number | null;
}

export default function VisualSearchTeacherPage() {
  const [authed, setAuthed] = useState(false);
  const [pwInput, setPwInput] = useState('');
  const [pwError, setPwError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aggStats, setAggStats] = useState<AggStats | null>(null);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);

  useEffect(() => {
    if (sessionStorage.getItem('ss_teacher_authed') === '1') setAuthed(true);
  }, []);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    const hash = await sha256(pwInput);
    if (hash === PW_HASH) {
      sessionStorage.setItem('ss_teacher_authed', '1');
      setAuthed(true);
    } else {
      setPwError(true);
      setPwInput('');
    }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error('Supabase not available');

      const { data, error: fetchError } = await supabase
        .from('visual_search_results')
        .select('*')
        .eq('is_practice', false)
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;

      if (!data || data.length === 0) {
        setError('No data available yet.');
        setLoading(false);
        return;
      }

      // Unique participants
      const sessions = new Set<string>(data.map((r: { session_id: string }) => r.session_id));

      // Aggregate RT by block × set_size (correct target-present only)
      const setSizes = [8, 16, 24];

      const meanRT = (
        filterFn: (r: { block: string; set_size: number; target_present: boolean; correct: boolean; rt_ms: number }) => boolean,
      ) => {
        const filtered = data.filter(filterFn);
        return filtered.length > 0
          ? filtered.reduce((s: number, r: { rt_ms: number }) => s + r.rt_ms, 0) / filtered.length
          : null;
      };

      const points: ChartPoint[] = setSizes.map((sz) => ({
        setSize: sz,
        Feature: meanRT(
          (r) => r.block === 'feature' && r.set_size === sz && r.target_present && r.correct,
        ),
        Conjunction: meanRT(
          (r) => r.block === 'conjunction' && r.set_size === sz && r.target_present && r.correct,
        ),
      }));

      setChartData(points);

      // Slopes
      const featurePoints = points
        .filter((p) => p.Feature != null)
        .map((p) => ({ x: p.setSize, y: p.Feature! }));
      const conjunctionPoints = points
        .filter((p) => p.Conjunction != null)
        .map((p) => ({ x: p.setSize, y: p.Conjunction! }));

      setAggStats({
        totalParticipants: sessions.size,
        featureSlope: Math.round(linearSlope(featurePoints) * 10) / 10,
        conjunctionSlope: Math.round(linearSlope(conjunctionPoints) * 10) / 10,
      });
    } catch (err) {
      console.error(err);
      setError('Failed to load data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authed) fetchData();
  }, [authed, fetchData]);

  if (!authed) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-xl p-10 w-full max-w-sm flex flex-col items-center gap-6"
        >
          <Search className="w-10 h-10 text-rose-400" />
          <h1 className="text-xl font-bold">Teacher Dashboard</h1>
          <form onSubmit={handleLogin} className="w-full flex flex-col gap-3">
            <input
              type="password"
              value={pwInput}
              onChange={(e) => { setPwInput(e.target.value); setPwError(false); }}
              placeholder="Password"
              autoFocus
              className={`w-full px-4 py-3 rounded-lg border bg-zinc-800 text-white outline-none transition-colors
                ${pwError ? 'border-red-500' : 'border-border focus:border-rose-400'}`}
            />
            {pwError && <p className="text-red-400 text-sm text-center">Incorrect password</p>}
            <button
              type="submit"
              className="w-full py-3 bg-rose-500 hover:bg-rose-400 text-white font-bold rounded-lg transition-colors"
            >
              Enter
            </button>
          </form>
        </motion.div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="inline-block mb-4"
          >
            <RefreshCw className="w-8 h-8 text-rose-400" />
          </motion.div>
          <p className="text-muted">Loading data...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <GraduationCap className="w-10 h-10 text-rose-400" />
            <div>
              <h1 className="text-4xl font-bold tracking-tight">Teacher Dashboard</h1>
              <p className="text-muted mt-1">Visual Search – Aggregate Results</p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 bg-rose-500 text-white
                       font-semibold rounded-lg hover:bg-rose-400 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Data
          </motion.button>
        </div>

        {error && (
          <div className="bg-card border border-yellow-500/50 rounded-xl p-8 mb-8 text-center">
            <p className="text-yellow-400 mb-4">{error}</p>
            <button
              onClick={fetchData}
              className="px-4 py-2 bg-rose-500 text-white font-semibold rounded-lg hover:bg-rose-400"
            >
              Retry
            </button>
          </div>
        )}

        {aggStats && (
          <>
            {/* Stats cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-card border border-border rounded-xl p-6">
                <p className="text-sm text-muted mb-1">Participants</p>
                <p className="text-3xl font-bold">{aggStats.totalParticipants}</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-6">
                <p className="text-sm text-muted mb-1">Feature Slope</p>
                <p className="text-3xl font-bold text-blue-400">{aggStats.featureSlope} ms/item</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-6">
                <p className="text-sm text-muted mb-1">Conjunction Slope</p>
                <p className="text-3xl font-bold text-rose-400">{aggStats.conjunctionSlope} ms/item</p>
              </div>
            </div>

            {/* RT × Set Size line chart */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-xl font-bold mb-1">RT × Set Size (Aggregate)</h2>
              <p className="text-sm text-muted mb-4">
                Correct target-present trials only. Steeper conjunction slope = serial search.
              </p>
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={chartData} margin={{ left: 10, bottom: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                  <XAxis
                    dataKey="setSize"
                    tick={{ fill: '#a1a1aa' }}
                    label={{ value: 'Set Size', position: 'insideBottom', offset: -10, style: { fill: '#a1a1aa', fontSize: 12 } }}
                  />
                  <YAxis
                    tick={{ fill: '#a1a1aa' }}
                    label={{ value: 'RT (ms)', angle: -90, position: 'insideLeft', style: { fill: '#a1a1aa', fontSize: 12 } }}
                  />
                  <Tooltip
                    contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8 }}
                    formatter={(v: number) => v != null ? [`${Math.round(v)}ms`] : ['N/A']}
                  />
                  <Legend wrapperStyle={{ color: '#a1a1aa', paddingTop: 8 }} />
                  <Line
                    type="monotone"
                    dataKey="Feature"
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    dot={{ r: 5, fill: '#3b82f6' }}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="Conjunction"
                    stroke="#fb7185"
                    strokeWidth={2.5}
                    dot={{ r: 5, fill: '#fb7185' }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
