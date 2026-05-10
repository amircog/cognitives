'use client';

import { useEffect, useState, useMemo, FormEvent } from 'react';
import { motion } from 'framer-motion';
import {
  ComposedChart, BarChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ErrorBar, ScatterChart, Scatter,
} from 'recharts';
import { GraduationCap, RefreshCw, Download } from 'lucide-react';
import { getSupabase } from '@/lib/supabase';
import { SEQUENCE_A, SEQUENCE_B } from '@/lib/srt/stimuli';

const PW_HASH = '5f63c8759a4968d6e814db98e85f7658554882b44213d85f3a3b15480f47e69f';
const TRIALS_PER_BLOCK = 108;
const SEQUENCE_REPS_PER_BLOCK = 9;

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

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function sdCleanRows(rows: Row[]): Row[] {
  const sessions = Array.from(new Set(rows.map(r => r.session_id)));
  const cleaned: Row[] = [];
  for (const sid of sessions) {
    const sRows = rows.filter(r => r.session_id === sid);
    const rts = sRows.filter(r => r.rt_ms != null).map(r => r.rt_ms as number);
    if (rts.length < 2) { cleaned.push(...sRows); continue; }
    const m = mean(rts);
    const sd = Math.sqrt(rts.reduce((a, b) => a + (b - m) ** 2, 0) / (rts.length - 1));
    const lo = m - 2.5 * sd, hi = m + 2.5 * sd;
    cleaned.push(...sRows.filter(r => r.rt_ms == null || (r.rt_ms >= lo && r.rt_ms <= hi)));
  }
  return cleaned;
}

function excludeParticipants(rows: Row[]): { kept: Row[]; excludedIds: Set<string> } {
  const sessions = Array.from(new Set(rows.map(r => r.session_id)));
  const participantStats = sessions.map(sid => {
    const sRows = rows.filter(r => r.session_id === sid);
    const correct = sRows.filter(r => r.correct && r.rt_ms != null);
    const acc = sRows.length > 0 ? correct.length / sRows.length : 0;
    const rt = correct.length > 0 ? mean(correct.map(r => r.rt_ms!)) : 0;
    return { sid, acc, rt };
  });

  const rts = participantStats.map(p => p.rt);
  const accs = participantStats.map(p => p.acc);
  const rtMean = mean(rts);
  const rtSd = Math.sqrt(rts.reduce((a, b) => a + (b - rtMean) ** 2, 0) / (rts.length - 1));
  const accMean = mean(accs);
  const accSd = Math.sqrt(accs.reduce((a, b) => a + (b - accMean) ** 2, 0) / (accs.length - 1));

  const excludedIds = new Set<string>();
  for (const p of participantStats) {
    if (p.rt < rtMean - 2.5 * rtSd || p.rt > rtMean + 2.5 * rtSd) excludedIds.add(p.sid);
    if (p.acc < accMean - 2.5 * accSd) excludedIds.add(p.sid);
  }

  return { kept: rows.filter(r => !excludedIds.has(r.session_id)), excludedIds };
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

type GenRow = {
  session_id: string;
  participant_name: string | null;
  sequence: number[];
  main_is_a: boolean;
};

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
  const [genRows, setGenRows] = useState<GenRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'raw' | 'sdclean'>('raw');
  const [excludeParticipantsEnabled, setExcludeParticipantsEnabled] = useState(false);

  const trialCleanedRows = useMemo(
    () => mode === 'sdclean' ? sdCleanRows(rawRows) : rawRows,
    [rawRows, mode],
  );

  const { activeRows, excludedSessions } = useMemo(() => {
    if (!excludeParticipantsEnabled) return { activeRows: trialCleanedRows, excludedSessions: new Set<string>() };
    const { kept, excludedIds } = excludeParticipants(trialCleanedRows);
    return { activeRows: kept, excludedSessions: excludedIds };
  }, [trialCleanedRows, excludeParticipantsEnabled]);

  const trialExcludedCount = rawRows.length - trialCleanedRows.length;

  // Determine which participants used sequence A as main
  const sessionSequenceMap = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const row of activeRows) {
      if (map.has(row.session_id)) continue;
      if (row.block_number !== 5) {
        map.set(row.session_id, row.sequence_type === 'main');
      }
    }
    // Infer from generation data if available
    for (const g of genRows) {
      if (!map.has(g.session_id)) map.set(g.session_id, g.main_is_a);
    }
    return map;
  }, [activeRows, genRows]);

  // We need to determine main_is_a per session from the data
  // Block 5 is interference, blocks 1-4,6 are main
  // We can check if the first trial's sequence_type is 'main' → that's their main sequence
  // But we don't store which sequence it is (A or B) in the trial data
  // We need to infer from target_location patterns
  const sessionIsAMap = useMemo(() => {
    const SEQUENCE_A = [3, 4, 2, 3, 1, 2, 1, 4, 3, 2, 4, 1];
    const map = new Map<string, boolean>();
    const sessions = Array.from(new Set(activeRows.map(r => r.session_id)));
    for (const sid of sessions) {
      // Look at block 1 first few trials to determine sequence
      const b1 = activeRows
        .filter(r => r.session_id === sid && r.block_number === 1)
        .sort((a, b) => a.trial_in_block - b.trial_in_block)
        .slice(0, 12)
        .map(r => r.target_location);
      if (b1.length >= 12) {
        // Check if matches sequence A starting from position 0
        const matchesA = SEQUENCE_A.every((v, i) => b1[i] === v);
        map.set(sid, matchesA);
      } else {
        // Check from generation data
        const gen = genRows.find(g => g.session_id === sid);
        if (gen) map.set(sid, gen.main_is_a);
      }
    }
    return map;
  }, [activeRows, genRows]);

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

    // Fetch trial data
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

    // Fetch generation data
    const { data: gData } = await supabase.from('srt_generation').select('*');
    if (gData) setGenRows(gData as GenRow[]);

    setLoading(false);
  }

  // RT by block chart data
  const blockChartData = useMemo(() => {
    if (activeRows.length === 0) return [];
    const sessions = Array.from(new Set(activeRows.map(r => r.session_id)));
    const blockLabels = ['Block 1', 'Block 2', 'Block 3', 'Block 4', 'Block 5 (Int.)', 'Block 6'];

    return [1, 2, 3, 4, 5, 6].map(block => {
      const participantMeans: number[] = [];
      for (const sid of sessions) {
        const bRows = activeRows.filter(r => r.session_id === sid && r.block_number === block && r.correct && r.rt_ms != null);
        if (bRows.length > 0) {
          participantMeans.push(mean(bRows.map(r => r.rt_ms!)));
        }
      }
      return {
        block: `Block ${block}`,
        rt: participantMeans.length > 0 ? Math.round(mean(participantMeans)) : null,
        sem: Math.round(sem(participantMeans)),
      };
    });
  }, [activeRows]);

  // RT by sequence repetition (1-54): 9 reps × 6 blocks
  const sequenceRepData = useMemo(() => {
    if (activeRows.length === 0) return [];
    const sessions = Array.from(new Set(activeRows.map(r => r.session_id)));
    const points: { rep: number; rt: number | null; sem: number }[] = [];

    for (let rep = 1; rep <= 54; rep++) {
      // rep 1-9 = block 1, rep 10-18 = block 2, etc.
      const block = Math.ceil(rep / SEQUENCE_REPS_PER_BLOCK);
      const repInBlock = ((rep - 1) % SEQUENCE_REPS_PER_BLOCK);
      const trialStart = repInBlock * 12 + 1;
      const trialEnd = trialStart + 11;

      const participantMeans: number[] = [];
      for (const sid of sessions) {
        const rRows = activeRows.filter(r =>
          r.session_id === sid &&
          r.block_number === block &&
          r.trial_in_block >= trialStart &&
          r.trial_in_block <= trialEnd &&
          r.correct && r.rt_ms != null
        );
        if (rRows.length > 0) {
          participantMeans.push(mean(rRows.map(r => r.rt_ms!)));
        }
      }
      points.push({
        rep,
        rt: participantMeans.length > 0 ? Math.round(mean(participantMeans)) : null,
        sem: Math.round(sem(participantMeans)),
      });
    }
    return points;
  }, [activeRows]);

  // RT by block separated by sequence assignment (A vs B as main)
  const blockBySequenceData = useMemo(() => {
    if (activeRows.length === 0) return [];
    const sessions = Array.from(new Set(activeRows.map(r => r.session_id)));
    const sessionsA = sessions.filter(s => sessionIsAMap.get(s) === true);
    const sessionsB = sessions.filter(s => sessionIsAMap.get(s) === false);

    return [1, 2, 3, 4, 5, 6].map(block => {
      const meansA: number[] = [];
      for (const sid of sessionsA) {
        const bRows = activeRows.filter(r => r.session_id === sid && r.block_number === block && r.correct && r.rt_ms != null);
        if (bRows.length > 0) meansA.push(mean(bRows.map(r => r.rt_ms!)));
      }
      const meansB: number[] = [];
      for (const sid of sessionsB) {
        const bRows = activeRows.filter(r => r.session_id === sid && r.block_number === block && r.correct && r.rt_ms != null);
        if (bRows.length > 0) meansB.push(mean(bRows.map(r => r.rt_ms!)));
      }
      return {
        block: `Block ${block}`,
        rtA: meansA.length > 0 ? Math.round(mean(meansA)) : null,
        semA: Math.round(sem(meansA)),
        rtB: meansB.length > 0 ? Math.round(mean(meansB)) : null,
        semB: Math.round(sem(meansB)),
      };
    });
  }, [activeRows, sessionIsAMap]);

  // Scatter: RT vs Accuracy per participant
  const scatterData = useMemo(() => {
    if (activeRows.length === 0) return [];
    const sessions = Array.from(new Set(activeRows.map(r => r.session_id)));
    return sessions.map(sid => {
      const sRows = activeRows.filter(r => r.session_id === sid);
      const correct = sRows.filter(r => r.correct && r.rt_ms != null);
      const acc = sRows.length > 0 ? (correct.length / sRows.length) * 100 : 0;
      const rt = correct.length > 0 ? mean(correct.map(r => r.rt_ms!)) : 0;
      const name = sRows[0]?.participant_name ?? sid.slice(0, 8);
      return { name, rt: Math.round(rt), acc: Math.round(acc * 10) / 10 };
    });
  }, [activeRows]);

  // Generation accuracy per serial position (exactly 1 response per participant per position)
  const generationAccData = useMemo(() => {
    if (genRows.length === 0) return [];
    const positionCorrect: number[][] = Array.from({ length: 12 }, () => []);

    for (const g of genRows) {
      if (excludeParticipantsEnabled && excludedSessions.has(g.session_id)) continue;
      const mainSeq = g.main_is_a ? SEQUENCE_A : SEQUENCE_B;
      const clicks = g.sequence as number[];
      for (let i = 0; i < Math.min(clicks.length, 12); i++) {
        positionCorrect[i].push(clicks[i] === mainSeq[i] ? 100 : 0);
      }
    }

    return positionCorrect.map((vals, i) => ({
      position: i + 1,
      accuracy: vals.length > 0 ? Math.round(mean(vals)) : 0,
      sem: vals.length > 0 ? Math.round(sem(vals)) : 0,
    }));
  }, [genRows, excludeParticipantsEnabled, excludedSessions]);

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

  const nParticipants = new Set(activeRows.map(r => r.session_id)).size;
  const nParticipantsA = Array.from(new Set(activeRows.map(r => r.session_id))).filter(s => sessionIsAMap.get(s) === true).length;
  const nParticipantsB = Array.from(new Set(activeRows.map(r => r.session_id))).filter(s => sessionIsAMap.get(s) === false).length;

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
          <StatBox label="Participants" value={nParticipants} />
          <StatBox label="Seq A main" value={nParticipantsA} />
          <StatBox label="Seq B main" value={nParticipantsB} />
          <StatBox label="Total Trials" value={activeRows.length} />
        </div>

        {/* Toggles */}
        {rawRows.length > 0 && (
          <div className="flex flex-col items-center gap-3">
            {/* Trial SD-clean toggle */}
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
                ? trialExcludedCount > 0
                  ? `${trialExcludedCount} trial${trialExcludedCount > 1 ? 's' : ''} excluded (${trialCleanedRows.length} of ${rawRows.length} kept)`
                  : 'No trials excluded'
                : `${rawRows.length} trials`}
            </p>

            {/* Participant exclusion toggle */}
            <div className="flex rounded-xl border border-border bg-card overflow-hidden">
              <button
                onClick={() => setExcludeParticipantsEnabled(false)}
                className={`px-5 py-2 text-sm font-medium transition-colors ${
                  !excludeParticipantsEnabled ? 'bg-rose-500 text-white' : 'text-muted hover:text-foreground'
                }`}
              >
                All Participants
              </button>
              <button
                onClick={() => setExcludeParticipantsEnabled(true)}
                className={`px-5 py-2 text-sm font-medium transition-colors ${
                  excludeParticipantsEnabled ? 'bg-rose-500 text-white' : 'text-muted hover:text-foreground'
                }`}
              >
                Exclude Outliers (±2.5 SD)
              </button>
            </div>
            <p className="text-xs text-muted h-4">
              {excludeParticipantsEnabled
                ? excludedSessions.size > 0
                  ? `${excludedSessions.size} participant${excludedSessions.size > 1 ? 's' : ''} excluded (RT ±2.5 SD or accuracy −2.5 SD)`
                  : 'No participants excluded'
                : `${nParticipants} participants`}
            </p>
          </div>
        )}

        {/* Chart 1: RT by Block */}
        <ChartCard title="Mean RT by Block (correct trials)">
          {(revealed) => (
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={blockChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="block" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" label={{ value: 'RT (ms)', angle: -90, position: 'insideLeft', fill: '#9ca3af' }} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #374151' }} />
                <Legend verticalAlign="top" />
                {revealed && (
                  <Line type="monotone" dataKey="rt" stroke="#34d399" strokeWidth={2} name="Mean RT" dot={{ r: 5 }}>
                    <ErrorBar dataKey="sem" width={4} strokeWidth={1.5} stroke="#6b7280" direction="y" />
                  </Line>
                )}
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Chart 2: RT by sequence repetition (1-54) */}
        <ChartCard title="Mean RT by Sequence Repetition (1–54)">
          {(revealed) => (
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={sequenceRepData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="rep" stroke="#9ca3af" label={{ value: 'Sequence repetition', position: 'insideBottom', offset: -5, fill: '#9ca3af' }} />
                <YAxis stroke="#9ca3af" label={{ value: 'RT (ms)', angle: -90, position: 'insideLeft', fill: '#9ca3af' }} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #374151' }} />
                <Legend verticalAlign="top" />
                {revealed && (
                  <Line type="monotone" dataKey="rt" stroke="#34d399" strokeWidth={1.5} name="Mean RT" dot={false} />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Chart 3: RT by Block split by Sequence A vs B */}
        <ChartCard title="Mean RT by Block — Sequence A vs B as main">
          {(revealed) => (
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={blockBySequenceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="block" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" label={{ value: 'RT (ms)', angle: -90, position: 'insideLeft', fill: '#9ca3af' }} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #374151' }} />
                <Legend verticalAlign="top" />
                {revealed && (
                  <>
                    <Line type="monotone" dataKey="rtA" stroke="#34d399" strokeWidth={2} name={`Seq A main (n=${nParticipantsA})`} dot={{ r: 4 }}>
                      <ErrorBar dataKey="semA" width={4} strokeWidth={1.5} stroke="#6b7280" direction="y" />
                    </Line>
                    <Line type="monotone" dataKey="rtB" stroke="#f97316" strokeWidth={2} name={`Seq B main (n=${nParticipantsB})`} dot={{ r: 4 }}>
                      <ErrorBar dataKey="semB" width={4} strokeWidth={1.5} stroke="#6b7280" direction="y" />
                    </Line>
                  </>
                )}
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Chart 4: Scatter RT vs Accuracy */}
        <ChartCard title="Individual Participants: RT × Accuracy">
          {(revealed) => (
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" dataKey="rt" stroke="#9ca3af" name="RT" label={{ value: 'Mean RT (ms)', position: 'insideBottom', offset: -5, fill: '#9ca3af' }} />
                <YAxis type="number" dataKey="acc" stroke="#9ca3af" name="Accuracy" domain={[0, 100]} label={{ value: 'Accuracy (%)', angle: -90, position: 'insideLeft', fill: '#9ca3af' }} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #374151' }} cursor={{ strokeDasharray: '3 3' }} />
                {revealed && (
                  <Scatter data={scatterData} fill="#34d399" name="Participants">
                  </Scatter>
                )}
              </ScatterChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Chart 5: Generation task accuracy per serial position */}
        {generationAccData.length > 0 && (
          <ChartCard title="Generation Task: Accuracy by Sequence Position">
            {(revealed) => (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={generationAccData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="position" stroke="#9ca3af" label={{ value: 'Sequence position', position: 'insideBottom', offset: -5, fill: '#9ca3af' }} />
                  <YAxis stroke="#9ca3af" domain={[0, 100]} label={{ value: 'Accuracy (%)', angle: -90, position: 'insideLeft', fill: '#9ca3af' }} />
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #374151' }} />
                  <Legend verticalAlign="top" />
                  {revealed && (
                    <Bar dataKey="accuracy" fill="#34d399" name="Accuracy (%)">
                      <ErrorBar dataKey="sem" width={4} strokeWidth={1.5} stroke="#6b7280" direction="y" />
                    </Bar>
                  )}
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        )}
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
