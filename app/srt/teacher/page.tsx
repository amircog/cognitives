'use client';

import { useEffect, useState, useMemo, FormEvent } from 'react';
import { motion } from 'framer-motion';
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ErrorBar, BarChart, Bar,
} from 'recharts';
import { GraduationCap, RefreshCw, Download } from 'lucide-react';
import { getSupabase } from '@/lib/supabase';

const PW_HASH = '5f63c8759a4968d6e814db98e85f7658554882b44213d85f3a3b15480f47e69f';

async function sha256(str: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function sem(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance / values.length);
}

function sdCleanRows(rows: Row[]): Row[] {
  const sessions = Array.from(new Set(rows.map(r => r.session_id)));
  const cleaned: Row[] = [];
  for (const sid of sessions) {
    const sRows = rows.filter(r => r.session_id === sid);
    const rts = sRows.filter(r => r.rt_ms != null).map(r => r.rt_ms as number);
    if (rts.length < 2) { cleaned.push(...sRows); continue; }
    const mean = rts.reduce((a, b) => a + b, 0) / rts.length;
    const sd = Math.sqrt(rts.reduce((a, b) => a + (b - mean) ** 2, 0) / (rts.length - 1));
    const lo = mean - 2.5 * sd, hi = mean + 2.5 * sd;
    cleaned.push(...sRows.filter(r => r.rt_ms == null || (r.rt_ms >= lo && r.rt_ms <= hi)));
  }
  return cleaned;
}

type Row = {
  session_id: string;
  participant_name: string | null;
  block_number: number;
  trial_in_block: number;
  trial_overall: number;
  sequence_position: number;
  target_location: number;
  response_location: number;
  correct: boolean;
  rt_ms: number | null;
  sequence_type: string;
  is_practice: boolean;
  created_at: string;
};

interface BlockPoint {
  block: number;
  rt: number | null;
  sem: number;
  label: string;
}

interface ParticipantSummary {
  name: string;
  session_id: string;
  totalTrials: number;
  accuracy: number;
  meanRt: number;
  learningRt: number;
  interferenceRt: number;
  recoveryRt: number;
}

function ChartCard({ title, children }: { title: string; children: (revealed: boolean) => React.ReactNode }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-gray-200">{title}</h3>
        <button
          onClick={() => setRevealed(r => !r)}
          className="text-xs px-3 py-1 rounded-full border border-gray-600 text-gray-400 hover:border-emerald-400 hover:text-emerald-400 transition-colors"
        >
          {revealed ? 'Hide' : 'Reveal'}
        </button>
      </div>
      {children(revealed)}
    </div>
  );
}

export default function SrtTeacher() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState('');
  const [pwError, setPwError] = useState(false);
  const [rawRows, setRawRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'raw' | 'sdclean'>('raw');

  const activeRows = useMemo(
    () => mode === 'sdclean' ? sdCleanRows(rawRows) : rawRows,
    [rawRows, mode],
  );
  const excludedCount = rawRows.length - activeRows.length;

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    const hash = await sha256(pw);
    if (hash === PW_HASH) { setAuthed(true); fetchData(); }
    else setPwError(true);
  }

  async function fetchData() {
    setLoading(true);
    const supabase = getSupabase();
    if (!supabase) { setLoading(false); return; }
    const rows: Row[] = [];
    let from = 0;
    while (true) {
      const { data, error } = await supabase
        .from('srt_results')
        .select('*')
        .eq('is_practice', false)
        .order('created_at', { ascending: true })
        .range(from, from + 999);
      if (error || !data || data.length === 0) break;
      rows.push(...(data as Row[]));
      if (data.length < 1000) break;
      from += 1000;
    }
    setRawRows(rows);
    setLoading(false);
  }

  // RT by block chart data
  const blockChartData = useMemo((): BlockPoint[] => {
    if (activeRows.length === 0) return [];
    const sessions = Array.from(new Set(activeRows.map(r => r.session_id)));
    const blockLabels = ['1', '2', '3', '4', '5 (Int.)', '6'];

    return [1, 2, 3, 4, 5, 6].map(block => {
      const participantMeans: number[] = [];
      for (const sid of sessions) {
        const bRows = activeRows.filter(r => r.session_id === sid && r.block_number === block && r.correct && r.rt_ms != null);
        if (bRows.length > 0) {
          participantMeans.push(bRows.reduce((s, r) => s + r.rt_ms!, 0) / bRows.length);
        }
      }
      const mean = participantMeans.length > 0
        ? participantMeans.reduce((a, b) => a + b, 0) / participantMeans.length
        : null;
      return {
        block,
        rt: mean ? Math.round(mean) : null,
        sem: Math.round(sem(participantMeans)),
        label: blockLabels[block - 1],
      };
    });
  }, [activeRows]);

  // Per-participant summary
  const participantSummaries = useMemo((): ParticipantSummary[] => {
    if (activeRows.length === 0) return [];
    const sessions = Array.from(new Set(activeRows.map(r => r.session_id)));
    return sessions.map(sid => {
      const sRows = activeRows.filter(r => r.session_id === sid);
      const correct = sRows.filter(r => r.correct && r.rt_ms != null);
      const name = sRows[0]?.participant_name ?? sid.slice(0, 8);

      const blockMeanRt = (blocks: number[]) => {
        const bRows = correct.filter(r => blocks.includes(r.block_number));
        return bRows.length > 0 ? Math.round(bRows.reduce((s, r) => s + r.rt_ms!, 0) / bRows.length) : 0;
      };

      return {
        name,
        session_id: sid,
        totalTrials: sRows.length,
        accuracy: sRows.length > 0 ? Math.round((correct.length / sRows.length) * 100) : 0,
        meanRt: correct.length > 0 ? Math.round(correct.reduce((s, r) => s + r.rt_ms!, 0) / correct.length) : 0,
        learningRt: blockMeanRt([1, 2, 3, 4]),
        interferenceRt: blockMeanRt([5]),
        recoveryRt: blockMeanRt([6]),
      };
    });
  }, [activeRows]);

  const downloadCsv = () => {
    if (activeRows.length === 0) return;
    const headers = Object.keys(activeRows[0]).join(',');
    const csv = [headers, ...activeRows.map(r => Object.values(r).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `srt_results_${mode}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!authed) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center px-4">
        <form onSubmit={handleLogin} className="bg-gray-900 border border-gray-700 rounded-2xl p-8 w-full max-w-sm flex flex-col gap-4">
          <div className="flex items-center gap-2 text-emerald-400 mb-2">
            <GraduationCap className="w-6 h-6" />
            <h1 className="text-lg font-bold">SRT — Teacher Dashboard</h1>
          </div>
          <input
            type="password"
            value={pw}
            onChange={e => { setPw(e.target.value); setPwError(false); }}
            placeholder="Password"
            className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-400"
          />
          {pwError && <p className="text-red-400 text-xs">Incorrect password</p>}
          <button type="submit" className="py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-semibold transition-colors">
            Enter
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] px-4 py-8">
      <div className="max-w-5xl mx-auto flex flex-col gap-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-400">
            <GraduationCap className="w-6 h-6" />
            <h1 className="text-xl font-bold">SRT — Teacher Dashboard</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={downloadCsv} className="p-2 rounded-lg border border-gray-600 text-gray-400 hover:text-emerald-400 hover:border-emerald-400 transition-colors">
              <Download className="w-4 h-4" />
            </button>
            <button onClick={fetchData} className="p-2 rounded-lg border border-gray-600 text-gray-400 hover:text-emerald-400 hover:border-emerald-400 transition-colors">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Stats summary */}
        <div className="flex gap-4 flex-wrap">
          <StatBox label="Participants" value={new Set(activeRows.map(r => r.session_id)).size} />
          <StatBox label="Total Trials" value={activeRows.length} />
        </div>

        {/* SD-clean toggle */}
        {rawRows.length > 0 && (
          <div className="flex flex-col items-center gap-2">
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
                  ? `${excludedCount} trial${excludedCount > 1 ? 's' : ''} excluded (${activeRows.length} of ${rawRows.length} kept)`
                  : 'No trials excluded'
                : `${rawRows.length} trials`}
            </p>
          </div>
        )}

        {/* RT by Block chart */}
        <ChartCard title="Mean RT by Block (correct trials only)">
          {(revealed) => (
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={blockChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="label" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" label={{ value: 'RT (ms)', angle: -90, position: 'insideLeft', fill: '#9ca3af' }} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #374151' }} />
                <Legend verticalAlign="top" />
                {revealed && (
                  <Line
                    type="monotone"
                    dataKey="rt"
                    stroke="#34d399"
                    strokeWidth={2}
                    name="Mean RT"
                    dot={{ r: 5 }}
                  >
                    <ErrorBar dataKey="sem" width={4} strokeWidth={1.5} stroke="#6b7280" direction="y" />
                  </Line>
                )}
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Participant table */}
        <ChartCard title="Per-Participant Summary">
          {(revealed) => revealed ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-gray-400 border-b border-gray-700">
                  <tr>
                    <th className="py-2 px-3">Name</th>
                    <th className="py-2 px-3">Trials</th>
                    <th className="py-2 px-3">Acc %</th>
                    <th className="py-2 px-3">Mean RT</th>
                    <th className="py-2 px-3">Learning RT</th>
                    <th className="py-2 px-3">Interf. RT</th>
                    <th className="py-2 px-3">Recovery RT</th>
                  </tr>
                </thead>
                <tbody className="text-gray-300">
                  {participantSummaries.map(p => (
                    <tr key={p.session_id} className="border-b border-gray-800">
                      <td className="py-2 px-3">{p.name}</td>
                      <td className="py-2 px-3">{p.totalTrials}</td>
                      <td className="py-2 px-3">{p.accuracy}%</td>
                      <td className="py-2 px-3">{p.meanRt} ms</td>
                      <td className="py-2 px-3">{p.learningRt} ms</td>
                      <td className="py-2 px-3">{p.interferenceRt} ms</td>
                      <td className="py-2 px-3">{p.recoveryRt} ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Click Reveal to show participant data</p>
          )}
        </ChartCard>
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-card border border-border rounded-xl px-5 py-3">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-xl font-bold text-white">{value}</p>
    </div>
  );
}
