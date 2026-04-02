'use client';

import { useEffect, useState, FormEvent, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { GraduationCap, RefreshCw, Search } from 'lucide-react';
import { getSupabase } from '@/lib/supabase';

const PW_HASH = '5f63c8759a4968d6e814db98e85f7658554882b44213d85f3a3b15480f47e69f';

async function sha256(str: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

const SS_LEVELS = [1, 2, 4, 8];
const DIST_BINS = [
  { label: 'Near\n0–100', min: 0, max: 100 },
  { label: 'Mid\n100–200', min: 100, max: 200 },
  { label: 'Far\n200–300', min: 200, max: 300 },
  { label: 'Edge\n300+', min: 300, max: Infinity },
];

interface SetSizePoint {
  setSize: number;
  rt: number | null;
  accuracy: number | null;
}

interface PresenceContrastPoint {
  setSize: number;
  contrast: number | null; // present RT - absent RT
}

interface DistanceBinPoint {
  label: string;
  rt: number | null;
}

interface AggStats {
  totalParticipants: number;
  totalTrials: number;
  overallAccuracy: number;
}

function meanRT(rows: Array<{ rt_ms: number | null; correct: boolean; target_present: boolean }>,
  filter: (r: typeof rows[0]) => boolean): number | null {
  const filtered = rows.filter(filter);
  const hits = filtered.filter(r => r.rt_ms != null);
  return hits.length > 0 ? Math.round(hits.reduce((s, r) => s + (r.rt_ms ?? 0), 0) / hits.length) : null;
}

function accuracy(rows: Array<{ correct: boolean }>,
  filter: (r: typeof rows[0]) => boolean): number | null {
  const filtered = rows.filter(filter);
  return filtered.length > 0
    ? Math.round((filtered.filter(r => r.correct).length / filtered.length) * 100)
    : null;
}

export default function VisualSearchTeacherPage() {
  const [authed, setAuthed] = useState(false);
  const [pwInput, setPwInput] = useState('');
  const [pwError, setPwError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aggStats, setAggStats] = useState<AggStats | null>(null);
  const [targetSSData, setTargetSSData] = useState<SetSizePoint[]>([]);
  const [distractorSSData, setDistractorSSData] = useState<SetSizePoint[]>([]);
  const [contrastData, setContrastData] = useState<PresenceContrastPoint[]>([]);
  const [distanceData, setDistanceData] = useState<DistanceBinPoint[]>([]);

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

      type Row = {
        session_id: string;
        target_set_size: number;
        distractor_set_size: number;
        target_present: boolean;
        correct: boolean;
        rt_ms: number | null;
        target_distance_from_center: number | null;
      };
      const rows = data as Row[];

      const sessions = new Set(rows.map(r => r.session_id));
      const correctRows = rows.filter(r => r.correct);

      setAggStats({
        totalParticipants: sessions.size,
        totalTrials: rows.length,
        overallAccuracy: Math.round((rows.filter(r => r.correct).length / rows.length) * 100),
      });

      // ── Chart (a): RT & accuracy vs target set size ───────────────────────
      const tSSPoints: SetSizePoint[] = SS_LEVELS.map((ss) => ({
        setSize: ss,
        rt: meanRT(rows, r => r.target_set_size === ss && r.rt_ms != null),
        accuracy: accuracy(rows, r => r.target_set_size === ss),
      }));
      setTargetSSData(tSSPoints);

      // ── Chart (b): RT & accuracy vs distractor set size ───────────────────
      const dSSPoints: SetSizePoint[] = SS_LEVELS.map((ss) => ({
        setSize: ss,
        rt: meanRT(rows, r => r.distractor_set_size === ss && r.rt_ms != null),
        accuracy: accuracy(rows, r => r.distractor_set_size === ss),
      }));
      setDistractorSSData(dSSPoints);

      // ── Chart (c): present-RT minus absent-RT vs target set size ──────────
      const cPoints: PresenceContrastPoint[] = SS_LEVELS.map((ss) => {
        const presentRT = meanRT(rows, r => r.target_set_size === ss && r.target_present && r.rt_ms != null);
        const absentRT = meanRT(rows, r => r.target_set_size === ss && !r.target_present && r.rt_ms != null);
        return {
          setSize: ss,
          contrast:
            presentRT != null && absentRT != null ? presentRT - absentRT : null,
        };
      });
      setContrastData(cPoints);

      // ── Chart (d): present-RT vs target distance from center ─────────────
      const presentRows = correctRows.filter(r => r.target_present && r.rt_ms != null && r.target_distance_from_center != null);
      const dBins: DistanceBinPoint[] = DIST_BINS.map(({ label, min, max }) => {
        const binRows = presentRows.filter(r => {
          const d = r.target_distance_from_center ?? 0;
          return d >= min && d < max;
        });
        return {
          label: label.replace('\n', ' '),
          rt: binRows.length > 0
            ? Math.round(binRows.reduce((s, r) => s + (r.rt_ms ?? 0), 0) / binRows.length)
            : null,
        };
      });
      setDistanceData(dBins);

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

  // ── Auth screen ──────────────────────────────────────────────────────────
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

  const chartStyle = { background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8 };
  const axisStyle = { fill: '#a1a1aa', fontSize: 11 };

  const SetSizeChart = ({
    data, title, subtitle,
  }: { data: SetSizePoint[]; title: string; subtitle: string }) => (
    <div className="bg-card border border-border rounded-xl p-6 mb-6">
      <h2 className="text-xl font-bold mb-1">{title}</h2>
      <p className="text-sm text-muted mb-4">{subtitle}</p>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={data} margin={{ left: 10, right: 40, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
          <XAxis
            dataKey="setSize"
            tick={axisStyle}
            label={{ value: 'Set Size', position: 'insideBottom', offset: -10, style: { fill: '#a1a1aa', fontSize: 11 } }}
          />
          <YAxis
            yAxisId="rt"
            orientation="left"
            tick={axisStyle}
            label={{ value: 'RT (ms)', angle: -90, position: 'insideLeft', style: { fill: '#a1a1aa', fontSize: 11 } }}
          />
          <YAxis
            yAxisId="acc"
            orientation="right"
            domain={[0, 100]}
            tick={axisStyle}
            label={{ value: 'Accuracy (%)', angle: 90, position: 'insideRight', style: { fill: '#a1a1aa', fontSize: 11 } }}
          />
          <Tooltip contentStyle={chartStyle} formatter={(v: any) => v != null ? [v, ''] : ['N/A', ''] as any} />
          <Legend wrapperStyle={{ color: '#a1a1aa', paddingTop: 8 }} />
          <Bar yAxisId="rt" dataKey="rt" name="RT (ms)" fill="#3b82f6" opacity={0.7} radius={[3, 3, 0, 0]} />
          <Line yAxisId="acc" type="monotone" dataKey="accuracy" name="Accuracy (%)" stroke="#fb7185" strokeWidth={2.5} dot={{ r: 5, fill: '#fb7185' }} connectNulls />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
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
            <button onClick={fetchData} className="px-4 py-2 bg-rose-500 text-white font-semibold rounded-lg hover:bg-rose-400">
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
                <p className="text-sm text-muted mb-1">Total Trials</p>
                <p className="text-3xl font-bold text-blue-400">{aggStats.totalTrials}</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-6">
                <p className="text-sm text-muted mb-1">Overall Accuracy</p>
                <p className="text-3xl font-bold text-rose-400">{aggStats.overallAccuracy}%</p>
              </div>
            </div>

            {/* Chart (a): RT & accuracy vs target set size */}
            <SetSizeChart
              data={targetSSData}
              title="(a) RT & Accuracy vs Target Set Size"
              subtitle="Target-colored items in display (including target T when present). Harder to find T among more same-color L's."
            />

            {/* Chart (b): RT & accuracy vs distractor set size */}
            <SetSizeChart
              data={distractorSSData}
              title="(b) RT & Accuracy vs Distractor Set Size"
              subtitle="Number of opposite-color T's. More T's of the wrong color = more distractors to reject."
            />

            {/* Chart (c): present-RT minus absent-RT vs target set size */}
            {contrastData.some(d => d.contrast != null) && (
              <div className="bg-card border border-border rounded-xl p-6 mb-6">
                <h2 className="text-xl font-bold mb-1">(c) Search Cost vs Target Set Size</h2>
                <p className="text-sm text-muted mb-4">
                  Present-RT minus Absent-RT at each target set size. Positive = present trials slower than absent.
                </p>
                <ResponsiveContainer width="100%" height={260}>
                  <ComposedChart data={contrastData} margin={{ left: 10, right: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                    <XAxis
                      dataKey="setSize"
                      tick={axisStyle}
                      label={{ value: 'Target Set Size', position: 'insideBottom', offset: -10, style: axisStyle }}
                    />
                    <YAxis
                      tick={axisStyle}
                      label={{ value: 'Present − Absent RT (ms)', angle: -90, position: 'insideLeft', style: { fill: '#a1a1aa', fontSize: 10 } }}
                    />
                    <Tooltip contentStyle={chartStyle} formatter={(v: any) => v != null ? [`${v}ms`, 'Contrast'] : ['N/A', 'Contrast'] as any} />
                    <Bar dataKey="contrast" name="Present − Absent (ms)" fill="#f97316" radius={[4, 4, 0, 0]} />
                    <Line type="monotone" dataKey="contrast" stroke="#fb923c" strokeWidth={2} dot={{ r: 4, fill: '#fb923c' }} connectNulls />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Chart (d): present-RT vs target distance from center */}
            {distanceData.some(d => d.rt != null) && (
              <div className="bg-card border border-border rounded-xl p-6">
                <h2 className="text-xl font-bold mb-1">(d) Present-RT vs Target Distance from Center</h2>
                <p className="text-sm text-muted mb-4">
                  Correct target-present trials. Targets near fixation (center) should be detected faster.
                </p>
                <ResponsiveContainer width="100%" height={260}>
                  <ComposedChart data={distanceData} margin={{ left: 10, right: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                    <XAxis
                      dataKey="label"
                      tick={axisStyle}
                      label={{ value: 'Distance from Center (px)', position: 'insideBottom', offset: -10, style: axisStyle }}
                    />
                    <YAxis
                      tick={axisStyle}
                      label={{ value: 'RT (ms)', angle: -90, position: 'insideLeft', style: { fill: '#a1a1aa', fontSize: 12 } }}
                    />
                    <Tooltip contentStyle={chartStyle} formatter={(v: any) => v != null ? [`${v}ms`, 'Avg RT'] : ['N/A', 'Avg RT'] as any} />
                    <Bar dataKey="rt" name="RT (ms)" fill="#a855f7" radius={[4, 4, 0, 0]} opacity={0.8} />
                    <Line type="monotone" dataKey="rt" stroke="#c084fc" strokeWidth={2.5} dot={{ r: 5, fill: '#c084fc' }} connectNulls />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
