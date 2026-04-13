'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, ErrorBar,
  ScatterChart, Scatter, ZAxis, Cell, Customized, Legend,
} from 'recharts';
import { Eye, Download, Home, RefreshCw } from 'lucide-react';
import { getSupabase } from '@/lib/supabase';
import { computeTeacherData, TeacherData, ScatterPoint } from '@/lib/summary-stats/analysis';
import { TrialResult } from '@/types/summary-stats';

// SHA-256 hash (password = "zinfandel")
const PW_HASH = '5f63c8759a4968d6e814db98e85f7658554882b44213d85f3a3b15480f47e69f';

async function sha256(str: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

const CHART_BG  = { background: '#1f2937', border: '1px solid #374151', borderRadius: 8 };
const TICK_STYLE = { fill: '#9ca3af', fontSize: 11 };
const LABEL_STYLE = { fill: '#9ca3af', fontSize: 11 };

// Per-participant scatter tooltip
const ScatterTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: ScatterPoint }[] }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={CHART_BG} className="px-3 py-2 text-xs text-white shadow">
      <p className="font-semibold">{d.name}</p>
      <p>Ensemble Acc: {d.x}%</p>
      <p>Binary Acc: {d.y}%</p>
    </div>
  );
};

// Diagonal reference line using recharts internal scales
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DiagonalLine = (props: any) => {
  const { xAxisMap, yAxisMap, x1, y1, x2, y2 } = props as {
    xAxisMap: Record<string, { scale: (v: number) => number }>;
    yAxisMap: Record<string, { scale: (v: number) => number }>;
    x1: number; y1: number; x2: number; y2: number;
  };
  if (!xAxisMap || !yAxisMap) return null;
  const xs = Object.values(xAxisMap)[0]?.scale;
  const ys = Object.values(yAxisMap)[0]?.scale;
  if (!xs || !ys) return null;
  return (
    <line x1={xs(x1)} y1={ys(y1)} x2={xs(x2)} y2={ys(y2)}
      stroke="#6b7280" strokeDasharray="6 4" strokeWidth={1.5} strokeLinecap="round" />
  );
};

const CustomDot = (props: { cx?: number; cy?: number }) => {
  const { cx = 0, cy = 0 } = props;
  return <circle cx={cx} cy={cy} r={6} fill="#f97316" stroke="#fff" strokeWidth={1.5} opacity={0.85} />;
};

export default function TeacherPage() {
  const router = useRouter();
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData]             = useState<TeacherData | null>(null);

  // Password gate
  const [authed, setAuthed]   = useState(false);
  const [pwInput, setPwInput] = useState('');
  const [pwError, setPwError] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem('ss_teacher_authed') === '1') setAuthed(true);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
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
    setRefreshing(true);
    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error('Supabase not available');
      const { data: rows } = await supabase
        .from('summary_stats_results')
        .select('*')
        .order('created_at', { ascending: true });

      if (rows && rows.length > 0) {
        setData(computeTeacherData(rows as TrialResult[]));
      } else {
        setData(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { if (authed) fetchData(); }, [authed, fetchData]);

  const handleDownloadCSV = async () => {
    try {
      const supabase = getSupabase();
      if (!supabase) return;
      const { data: rows } = await supabase.from('summary_stats_results').select('*').order('created_at');
      if (!rows?.length) return;
      const headers = Object.keys(rows[0]).join(',');
      const csv = [headers, ...rows.map((r: Record<string, unknown>) => Object.values(r).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = 'ensemble-data.csv'; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { console.error(e); }
  };

  // ── Auth gate ──────────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-gray-900 border border-gray-700 rounded-2xl p-10 w-full max-w-sm flex flex-col items-center gap-6"
        >
          <Eye className="w-10 h-10 text-orange-400" />
          <h1 className="text-xl font-bold text-white">Teacher Dashboard</h1>
          <form onSubmit={handleLogin} className="w-full flex flex-col gap-3">
            <input
              type="password" value={pwInput} autoFocus
              onChange={e => { setPwInput(e.target.value); setPwError(false); }}
              placeholder="Password"
              className={`w-full px-4 py-3 rounded-xl border text-white bg-gray-800 outline-none transition-colors
                ${pwError ? 'border-red-500' : 'border-gray-600 focus:border-orange-400'}`}
            />
            {pwError && <p className="text-red-400 text-sm text-center">Incorrect password</p>}
            <button type="submit"
              className="w-full py-3 bg-orange-500 hover:bg-orange-400 text-white font-bold rounded-xl transition-colors">
              Enter
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  // ── Main dashboard ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0f172a] text-white">
      <div className="container mx-auto px-4 py-8 max-w-5xl">

        {/* Header */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Eye className="w-7 h-7 text-orange-400" />
              <h1 className="text-2xl font-bold">Teacher Dashboard — Ensemble Perception</h1>
            </div>
            {!loading && data && (
              <p className="text-orange-400 font-medium">
                {data.nParticipants} participant{data.nParticipants !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          <div className="flex gap-3 flex-wrap">
            <button onClick={fetchData} disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg border border-gray-600">
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button onClick={handleDownloadCSV}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg border border-gray-600">
              <Download className="w-4 h-4" />
              Download CSV
            </button>
            <button onClick={() => router.push('/')}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg border border-gray-600">
              <Home className="w-4 h-4" />
              Home
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-center text-gray-400 py-20 text-lg">Loading…</p>
        ) : !data || data.nParticipants === 0 ? (
          <p className="text-center text-gray-500 py-20 text-lg">No data yet</p>
        ) : (
          <div className="flex flex-col gap-6">

            {/* ── Chart 1: 2AFC + Recognition accuracy by stimulus type ── */}
            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6">
              <h2 className="text-base font-bold mb-1">2AFC & Recognition Accuracy by Stimulus Type</h2>
              <p className="text-xs text-gray-400 mb-4">Both tasks are binary choice; 50% = chance. Error bars = SEM.</p>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data.chart1} margin={{ left: 10, bottom: 5 }} barCategoryGap="25%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" tick={TICK_STYLE} />
                  <YAxis domain={[0, 100]} tick={TICK_STYLE}
                    label={{ value: 'Accuracy (%)', angle: -90, position: 'insideLeft', style: LABEL_STYLE }} />
                  <Tooltip contentStyle={CHART_BG} formatter={(v: any) => v !== undefined ? [`${Number(v).toFixed(1)}%`, ''] as any : ['', ''] as any} />
                  <ReferenceLine y={50} stroke="#6b7280" strokeDasharray="6 3"
                    label={{ value: 'Chance (50%)', position: 'right', style: { fontSize: 10, fill: '#6b7280' } }} />
                  <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 12 }} />
                  <Bar dataKey="twoAFC" name="2AFC" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                    <ErrorBar dataKey="twoAFCSEM" width={4} strokeWidth={2} stroke="#1d4ed8" direction="y" />
                  </Bar>
                  <Bar dataKey="recognition" name="Recognition" fill="#f97316" radius={[4, 4, 0, 0]}>
                    <ErrorBar dataKey="recognitionSEM" width={4} strokeWidth={2} stroke="#c2410c" direction="y" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* ── Charts 2 & 3 side-by-side ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Chart 2: 2AFC by set size */}
              <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6">
                <h2 className="text-base font-bold mb-4">2AFC Accuracy × Set Size</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={data.chart2} margin={{ left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="setSize" tick={TICK_STYLE}
                      label={{ value: 'Set Size', position: 'insideBottom', offset: -10, style: LABEL_STYLE }} />
                    <YAxis domain={[0, 100]} tick={TICK_STYLE}
                      label={{ value: 'Accuracy (%)', angle: -90, position: 'insideLeft', style: LABEL_STYLE }} />
                    <Tooltip contentStyle={CHART_BG} formatter={(v: any) => v != null ? [`${Number(v).toFixed(1)}%`, ''] as any : ['', ''] as any} />
                    <ReferenceLine y={50} stroke="#6b7280" strokeDasharray="4 3" />
                    <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 11 }} />
                    <Line type="monotone" dataKey="circles" name="Circles" stroke="#f97316" strokeWidth={2.5}
                      dot={{ r: 5, fill: '#f97316' }} connectNulls />
                    <Line type="monotone" dataKey="lines" name="Lines" stroke="#a78bfa" strokeWidth={2.5}
                      dot={{ r: 5, fill: '#a78bfa' }} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Chart 3: Recognition by set size */}
              <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6">
                <h2 className="text-base font-bold mb-4">Recognition Accuracy × Set Size</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={data.chart3} margin={{ left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="setSize" tick={TICK_STYLE}
                      label={{ value: 'Set Size', position: 'insideBottom', offset: -10, style: LABEL_STYLE }} />
                    <YAxis domain={[0, 100]} tick={TICK_STYLE}
                      label={{ value: 'Accuracy (%)', angle: -90, position: 'insideLeft', style: LABEL_STYLE }} />
                    <Tooltip contentStyle={CHART_BG} formatter={(v: any) => v != null ? [`${Number(v).toFixed(1)}%`, ''] as any : ['', ''] as any} />
                    <ReferenceLine y={50} stroke="#6b7280" strokeDasharray="4 3" />
                    <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 11 }} />
                    <Line type="monotone" dataKey="circles" name="Circles" stroke="#f97316" strokeWidth={2.5}
                      dot={{ r: 5, fill: '#f97316' }} connectNulls />
                    <Line type="monotone" dataKey="lines" name="Lines" stroke="#a78bfa" strokeWidth={2.5}
                      dot={{ r: 5, fill: '#a78bfa' }} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ── Chart 4: Ensemble accuracy by set size ── */}
            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6">
              <h2 className="text-base font-bold mb-1">Mean Assessment Accuracy × Set Size</h2>
              <p className="text-xs text-gray-400 mb-4">Normalized: 100% = perfect, 0% = maximum error (half the value range).</p>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={data.chart4} margin={{ left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="setSize" tick={TICK_STYLE}
                    label={{ value: 'Set Size', position: 'insideBottom', offset: -10, style: LABEL_STYLE }} />
                  <YAxis domain={[0, 100]} tick={TICK_STYLE}
                    label={{ value: 'Accuracy (%)', angle: -90, position: 'insideLeft', style: LABEL_STYLE }} />
                  <Tooltip contentStyle={CHART_BG} formatter={(v: any) => v != null ? [`${Number(v).toFixed(1)}%`, ''] as any : ['', ''] as any} />
                  <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 11 }} />
                  <Line type="monotone" dataKey="circles" name="Circles" stroke="#34d399" strokeWidth={2.5}
                    dot={{ r: 5, fill: '#34d399' }} connectNulls />
                  <Line type="monotone" dataKey="lines" name="Lines" stroke="#60a5fa" strokeWidth={2.5}
                    dot={{ r: 5, fill: '#60a5fa' }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* ── Charts 5 & 6 side-by-side ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Chart 5: 2AFC by foil type */}
              <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6">
                <h2 className="text-base font-bold mb-1">2AFC Accuracy × Foil Type</h2>
                <p className="text-xs text-gray-400 mb-4">Mean foil = exact set mean; Non-mean = other non-member.</p>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.chart5} margin={{ left: 10, bottom: 5 }} barCategoryGap="25%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="name" tick={TICK_STYLE} />
                    <YAxis domain={[0, 100]} tick={TICK_STYLE}
                      label={{ value: 'Accuracy (%)', angle: -90, position: 'insideLeft', style: LABEL_STYLE }} />
                    <Tooltip contentStyle={CHART_BG} formatter={(v: any) => v != null ? [`${Number(v).toFixed(1)}%`, ''] as any : ['', ''] as any} />
                    <ReferenceLine y={50} stroke="#6b7280" strokeDasharray="6 3" />
                    <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 11 }} />
                    <Bar dataKey="mean_foil" name="Mean foil" fill="#f59e0b" radius={[4, 4, 0, 0]}>
                      <ErrorBar dataKey="mean_foilSEM" width={4} strokeWidth={2} stroke="#b45309" direction="y" />
                    </Bar>
                    <Bar dataKey="nonmean_foil" name="Non-mean foil" fill="#8b5cf6" radius={[4, 4, 0, 0]}>
                      <ErrorBar dataKey="nonmean_foilSEM" width={4} strokeWidth={2} stroke="#6d28d9" direction="y" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Chart 6: Recognition by probe type */}
              <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6">
                <h2 className="text-base font-bold mb-1">Recognition Accuracy × Probe Type</h2>
                <p className="text-xs text-gray-400 mb-4">Target = set member; Foil-mean = exact mean; Foil-nm = other non-member.</p>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.chart6} margin={{ left: 10, bottom: 5 }} barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="name" tick={TICK_STYLE} />
                    <YAxis domain={[0, 100]} tick={TICK_STYLE}
                      label={{ value: 'Accuracy (%)', angle: -90, position: 'insideLeft', style: LABEL_STYLE }} />
                    <Tooltip contentStyle={CHART_BG} formatter={(v: any) => v != null ? [`${Number(v).toFixed(1)}%`, ''] as any : ['', ''] as any} />
                    <ReferenceLine y={50} stroke="#6b7280" strokeDasharray="6 3" />
                    <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 11 }} />
                    <Bar dataKey="target" name="Target" fill="#34d399" radius={[4, 4, 0, 0]}>
                      <ErrorBar dataKey="targetSEM" width={4} strokeWidth={2} stroke="#059669" direction="y" />
                    </Bar>
                    <Bar dataKey="foil_mean" name="Foil (mean)" fill="#fb923c" radius={[4, 4, 0, 0]}>
                      <ErrorBar dataKey="foil_meanSEM" width={4} strokeWidth={2} stroke="#c2410c" direction="y" />
                    </Bar>
                    <Bar dataKey="foil_nm" name="Foil (non-mean)" fill="#e879f9" radius={[4, 4, 0, 0]}>
                      <ErrorBar dataKey="foil_nmSEM" width={4} strokeWidth={2} stroke="#a21caf" direction="y" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ── Chart 7: Scatter per participant ── */}
            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6">
              <h2 className="text-base font-bold mb-1">Participant Scatter: Mean Assessment vs Binary Accuracy</h2>
              <p className="text-xs text-gray-400 mb-4">
                X = normalized ensemble accuracy; Y = avg(2AFC, recognition). Diagonal = equal performance.
              </p>
              {data.chart7.length < 2 ? (
                <div className="h-[260px] flex items-center justify-center text-gray-500 text-sm">
                  Need at least 2 participants
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <ScatterChart margin={{ left: 10, bottom: 20, right: 20, top: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="x" type="number" name="Ensemble Acc" domain={[0, 100]}
                      label={{ value: 'Mean Assessment Accuracy (%)', position: 'insideBottom', offset: -12, style: LABEL_STYLE }}
                      tick={TICK_STYLE}
                    />
                    <YAxis dataKey="y" type="number" name="Binary Acc" domain={[0, 100]}
                      label={{ value: 'Avg Binary Accuracy (%)', angle: -90, position: 'insideLeft', style: LABEL_STYLE }}
                      tick={TICK_STYLE}
                    />
                    <ZAxis range={[60, 60]} />
                    <Tooltip content={<ScatterTooltip />} />
                    <Customized component={DiagonalLine} x1={0} y1={0} x2={100} y2={100} />
                    <Scatter data={data.chart7} shape={<CustomDot />}>
                      {data.chart7.map((_, i) => <Cell key={i} fill="#f97316" />)}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
