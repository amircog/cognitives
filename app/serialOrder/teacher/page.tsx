'use client';

import { useEffect, useState, FormEvent } from 'react';
import { motion } from 'framer-motion';
import { GraduationCap, RefreshCw } from 'lucide-react';
import { getSupabase } from '@/lib/supabase';
import { RecallResponse } from '@/types/serial-order';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, BarChart, Bar,
} from 'recharts';

const PW_HASH = '5f63c8759a4968d6e814db98e85f7658554882b44213d85f3a3b15480f47e69f';

async function sha256(str: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
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

interface ParticipantData {
  sessionId: string;
  name: string | null;
  recalls: RecallResponse[];
}

const COLORS = [
  '#34d399', '#f472b6', '#60a5fa', '#fbbf24', '#a78bfa',
  '#fb923c', '#2dd4bf', '#e879f9', '#84cc16', '#f87171',
  '#38bdf8', '#c084fc', '#4ade80', '#fb7185', '#facc15',
];

export default function SerialOrderTeacher() {
  const [authed, setAuthed] = useState(false);
  const [pwInput, setPwInput] = useState('');
  const [pwError, setPwError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [participants, setParticipants] = useState<ParticipantData[]>([]);

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

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error('Supabase not available');

      const allRecalls: RecallResponse[] = [];
      let from = 0;
      while (true) {
        const { data, error: fetchError } = await supabase
          .from('serial_order_recall')
          .select('*')
          .order('created_at', { ascending: true })
          .range(from, from + 999);
        if (fetchError) throw fetchError;
        if (!data || data.length === 0) break;
        allRecalls.push(...(data as RecallResponse[]));
        if (data.length < 1000) break;
        from += 1000;
      }

      if (allRecalls.length === 0) {
        setError('No data available yet.');
        setLoading(false);
        return;
      }

      // Group by session
      const bySession = new Map<string, ParticipantData>();
      allRecalls.forEach(r => {
        if (!bySession.has(r.session_id)) {
          bySession.set(r.session_id, { sessionId: r.session_id, name: r.participant_name, recalls: [] });
        }
        bySession.get(r.session_id)!.recalls.push(r);
      });
      setParticipants(Array.from(bySession.values()));
    } catch (err) {
      console.error(err);
      setError('Failed to load data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authed) fetchData();
  }, [authed]);

  // ── Compute serial position curve ─────────────────────────────────────────
  function computeSerialPositionCurve() {
    const positionCounts = Array(24).fill(0);
    const nParticipants = participants.length;
    participants.forEach(p => {
      const recalled = new Set<number>();
      p.recalls.forEach(r => {
        if (r.is_correct_recall && r.matched_serial_position !== null) {
          recalled.add(r.matched_serial_position);
        }
      });
      recalled.forEach(pos => { positionCounts[pos - 1]++; });
    });
    return positionCounts.map((count, i) => ({
      position: i + 1,
      probability: nParticipants > 0 ? count / nParticipants : 0,
    }));
  }

  // ── Compute per-participant thirds ────────────────────────────────────────
  function computeParticipantThirds() {
    return participants.map(p => {
      const recalled = new Set<number>();
      p.recalls.forEach(r => {
        if (r.is_correct_recall && r.matched_serial_position !== null) {
          recalled.add(r.matched_serial_position);
        }
      });
      const primacy = Array.from({ length: 8 }, (_, i) => recalled.has(i + 1) ? 1 : 0).reduce((a, b) => a + b, 0) / 8;
      const middle = Array.from({ length: 8 }, (_, i) => recalled.has(i + 9) ? 1 : 0).reduce((a, b) => a + b, 0) / 8;
      const recency = Array.from({ length: 8 }, (_, i) => recalled.has(i + 17) ? 1 : 0).reduce((a, b) => a + b, 0) / 8;
      return { name: p.name ?? p.sessionId.slice(0, 6), primacy, middle, recency };
    });
  }

  // ── Compute simple lag distribution ───────────────────────────────────────
  function computeLagDistribution() {
    const lagCounts: Record<string, number> = {};
    const bins = ['≤-7', '-6', '-5', '-4', '-3', '-2', '-1', '+1', '+2', '+3', '+4', '+5', '+6', '≥+7'];
    bins.forEach(b => { lagCounts[b] = 0; });

    let totalTransitions = 0;
    participants.forEach(p => {
      const correctRecalls = p.recalls
        .filter(r => r.is_correct_recall && r.matched_serial_position !== null && !r.is_repetition)
        .sort((a, b) => a.output_position - b.output_position);

      for (let i = 0; i < correctRecalls.length - 1; i++) {
        const lag = correctRecalls[i + 1].matched_serial_position! - correctRecalls[i].matched_serial_position!;
        if (lag === 0) continue;
        totalTransitions++;
        if (lag <= -7) lagCounts['≤-7']++;
        else if (lag >= 7) lagCounts['≥+7']++;
        else {
          const key = lag > 0 ? `+${lag}` : `${lag}`;
          if (lagCounts[key] !== undefined) lagCounts[key]++;
        }
      }
    });

    return bins.map(bin => ({
      lag: bin,
      count: lagCounts[bin],
      proportion: totalTransitions > 0 ? lagCounts[bin] / totalTransitions : 0,
    }));
  }

  // ── Compute lag-CRP ───────────────────────────────────────────────────────
  function computeLagCRP() {
    const actualByLag: Record<number, number> = {};
    const possibleByLag: Record<number, number> = {};

    participants.forEach(p => {
      const correctRecalls = p.recalls
        .filter(r => r.is_correct_recall && r.matched_serial_position !== null && !r.is_repetition)
        .sort((a, b) => a.output_position - b.output_position);

      const recalledPositions = correctRecalls.map(r => r.matched_serial_position!);
      const allPositions = new Set(Array.from({ length: 24 }, (_, i) => i + 1));

      for (let i = 0; i < recalledPositions.length - 1; i++) {
        const currentPos = recalledPositions[i];
        const nextPos = recalledPositions[i + 1];
        const lag = nextPos - currentPos;

        // Items already recalled before this transition
        const alreadyRecalled = new Set(recalledPositions.slice(0, i + 1));
        // Available items = all positions minus already recalled
        const available = new Set([...allPositions].filter(p => !alreadyRecalled.has(p)));

        // Record actual transition
        if (!actualByLag[lag]) actualByLag[lag] = 0;
        actualByLag[lag]++;

        // Record all possible lags
        available.forEach(pos => {
          const possibleLag = pos - currentPos;
          if (!possibleByLag[possibleLag]) possibleByLag[possibleLag] = 0;
          possibleByLag[possibleLag]++;
        });
      }
    });

    const bins = ['≤-7', '-6', '-5', '-4', '-3', '-2', '-1', '+1', '+2', '+3', '+4', '+5', '+6', '≥+7'];
    return bins.map(bin => {
      let actual = 0;
      let possible = 0;

      if (bin === '≤-7') {
        for (const lag in actualByLag) if (parseInt(lag) <= -7) actual += actualByLag[lag];
        for (const lag in possibleByLag) if (parseInt(lag) <= -7) possible += possibleByLag[lag];
      } else if (bin === '≥+7') {
        for (const lag in actualByLag) if (parseInt(lag) >= 7) actual += actualByLag[lag];
        for (const lag in possibleByLag) if (parseInt(lag) >= 7) possible += possibleByLag[lag];
      } else {
        const lagNum = parseInt(bin);
        actual = actualByLag[lagNum] ?? 0;
        possible = possibleByLag[lagNum] ?? 0;
      }

      return { lag: bin, crp: possible > 0 ? actual / possible : 0 };
    });
  }

  // ── Summary stats ─────────────────────────────────────────────────────────
  function computeSummaryStats() {
    if (participants.length === 0) return null;
    const nP = participants.length;

    // Per-participant recall probabilities
    const primacyRates: number[] = [];
    const middleRates: number[] = [];
    const recencyRates: number[] = [];
    let totalAdjacentTransitions = 0;
    let totalForwardAdjacent = 0;
    let totalBackwardAdjacent = 0;
    let totalTransitions = 0;

    participants.forEach(p => {
      const recalled = new Set<number>();
      p.recalls.forEach(r => {
        if (r.is_correct_recall && r.matched_serial_position !== null) {
          recalled.add(r.matched_serial_position);
        }
      });
      primacyRates.push([1, 2, 3, 4].filter(pos => recalled.has(pos)).length / 4);
      middleRates.push(Array.from({ length: 8 }, (_, i) => i + 9).filter(pos => recalled.has(pos)).length / 8);
      recencyRates.push([21, 22, 23, 24].filter(pos => recalled.has(pos)).length / 4);

      // Lag transitions
      const correctRecalls = p.recalls
        .filter(r => r.is_correct_recall && r.matched_serial_position !== null && !r.is_repetition)
        .sort((a, b) => a.output_position - b.output_position);

      for (let i = 0; i < correctRecalls.length - 1; i++) {
        const lag = correctRecalls[i + 1].matched_serial_position! - correctRecalls[i].matched_serial_position!;
        if (lag === 0) continue;
        totalTransitions++;
        if (Math.abs(lag) === 1) totalAdjacentTransitions++;
        if (lag === 1) totalForwardAdjacent++;
        if (lag === -1) totalBackwardAdjacent++;
      }
    });

    const mean = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

    return {
      primacy: mean(primacyRates),
      middle: mean(middleRates),
      recency: mean(recencyRates),
      adjacentRate: totalTransitions > 0 ? totalAdjacentTransitions / totalTransitions : 0,
      forwardAdjacentRate: totalTransitions > 0 ? totalForwardAdjacent / totalTransitions : 0,
      backwardAdjacentRate: totalTransitions > 0 ? totalBackwardAdjacent / totalTransitions : 0,
      nParticipants: nP,
    };
  }

  // ── Auth gate ─────────────────────────────────────────────────────────────
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
              type="password"
              value={pwInput}
              onChange={e => { setPwInput(e.target.value); setPwError(false); }}
              placeholder="Password"
              autoFocus
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

  const summaryStats = computeSummaryStats();
  const serialPositionData = computeSerialPositionCurve();
  const participantThirds = computeParticipantThirds();
  const lagData = computeLagDistribution();
  const lagCRPData = computeLagCRP();

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <GraduationCap className="w-10 h-10 text-emerald-400" />
            <div>
              <h1 className="text-4xl font-bold tracking-tight">Teacher Dashboard</h1>
              <p className="text-muted mt-1">Serial Position & Temporal Contiguity</p>
            </div>
          </div>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-400 text-zinc-900 font-semibold rounded-lg hover:bg-emerald-300 transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </motion.button>
        </div>

        {error && (
          <div className="bg-card border border-yellow-500/50 rounded-xl p-8 mb-8 text-center">
            <p className="text-yellow-400">{error}</p>
          </div>
        )}

        {summaryStats && (
          <>
            {/* Summary stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
              <div className="bg-card border border-border rounded-xl p-4 text-center">
                <p className="text-xs text-gray-400">Participants</p>
                <p className="text-2xl font-bold text-emerald-400">{summaryStats.nParticipants}</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-4 text-center">
                <p className="text-xs text-gray-400">Primacy (1-4)</p>
                <p className="text-2xl font-bold">{(summaryStats.primacy * 100).toFixed(0)}%</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-4 text-center">
                <p className="text-xs text-gray-400">Middle (9-16)</p>
                <p className="text-2xl font-bold">{(summaryStats.middle * 100).toFixed(0)}%</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-4 text-center">
                <p className="text-xs text-gray-400">Recency (21-24)</p>
                <p className="text-2xl font-bold">{(summaryStats.recency * 100).toFixed(0)}%</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-4 text-center">
                <p className="text-xs text-gray-400">|Lag|=1 Rate</p>
                <p className="text-2xl font-bold">{(summaryStats.adjacentRate * 100).toFixed(0)}%</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-4 text-center">
                <p className="text-xs text-gray-400">+1 / -1</p>
                <p className="text-2xl font-bold">
                  {(summaryStats.forwardAdjacentRate * 100).toFixed(0)}% / {(summaryStats.backwardAdjacentRate * 100).toFixed(0)}%
                </p>
              </div>
            </div>

            {/* Plot 1: Serial Position Curve */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <ChartCard title="Serial Position Curve (Aggregate)">
                {(revealed) => (
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={serialPositionData} margin={{ top: 10, right: 20, left: 10, bottom: 30 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="position" stroke="#9ca3af" label={{ value: 'Serial Position', position: 'insideBottom', offset: -10, fill: '#9ca3af' }} />
                      <YAxis stroke="#9ca3af" domain={[0, 1]} tickFormatter={v => `${(v * 100).toFixed(0)}%`}
                        label={{ value: 'P(Recall)', angle: -90, position: 'insideLeft', fill: '#9ca3af' }} />
                      <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                        formatter={(v: number) => [`${(v * 100).toFixed(1)}%`, 'Recall']} />
                      {revealed && (
                        <Line type="monotone" dataKey="probability" stroke="#34d399" strokeWidth={2.5}
                          dot={{ fill: '#34d399', r: 3 }} />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              {/* Plot 2: Per-participant thirds */}
              <ChartCard title="Per-Participant Recall by Thirds">
                {(revealed) => (
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart
                      data={[
                        { third: 'Primacy (1-8)', ...Object.fromEntries(participantThirds.map((p, i) => [`p${i}`, p.primacy])) },
                        { third: 'Middle (9-16)', ...Object.fromEntries(participantThirds.map((p, i) => [`p${i}`, p.middle])) },
                        { third: 'Recency (17-24)', ...Object.fromEntries(participantThirds.map((p, i) => [`p${i}`, p.recency])) },
                      ]}
                      margin={{ top: 10, right: 20, left: 10, bottom: 30 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="third" stroke="#9ca3af" />
                      <YAxis stroke="#9ca3af" domain={[0, 1]} tickFormatter={v => `${(v * 100).toFixed(0)}%`}
                        label={{ value: 'P(Recall)', angle: -90, position: 'insideLeft', fill: '#9ca3af' }} />
                      <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                        formatter={(v: number) => [`${(v * 100).toFixed(1)}%`]} />
                      {revealed && participantThirds.map((p, i) => (
                        <Line key={i} type="monotone" dataKey={`p${i}`} stroke={COLORS[i % COLORS.length]}
                          strokeWidth={1.5} dot={{ r: 3 }} name={p.name} />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>
            </div>

            {/* Plot 3 & 4: Lag plots */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartCard title="Lag Transition (Simple Count)">
                {(revealed) => (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={lagData} margin={{ top: 10, right: 20, left: 10, bottom: 30 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="lag" stroke="#9ca3af" label={{ value: 'Lag', position: 'insideBottom', offset: -10, fill: '#9ca3af' }} />
                      <YAxis stroke="#9ca3af" label={{ value: 'Proportion', angle: -90, position: 'insideLeft', fill: '#9ca3af' }} />
                      <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                        formatter={(v: number) => [v.toFixed(3), 'Proportion']} />
                      {revealed && <Bar dataKey="proportion" fill="#34d399" radius={[4, 4, 0, 0]} />}
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard title="Lag-CRP (Conditional Response Probability)">
                {(revealed) => (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={lagCRPData} margin={{ top: 10, right: 20, left: 10, bottom: 30 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="lag" stroke="#9ca3af" label={{ value: 'Lag', position: 'insideBottom', offset: -10, fill: '#9ca3af' }} />
                      <YAxis stroke="#9ca3af" domain={[0, 'auto']}
                        label={{ value: 'CRP', angle: -90, position: 'insideLeft', fill: '#9ca3af' }} />
                      <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                        formatter={(v: number) => [v.toFixed(3), 'CRP']} />
                      {revealed && <Bar dataKey="crp" fill="#60a5fa" radius={[4, 4, 0, 0]} />}
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
