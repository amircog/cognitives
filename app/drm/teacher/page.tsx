'use client';

import React, { useState, useEffect, FormEvent, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ErrorBar, LineChart, Line, Cell,
} from 'recharts';
import { GraduationCap, RefreshCw, Download } from 'lucide-react';
import { getSupabase } from '@/lib/supabase';
import { DRMResult, DRMRecallResult } from '@/types/drm';

const PW_HASH = '5f63c8759a4968d6e814db98e85f7658554882b44213d85f3a3b15480f47e69f';

async function sha256(str: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

const TICK = { fill: '#9ca3af', fontSize: 11 };
const BG = { background: '#111827', border: '1px solid #374151', borderRadius: 6 };

function mean(vals: number[]) { return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0; }
function sem(vals: number[]) {
  if (vals.length < 2) return 0;
  const m = mean(vals);
  const v = vals.reduce((a, x) => a + (x - m) ** 2, 0) / (vals.length - 1);
  return Math.sqrt(v / vals.length);
}
function round1(n: number) { return Math.round(n * 10) / 10; }

function sdCleanRows(rows: DRMResult[]): DRMResult[] {
  const sessions = Array.from(new Set(rows.map(r => r.session_id)));
  const cleaned: DRMResult[] = [];
  for (const sid of sessions) {
    const sRows = rows.filter(r => r.session_id === sid);
    const rts = sRows.filter(r => r.reaction_time_ms != null).map(r => r.reaction_time_ms);
    if (rts.length < 2) { cleaned.push(...sRows); continue; }
    const m = mean(rts);
    const sd = Math.sqrt(rts.reduce((a, b) => a + (b - m) ** 2, 0) / (rts.length - 1));
    const lo = m - 2.5 * sd, hi = m + 2.5 * sd;
    cleaned.push(...sRows.filter(r => r.reaction_time_ms >= lo && r.reaction_time_ms <= hi));
  }
  return cleaned;
}

function excludeParticipants(rows: DRMResult[]): { kept: DRMResult[]; excludedIds: Set<string> } {
  const sessions = Array.from(new Set(rows.map(r => r.session_id)));
  if (sessions.length < 2) return { kept: rows, excludedIds: new Set() };
  const pStats = sessions.map(sid => {
    const sRows = rows.filter(r => r.session_id === sid);
    const correct = sRows.filter(r => r.is_correct);
    const acc = sRows.length > 0 ? correct.length / sRows.length : 0;
    const rt = correct.length > 0 ? mean(correct.map(r => r.reaction_time_ms)) : 0;
    return { sid, acc, rt };
  });
  const rts = pStats.map(p => p.rt);
  const accs = pStats.map(p => p.acc);
  const rtM = mean(rts), accM = mean(accs);
  const rtSd = Math.sqrt(rts.reduce((a, b) => a + (b - rtM) ** 2, 0) / (rts.length - 1));
  const accSd = Math.sqrt(accs.reduce((a, b) => a + (b - accM) ** 2, 0) / (accs.length - 1));

  const excludedIds = new Set<string>();
  for (const p of pStats) {
    if (p.rt < rtM - 2.5 * rtSd || p.rt > rtM + 2.5 * rtSd) excludedIds.add(p.sid);
    if (p.acc < accM - 2.5 * accSd) excludedIds.add(p.sid);
  }
  return { kept: rows.filter(r => !excludedIds.has(r.session_id)), excludedIds };
}

function ChartCard({ title, children }: { title: string; children: (revealed: boolean) => React.ReactNode }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-gray-200">{title}</h3>
        <button
          onClick={() => setRevealed(r => !r)}
          className={`text-xs px-3 py-1 rounded-full border transition-colors ${
            revealed ? 'border-emerald-400 text-emerald-400' : 'border-gray-600 text-gray-400 hover:border-gray-400'
          }`}
        >
          {revealed ? 'Hide' : 'Reveal'}
        </button>
      </div>
      {children(revealed)}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pctFmt = (v: any): any => v != null ? [`${Number(v).toFixed(1)}%`, ''] : ['', ''];

export default function DRMTeacherDashboard() {
  const [authed, setAuthed] = useState(false);
  const [pwInput, setPwInput] = useState('');
  const [pwError, setPwError] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recognitionData, setRecognitionData] = useState<DRMResult[]>([]);
  const [recallData, setRecallData] = useState<DRMRecallResult[]>([]);

  const [sdClean, setSdClean] = useState(false);
  const [excludeSubs, setExcludeSubs] = useState(false);

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

      const recogRows: DRMResult[] = [];
      let from = 0;
      while (true) {
        const { data, error: e } = await supabase
          .from('drm_results')
          .select('*')
          .order('created_at', { ascending: true })
          .range(from, from + 999);
        if (e || !data || data.length === 0) break;
        recogRows.push(...(data as DRMResult[]));
        if (data.length < 1000) break;
        from += 1000;
      }

      const recRows: DRMRecallResult[] = [];
      from = 0;
      while (true) {
        const { data, error: e } = await supabase
          .from('drm_recall_results')
          .select('*')
          .order('created_at', { ascending: true })
          .range(from, from + 999);
        if (e || !data || data.length === 0) break;
        recRows.push(...(data as DRMRecallResult[]));
        if (data.length < 1000) break;
        from += 1000;
      }

      if (recogRows.length === 0 && recRows.length === 0) {
        setError('No data available yet. Waiting for participants.');
      }

      setRecognitionData(recogRows);
      setRecallData(recRows);
    } catch (err) {
      console.error(err);
      setError('Failed to load data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (authed) fetchData(); }, [authed, fetchData]);

  let displayRows = recognitionData;
  if (sdClean) displayRows = sdCleanRows(displayRows);
  const { kept, excludedIds } = excludeSubs
    ? excludeParticipants(displayRows)
    : { kept: displayRows, excludedIds: new Set<string>() };
  displayRows = kept;

  const nParticipants = new Set(displayRows.map(r => r.session_id)).size;

  const computeRecognitionChart = () => {
    const sessions = Array.from(new Set(displayRows.map(r => r.session_id)));
    const types = ['studied', 'critical_lure', 'unrelated_foil'] as const;
    const labels = ['Studied Words', 'Critical Lures', 'Unrelated Foils'];
    const colors = ['#34d399', '#f43f5e', '#71717a'];

    return types.map((type, i) => {
      const perParticipant = sessions.map(sid => {
        const items = displayRows.filter(r => r.session_id === sid && r.item_type === type);
        return items.length > 0
          ? (items.filter(r => r.response === 'old').length / items.length) * 100
          : 0;
      });
      return {
        name: labels[i],
        value: round1(mean(perParticipant)),
        sem: round1(sem(perParticipant)),
        fill: colors[i],
      };
    });
  };

  const computeSerialPositionChart = () => {
    const sessions = Array.from(new Set(displayRows.map(r => r.session_id)));
    const studied = displayRows.filter(r => r.item_type === 'studied');

    return Array.from({ length: 12 }, (_, i) => {
      const pos = i + 1;
      const perParticipant = sessions.map(sid => {
        const items = studied.filter(r => r.session_id === sid && r.serial_position === pos);
        return items.length > 0
          ? (items.filter(r => r.response === 'old').length / items.length) * 100
          : 0;
      });
      return {
        position: pos,
        value: round1(mean(perParticipant)),
        sem: round1(sem(perParticipant)),
      };
    });
  };

  const computeConfidenceChart = () => {
    const types = ['studied', 'critical_lure', 'unrelated_foil'] as const;
    const labels = ['Studied', 'Lures', 'Foils'];
    return labels.map((label, i) => {
      const items = displayRows.filter(r => r.item_type === types[i] && r.response === 'old' && r.confidence != null);
      const total = items.length || 1;
      return {
        name: label,
        'Sure old (4)': round1((items.filter(r => r.confidence === 4).length / total) * 100),
        'Probably old (3)': round1((items.filter(r => r.confidence === 3).length / total) * 100),
        'Probably new (2)': round1((items.filter(r => r.confidence === 2).length / total) * 100),
        'Sure new (1)': round1((items.filter(r => r.confidence === 1).length / total) * 100),
      };
    });
  };

  const computeRecallChart = () => {
    const filteredRecall = excludeSubs
      ? recallData.filter(r => !excludedIds.has(r.session_id))
      : recallData;
    const sessions = Array.from(new Set(filteredRecall.map(r => r.session_id)));

    const perParticipantCorrect = sessions.map(sid => {
      const rows = filteredRecall.filter(r => r.session_id === sid);
      return rows.length > 0 ? mean(rows.map(r => (r.correct_count / 12) * 100)) : 0;
    });
    const perParticipantLure = sessions.map(sid => {
      const rows = filteredRecall.filter(r => r.session_id === sid);
      return rows.length > 0 ? (rows.filter(r => r.critical_lure_recalled).length / rows.length) * 100 : 0;
    });

    return [
      { name: 'Correct Recall', value: round1(mean(perParticipantCorrect)), sem: round1(sem(perParticipantCorrect)), fill: '#34d399' },
      { name: 'False Recall (Lure)', value: round1(mean(perParticipantLure)), sem: round1(sem(perParticipantLure)), fill: '#f43f5e' },
    ];
  };

  const downloadCSV = () => {
    if (displayRows.length === 0) return;
    const headers = Object.keys(displayRows[0]);
    const csv = [
      headers.join(','),
      ...displayRows.map(r => headers.map(h => JSON.stringify((r as unknown as Record<string, unknown>)[h] ?? '')).join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'drm_recognition_data.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!authed) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-xl p-10 w-full max-w-sm flex flex-col items-center gap-6"
        >
          <GraduationCap className="w-10 h-10 text-emerald-400" />
          <h1 className="text-xl font-bold">Teacher Dashboard</h1>
          <form onSubmit={handleLogin} className="w-full flex flex-col gap-3">
            <input
              type="password" value={pwInput}
              onChange={e => { setPwInput(e.target.value); setPwError(false); }}
              placeholder="Password" autoFocus
              className={`w-full px-4 py-3 rounded-lg border bg-zinc-800 text-white outline-none transition-colors
                ${pwError ? 'border-red-500' : 'border-border focus:border-emerald-400'}`}
            />
            {pwError && <p className="text-red-400 text-sm text-center">Incorrect password</p>}
            <button type="submit"
              className="w-full py-3 bg-emerald-400 hover:bg-emerald-300 text-zinc-900 font-bold rounded-lg transition-colors">
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
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="inline-block mb-4">
            <RefreshCw className="w-8 h-8 text-emerald-400" />
          </motion.div>
          <p className="text-muted">Loading data...</p>
        </div>
      </main>
    );
  }

  const recogChart = computeRecognitionChart();
  const serialChart = computeSerialPositionChart();
  const confChart = computeConfidenceChart();
  const recallChart = computeRecallChart();

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <GraduationCap className="w-10 h-10 text-emerald-400" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight">DRM Teacher Dashboard</h1>
              <p className="text-muted text-sm">
                {nParticipants} participants · {displayRows.length} recognition responses · {recallData.length} recall entries
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setSdClean(v => !v)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                sdClean ? 'border-emerald-400 text-emerald-400' : 'border-gray-600 text-gray-400 hover:border-gray-400'
              }`}>
              {sdClean ? 'SD-Clean (±2.5)' : 'Raw Trials'}
            </button>
            <button onClick={() => setExcludeSubs(v => !v)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                excludeSubs ? 'border-emerald-400 text-emerald-400' : 'border-gray-600 text-gray-400 hover:border-gray-400'
              }`}>
              {excludeSubs ? `Excl. Participants (${excludedIds.size})` : 'All Participants'}
            </button>
            <button onClick={downloadCSV}
              className="text-xs px-3 py-1.5 rounded-full border border-gray-600 text-gray-400 hover:border-gray-400 transition-colors flex items-center gap-1">
              <Download className="w-3 h-3" /> CSV
            </button>
            <button onClick={fetchData}
              className="text-xs px-3 py-1.5 rounded-full border border-emerald-400 text-emerald-400 hover:bg-emerald-400/10 transition-colors flex items-center gap-1">
              <RefreshCw className="w-3 h-3" /> Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-card border border-yellow-500/50 rounded-xl p-8 mb-8 text-center">
            <p className="text-yellow-400">{error}</p>
          </div>
        )}

        {!error && (
          <div className="grid gap-8">
            <ChartCard title="Figure 1: Recognition Rates by Item Type (DRM Classic Contrast)">
              {(revealed) => (
                <div>
                  <p className="text-xs text-muted mb-4">
                    Percentage of &quot;OLD&quot; responses. Critical lures near the hit rate = strong false memory effect.
                  </p>
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={recogChart} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="name" stroke="#9ca3af" tick={TICK} />
                      <YAxis stroke="#9ca3af" tick={TICK} domain={[0, 100]}
                        label={{ value: '"OLD" Response Rate (%)', angle: -90, position: 'insideLeft', ...TICK }} />
                      <Tooltip contentStyle={BG} formatter={pctFmt} />
                      {revealed && (
                        <Bar dataKey="value" name="Rate (%)">
                          <ErrorBar dataKey="sem" width={4} strokeWidth={1.5} stroke="#6b7280" direction="y" />
                          {recogChart.map((entry, i) => (
                            <Cell key={i} fill={entry.fill} />
                          ))}
                        </Bar>
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartCard>

            <ChartCard title="Figure 2: Free Recall — Correct vs False Recall">
              {(revealed) => (
                <div>
                  <p className="text-xs text-muted mb-4">
                    Proportion of studied words correctly recalled vs critical lures falsely recalled (across lists).
                  </p>
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={recallChart} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="name" stroke="#9ca3af" tick={TICK} />
                      <YAxis stroke="#9ca3af" tick={TICK} domain={[0, 100]}
                        label={{ value: 'Rate (%)', angle: -90, position: 'insideLeft', ...TICK }} />
                      <Tooltip contentStyle={BG} formatter={pctFmt} />
                      {revealed && (
                        <Bar dataKey="value" name="Rate (%)">
                          <ErrorBar dataKey="sem" width={4} strokeWidth={1.5} stroke="#6b7280" direction="y" />
                          {recallChart.map((entry, i) => (
                            <Cell key={i} fill={entry.fill} />
                          ))}
                        </Bar>
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartCard>

            <ChartCard title="Figure 3: Confidence Distribution for 'OLD' Responses">
              {(revealed) => (
                <div>
                  <p className="text-xs text-muted mb-4">
                    Distribution of confidence ratings (1–4) among &quot;OLD&quot; responses by item type.
                  </p>
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={confChart} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="name" stroke="#9ca3af" tick={TICK} />
                      <YAxis stroke="#9ca3af" tick={TICK} domain={[0, 100]}
                        label={{ value: 'Proportion (%)', angle: -90, position: 'insideLeft', ...TICK }} />
                      <Tooltip contentStyle={BG} />
                      <Legend verticalAlign="top" />
                      {revealed && (
                        <>
                          <Bar dataKey="Sure old (4)" stackId="a" fill="#34d399" />
                          <Bar dataKey="Probably old (3)" stackId="a" fill="#6ee7b7" />
                          <Bar dataKey="Probably new (2)" stackId="a" fill="#fbbf24" />
                          <Bar dataKey="Sure new (1)" stackId="a" fill="#71717a" />
                        </>
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartCard>

            <ChartCard title="Figure 4: Serial Position Curve (Recognition)">
              {(revealed) => (
                <div>
                  <p className="text-xs text-muted mb-4">
                    Hit rate by position in the original study list (1–12). Shows primacy and recency effects.
                  </p>
                  <ResponsiveContainer width="100%" height={320}>
                    <LineChart data={serialChart} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="position" stroke="#9ca3af" tick={TICK}
                        label={{ value: 'Serial Position', position: 'insideBottom', offset: -5, ...TICK }} />
                      <YAxis stroke="#9ca3af" tick={TICK} domain={[0, 100]}
                        label={{ value: 'Hit Rate (%)', angle: -90, position: 'insideLeft', ...TICK }} />
                      <Tooltip contentStyle={BG} formatter={pctFmt} />
                      {revealed && (
                        <Line type="monotone" dataKey="value" stroke="#34d399" strokeWidth={2.5}
                          dot={{ fill: '#34d399', r: 4 }} activeDot={{ r: 6 }} name="Hit Rate">
                          <ErrorBar dataKey="sem" width={4} strokeWidth={1.5} stroke="#6b7280" direction="y" />
                        </Line>
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartCard>
          </div>
        )}
      </div>
    </main>
  );
}

