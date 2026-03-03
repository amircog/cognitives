'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, ErrorBar,
  ScatterChart, Scatter, ZAxis, Cell,
} from 'recharts';
import { BarChart2, Download, Home, RefreshCw } from 'lucide-react';
import { getSupabase } from '@/lib/supabase';
import {
  computeParticipantStats, computeAggChartData,
  scatterEnsembleVs2AFC, scatter2AFCVsRecognition,
  ParticipantStats, ScatterPoint,
} from '@/lib/summary-stats/analysis';
import { TYPE_LABELS } from '@/lib/summary-stats/stimuli';
import { TrialResult } from '@/types/summary-stats';

// Custom dot for scatter that shows participant name in tooltip
const CustomDot = (props: { cx?: number; cy?: number; payload?: ScatterPoint }) => {
  const { cx = 0, cy = 0 } = props;
  return <circle cx={cx} cy={cy} r={6} fill="#f97316" stroke="#fff" strokeWidth={1.5} opacity={0.85} />;
};

export default function TeacherPage() {
  const router = useRouter();
  const [language, setLanguage]       = useState<'en' | 'he'>('he');
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [participants, setParticipants] = useState<ParticipantStats[]>([]);

  useEffect(() => {
    const lang = sessionStorage.getItem('ss_language') as 'en' | 'he' | null;
    if (lang) setLanguage(lang);
  }, []);

  const fetchData = useCallback(async () => {
    setRefreshing(true);
    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error('Supabase not available');
      const { data } = await supabase
        .from('summary_stats_results')
        .select('*')
        .order('created_at', { ascending: true });

      if (data && data.length > 0) {
        const bySession: Record<string, TrialResult[]> = {};
        data.forEach((row: TrialResult) => {
          if (!bySession[row.session_id]) bySession[row.session_id] = [];
          bySession[row.session_id].push(row);
        });
        setParticipants(Object.entries(bySession).map(([sid, rows]) =>
          computeParticipantStats(sid, rows)
        ));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDownloadCSV = async () => {
    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error('Supabase not available');
      const { data } = await supabase.from('summary_stats_results').select('*').order('created_at');
      if (!data || data.length === 0) return;
      const headers = Object.keys(data[0]).join(',');
      const rows = data.map((r: Record<string, unknown>) => Object.values(r).join(','));
      const csv = [headers, ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'ensemble-all-data.csv'; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { console.error(e); }
  };

  // ── Derived data ───────────────────────────────────────────────────────

  const aggData    = computeAggChartData(participants, language, TYPE_LABELS);
  const scatter4a  = scatterEnsembleVs2AFC(participants);
  const scatter4b  = scatter2AFCVsRecognition(participants);

  const t = language === 'he' ? {
    title:         'לוח בקרה — תפיסת אנסמבל',
    nP:            (n: number) => `${n} משתתפים`,
    compTitle:     'זיהוי פריטים מול בחירה בין שתיים (2AFC) — לפי סוג גירוי',
    compDesc:      'שני הסוגים הם משימות בחירה בינארית; קו העזר ב-50% הוא רמת הסיכוי.',
    recLabel:      'זיהוי פריטים',
    afcLabel:      '2AFC סטטיסטיקה',
    chanceLabel:   'סיכוי (50%)',
    accAxis:       'דיוק (%)',
    s4aTitle:      'פזורת: טעות אנסמבל מול דיוק 2AFC',
    s4aXLabel:     'טעות אנסמבל (px / °)',
    s4aYLabel:     'דיוק 2AFC (%)',
    s4bTitle:      'פזורת: דיוק 2AFC מול זיהוי פריטים',
    s4bXLabel:     'דיוק 2AFC (%)',
    s4bYLabel:     'דיוק זיהוי (%)',
    noData:        'אין נתונים עדיין',
    loading:       'טוען...',
    download:      'הורד CSV',
    home:          'דף הבית',
    refresh:       'רענן',
  } : {
    title:         'Teacher Dashboard — Ensemble Perception',
    nP:            (n: number) => `${n} participant${n !== 1 ? 's' : ''}`,
    compTitle:     'Item Recognition vs 2AFC Summary Stats — by Stimulus Type',
    compDesc:      'Both tasks are binary choice; the dashed line at 50% is chance level.',
    recLabel:      'Item Recognition',
    afcLabel:      '2AFC Statistic',
    chanceLabel:   'Chance (50%)',
    accAxis:       'Accuracy (%)',
    s4aTitle:      'Scatter: Ensemble Error vs 2AFC Accuracy',
    s4aXLabel:     'Ensemble Error (px / °)',
    s4aYLabel:     '2AFC Accuracy (%)',
    s4bTitle:      'Scatter: 2AFC Accuracy vs Item Recognition Accuracy',
    s4bXLabel:     '2AFC Accuracy (%)',
    s4bYLabel:     'Recognition Accuracy (%)',
    noData:        'No data yet',
    loading:       'Loading…',
    download:      'Download CSV',
    home:          'Home',
    refresh:       'Refresh',
  };

  // Custom tooltip for scatter charts
  const ScatterTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: ScatterPoint }[] }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white shadow">
        <p className="font-semibold">{d.name}</p>
        <p>x: {d.x}</p>
        <p>y: {d.y}</p>
      </div>
    );
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 ${language === 'he' ? 'rtl' : 'ltr'}`}>
      <div className="container mx-auto px-4 py-8 max-w-5xl">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8 flex-wrap gap-4"
        >
          <div>
            <div className="flex items-center gap-3 mb-1">
              <BarChart2 className="w-8 h-8 text-orange-500" />
              <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
            </div>
            {!loading && <p className="text-orange-600 font-medium">{t.nP(participants.length)}</p>}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setLanguage(l => l === 'en' ? 'he' : 'en')}
              className="px-4 py-2 text-sm font-medium text-orange-600 hover:bg-orange-50 rounded-lg border border-orange-200"
            >
              {language === 'he' ? 'English' : 'עברית'}
            </button>
            <button onClick={fetchData} disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg">
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              {t.refresh}
            </button>
          </div>
        </motion.div>

        {loading ? (
          <div className="text-center text-gray-500 py-20 text-lg">{t.loading}</div>
        ) : participants.length === 0 ? (
          <div className="text-center text-gray-400 py-20 text-lg">{t.noData}</div>
        ) : (
          <>
            {/* ── Chart 1: Recognition vs 2AFC by stimulus type (with SEM error bars) ── */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl shadow-xl p-6 mb-6"
            >
              <h2 className="text-lg font-bold text-gray-900 mb-1">{t.compTitle}</h2>
              <p className="text-sm text-gray-500 mb-4">{t.compDesc}</p>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={aggData} margin={{ left: 10, bottom: 5 }} barCategoryGap="25%">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]}
                    label={{ value: t.accAxis, angle: -90, position: 'insideLeft', style: { fontSize: 11 } }}
                  />
                  <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
                  <ReferenceLine y={50} stroke="#9ca3af" strokeDasharray="6 3"
                    label={{ value: t.chanceLabel, position: 'right', style: { fontSize: 10, fill: '#9ca3af' } }}
                  />
                  <Bar dataKey="recognition" name={t.recLabel} fill="#fb923c" radius={[4, 4, 0, 0]}>
                    <ErrorBar dataKey="recognitionSEM" width={4} strokeWidth={2} stroke="#c2410c" direction="y" />
                  </Bar>
                  <Bar dataKey="twoAFC" name={t.afcLabel} fill="#fbbf24" radius={[4, 4, 0, 0]}>
                    <ErrorBar dataKey="twoAFCSEM" width={4} strokeWidth={2} stroke="#b45309" direction="y" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="flex gap-4 justify-center mt-3 text-xs text-gray-500">
                <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-orange-400"></span>{t.recLabel}</span>
                <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-amber-400"></span>{t.afcLabel}</span>
                <span className="text-gray-400">{language === 'he' ? 'פסים = שגיאת תקן (SEM)' : 'Error bars = SEM'}</span>
              </div>
            </motion.div>

            {/* ── Scatter plots ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">

              {/* 4a: Ensemble error vs 2AFC accuracy */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                className="bg-white rounded-2xl shadow-xl p-6"
              >
                <h2 className="text-sm font-bold text-gray-900 mb-4">{t.s4aTitle}</h2>
                {scatter4a.length < 2 ? (
                  <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">
                    {language === 'he' ? 'צריך לפחות 2 משתתפים' : 'Need at least 2 participants'}
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <ScatterChart margin={{ left: 10, bottom: 20, right: 10, top: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="x" type="number" name={t.s4aXLabel}
                        label={{ value: t.s4aXLabel, position: 'insideBottom', offset: -12, style: { fontSize: 10 } }}
                        tick={{ fontSize: 11 }}
                      />
                      <YAxis dataKey="y" type="number" name={t.s4aYLabel} domain={[0, 100]}
                        label={{ value: t.s4aYLabel, angle: -90, position: 'insideLeft', style: { fontSize: 10 } }}
                        tick={{ fontSize: 11 }}
                      />
                      <ZAxis range={[60, 60]} />
                      <Tooltip content={<ScatterTooltip />} />
                      <Scatter data={scatter4a} shape={<CustomDot />}>
                        {scatter4a.map((_, i) => <Cell key={i} fill="#f97316" />)}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                )}
              </motion.div>

              {/* 4b: 2AFC accuracy vs recognition accuracy */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                className="bg-white rounded-2xl shadow-xl p-6"
              >
                <h2 className="text-sm font-bold text-gray-900 mb-4">{t.s4bTitle}</h2>
                {scatter4b.length < 2 ? (
                  <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">
                    {language === 'he' ? 'צריך לפחות 2 משתתפים' : 'Need at least 2 participants'}
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <ScatterChart margin={{ left: 10, bottom: 20, right: 10, top: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="x" type="number" name={t.s4bXLabel} domain={[0, 100]}
                        label={{ value: t.s4bXLabel, position: 'insideBottom', offset: -12, style: { fontSize: 10 } }}
                        tick={{ fontSize: 11 }}
                      />
                      <YAxis dataKey="y" type="number" name={t.s4bYLabel} domain={[0, 100]}
                        label={{ value: t.s4bYLabel, angle: -90, position: 'insideLeft', style: { fontSize: 10 } }}
                        tick={{ fontSize: 11 }}
                      />
                      <ZAxis range={[60, 60]} />
                      <Tooltip content={<ScatterTooltip />} />
                      <Scatter data={scatter4b} shape={<CustomDot />}>
                        {scatter4b.map((_, i) => <Cell key={i} fill="#fbbf24" />)}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                )}
              </motion.div>
            </div>

            {/* ── Buttons ── */}
            <div className="flex gap-3 justify-center flex-wrap">
              <button onClick={handleDownloadCSV}
                className="flex items-center gap-2 px-6 py-3 bg-gray-700 hover:bg-gray-800 text-white font-semibold rounded-xl transition-colors">
                <Download className="w-4 h-4" />{t.download}
              </button>
              <button onClick={() => router.push('/')}
                className="flex items-center gap-2 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-xl transition-colors">
                <Home className="w-4 h-4" />{t.home}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
