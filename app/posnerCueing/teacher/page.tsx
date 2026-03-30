'use client';

import { useEffect, useState, FormEvent, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { GraduationCap, RefreshCw, Target } from 'lucide-react';
import { getSupabase } from '@/lib/supabase';

const PW_HASH = '5f63c8759a4968d6e814db98e85f7658554882b44213d85f3a3b15480f47e69f';

async function sha256(str: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

interface AggStats {
  totalParticipants: number;
  avgValidRT: number;
  avgInvalidRT: number;
  avgValidityEffect: number;
}

interface SessionStat {
  session_id: string;
  participant_name: string;
  validRT: number;
  invalidRT: number;
  validityEffect: number;
}

export default function PosnerTeacherPage() {
  const [authed, setAuthed] = useState(false);
  const [pwInput, setPwInput] = useState('');
  const [pwError, setPwError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aggStats, setAggStats] = useState<AggStats | null>(null);
  const [sessionStats, setSessionStats] = useState<SessionStat[]>([]);

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
        .from('posner_results')
        .select('*')
        .eq('is_practice', false)
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;

      if (!data || data.length === 0) {
        setError('No data available yet.');
        setLoading(false);
        return;
      }

      // Group by session
      const bySession: Record<string, typeof data> = {};
      data.forEach((r: { session_id: string }) => {
        if (!bySession[r.session_id]) bySession[r.session_id] = [];
        bySession[r.session_id].push(r);
      });

      const sessions: SessionStat[] = [];
      Object.entries(bySession).forEach(([sid, rows]) => {
        const validHits = rows.filter(
          (r: { validity: string; response: string; rt_ms: number | null }) =>
            r.validity === 'valid' && r.response === 'hit' && r.rt_ms != null,
        );
        const invalidHits = rows.filter(
          (r: { validity: string; response: string; rt_ms: number | null }) =>
            r.validity === 'invalid' && r.response === 'hit' && r.rt_ms != null,
        );
        const mean = (arr: { rt_ms: number | null }[]) =>
          arr.length > 0 ? arr.reduce((s, r) => s + (r.rt_ms ?? 0), 0) / arr.length : 0;

        const vRT = Math.round(mean(validHits));
        const iRT = Math.round(mean(invalidHits));

        sessions.push({
          session_id: sid,
          participant_name: (rows[0] as { participant_name?: string }).participant_name ?? sid.slice(0, 8),
          validRT: vRT,
          invalidRT: iRT,
          validityEffect: iRT - vRT,
        });
      });

      setSessionStats(sessions);

      // Aggregate
      const validRTs = sessions.map((s) => s.validRT).filter((v) => v > 0);
      const invalidRTs = sessions.map((s) => s.invalidRT).filter((v) => v > 0);
      const effects = sessions.map((s) => s.validityEffect);
      const avg = (arr: number[]) =>
        arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;

      setAggStats({
        totalParticipants: sessions.length,
        avgValidRT: avg(validRTs),
        avgInvalidRT: avg(invalidRTs),
        avgValidityEffect: avg(effects),
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
          <Target className="w-10 h-10 text-amber-400" />
          <h1 className="text-xl font-bold">Teacher Dashboard</h1>
          <form onSubmit={handleLogin} className="w-full flex flex-col gap-3">
            <input
              type="password"
              value={pwInput}
              onChange={(e) => { setPwInput(e.target.value); setPwError(false); }}
              placeholder="Password"
              autoFocus
              className={`w-full px-4 py-3 rounded-lg border bg-zinc-800 text-white outline-none transition-colors
                ${pwError ? 'border-red-500' : 'border-border focus:border-amber-400'}`}
            />
            {pwError && <p className="text-red-400 text-sm text-center">Incorrect password</p>}
            <button
              type="submit"
              className="w-full py-3 bg-amber-400 hover:bg-amber-300 text-zinc-900 font-bold rounded-lg transition-colors"
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
            <RefreshCw className="w-8 h-8 text-amber-400" />
          </motion.div>
          <p className="text-muted">Loading data...</p>
        </div>
      </main>
    );
  }

  const chartData = [
    { name: 'Valid', rt: aggStats?.avgValidRT ?? 0 },
    { name: 'Invalid', rt: aggStats?.avgInvalidRT ?? 0 },
  ];

  const participantChartData = sessionStats.map((s) => ({
    name: s.participant_name.length > 10 ? s.participant_name.slice(0, 10) + '…' : s.participant_name,
    effect: s.validityEffect,
  }));

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <GraduationCap className="w-10 h-10 text-amber-400" />
            <div>
              <h1 className="text-4xl font-bold tracking-tight">Teacher Dashboard</h1>
              <p className="text-muted mt-1">Posner Spatial Cueing – Aggregate Results</p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 bg-amber-400 text-zinc-900
                       font-semibold rounded-lg hover:bg-amber-300 transition-colors"
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
              className="px-4 py-2 bg-amber-400 text-zinc-900 font-semibold rounded-lg hover:bg-amber-300"
            >
              Retry
            </button>
          </div>
        )}

        {aggStats && (
          <>
            {/* Stats cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-card border border-border rounded-xl p-6">
                <p className="text-sm text-muted mb-1">Participants</p>
                <p className="text-3xl font-bold">{aggStats.totalParticipants}</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-6">
                <p className="text-sm text-muted mb-1">Avg Valid RT</p>
                <p className="text-3xl font-bold text-emerald-400">{aggStats.avgValidRT}ms</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-6">
                <p className="text-sm text-muted mb-1">Avg Invalid RT</p>
                <p className="text-3xl font-bold text-rose-400">{aggStats.avgInvalidRT}ms</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-6">
                <p className="text-sm text-muted mb-1">Avg Validity Effect</p>
                <p className="text-3xl font-bold text-amber-400">+{aggStats.avgValidityEffect}ms</p>
              </div>
            </div>

            {/* Aggregate RT chart */}
            <div className="bg-card border border-border rounded-xl p-6 mb-6">
              <h2 className="text-xl font-bold mb-4">Average RT by Validity (Aggregate)</h2>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData} margin={{ left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                  <XAxis dataKey="name" tick={{ fill: '#a1a1aa' }} />
                  <YAxis
                    tick={{ fill: '#a1a1aa' }}
                    label={{ value: 'RT (ms)', angle: -90, position: 'insideLeft', style: { fill: '#a1a1aa', fontSize: 12 } }}
                  />
                  <Tooltip
                    contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8 }}
                    formatter={(v: any) => [`${v}ms`, 'Avg RT']}
                  />
                  <Bar dataKey="rt" fill="#fbbf24" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Per-participant validity effect */}
            {participantChartData.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-6">
                <h2 className="text-xl font-bold mb-4">Validity Effect per Participant</h2>
                <ResponsiveContainer width="100%" height={Math.max(200, participantChartData.length * 30)}>
                  <BarChart
                    data={participantChartData}
                    layout="vertical"
                    margin={{ left: 80, right: 20, top: 5, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                    <XAxis
                      type="number"
                      tick={{ fill: '#a1a1aa' }}
                      label={{ value: 'Validity Effect (ms)', position: 'insideBottom', offset: -5, style: { fill: '#a1a1aa', fontSize: 11 } }}
                    />
                    <YAxis dataKey="name" type="category" tick={{ fill: '#a1a1aa', fontSize: 11 }} width={80} />
                    <Tooltip
                      contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8 }}
                      formatter={(v: any) => [`${v}ms`, 'Effect']}
                    />
                    <Bar dataKey="effect" fill="#fbbf24" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
