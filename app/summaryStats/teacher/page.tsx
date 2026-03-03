'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { BarChart2, Download, Home, RefreshCw } from 'lucide-react';
import { getSupabase } from '@/lib/supabase';
import { computeParticipantStats, ParticipantStats } from '@/lib/summary-stats/analysis';
import { TYPE_LABELS } from '@/lib/summary-stats/stimuli';
import { TrialResult } from '@/types/summary-stats';

export default function TeacherPage() {
  const router = useRouter();
  const [language, setLanguage] = useState<'en' | 'he'>('he');
  const [loading, setLoading] = useState(true);
  const [participants, setParticipants] = useState<ParticipantStats[]>([]);
  const [refreshing, setRefreshing] = useState(false);

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

        const stats = Object.entries(bySession).map(([sid, rows]) =>
          computeParticipantStats(sid, rows)
        );
        setParticipants(stats);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDownloadCSV = async () => {
    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error('Supabase not available');
      const { data } = await supabase
        .from('summary_stats_results')
        .select('*')
        .order('created_at');
      if (!data || data.length === 0) return;
      const headers = Object.keys(data[0]).join(',');
      const rows = data.map((r: Record<string, unknown>) => Object.values(r).join(','));
      const csv = [headers, ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'summary-stats-all-data.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    }
  };

  const stimTypes = ['circles', 'line-lengths', 'line-orientations'] as const;

  const aggEnsembleByType = stimTypes.map(st => ({
    name: TYPE_LABELS[st][language],
    value: participants.length > 0
      ? Math.round(participants.reduce((s, p) => s + p.ensembleByType[st], 0) / participants.length)
      : 0,
  }));

  const aggRecByType = stimTypes.map(st => ({
    name: TYPE_LABELS[st][language],
    accuracy: participants.length > 0
      ? Math.round(participants.reduce((s, p) => s + p.recognitionByType[st], 0) / participants.length)
      : 50,
  }));

  const content = {
    he: {
      title: 'לוח בקרה — תפיסת אנסמבל',
      nParticipants: (n: number) => `${n} משתתפים`,
      ensembleChartTitle: 'טעות ממוצעת בסטטיסטיקות קבוצה (ממוצע על פני משתתפים)',
      recChartTitle: 'דיוק זיהוי פריטים (ממוצע על פני משתתפים)',
      participantsTitle: 'נתונים לפי משתתף',
      colName: 'שם',
      colEnsErr: 'טעות אנסמבל (px/°)',
      colRecAcc: 'דיוק זיהוי (%)',
      colNEns: 'ניסויי אנסמבל',
      colNRec: 'ניסויי זיהוי',
      chance: 'סיכוי (50%)',
      download: 'הורד CSV',
      home: 'דף הבית',
      refresh: 'רענן',
      loading: 'טוען...',
      noData: 'אין נתונים עדיין',
      errorAxis: 'טעות (px / °)',
      accuracyAxis: 'דיוק (%)',
    },
    en: {
      title: 'Teacher Dashboard — Ensemble Perception',
      nParticipants: (n: number) => `${n} participant${n !== 1 ? 's' : ''}`,
      ensembleChartTitle: 'Group Statistics Error (Average Across Participants)',
      recChartTitle: 'Item Recognition Accuracy (Average Across Participants)',
      participantsTitle: 'Per-Participant Data',
      colName: 'Name',
      colEnsErr: 'Ensemble Error (px/°)',
      colRecAcc: 'Recognition Acc (%)',
      colNEns: 'Ensemble Trials',
      colNRec: 'Recognition Trials',
      chance: 'Chance (50%)',
      download: 'Download CSV',
      home: 'Home',
      refresh: 'Refresh',
      loading: 'Loading...',
      noData: 'No data yet',
      errorAxis: 'Mean Abs Error (px / °)',
      accuracyAxis: 'Accuracy (%)',
    },
  };

  const t = content[language];

  return (
    <div
      className={`min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 ${language === 'he' ? 'rtl' : 'ltr'}`}
    >
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8 flex-wrap gap-4"
        >
          <div>
            <div className="flex items-center gap-3 mb-1">
              <BarChart2 className="w-8 h-8 text-orange-500" />
              <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
            </div>
            <p className="text-orange-600 font-medium">{t.nParticipants(participants.length)}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setLanguage(l => l === 'en' ? 'he' : 'en')}
              className="px-4 py-2 text-sm font-medium text-orange-600 hover:bg-orange-50 rounded-lg transition-colors border border-orange-200"
            >
              {language === 'he' ? 'English' : 'עברית'}
            </button>
            <button
              onClick={fetchData}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              {t.refresh}
            </button>
          </div>
        </motion.div>

        {loading ? (
          <div className="text-center text-gray-500 py-20">{t.loading}</div>
        ) : (
          <>
            {/* Aggregate Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                className="bg-white rounded-2xl shadow-xl p-6"
              >
                <h2 className="text-sm font-bold text-gray-700 mb-4">{t.ensembleChartTitle}</h2>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={aggEnsembleByType}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis
                      label={{ value: t.errorAxis, angle: -90, position: 'insideLeft', style: { fontSize: 10 } }}
                    />
                    <Tooltip />
                    <Bar dataKey="value" fill="#f97316" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                className="bg-white rounded-2xl shadow-xl p-6"
              >
                <h2 className="text-sm font-bold text-gray-700 mb-4">{t.recChartTitle}</h2>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={aggRecByType}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis
                      domain={[0, 100]}
                      label={{ value: t.accuracyAxis, angle: -90, position: 'insideLeft', style: { fontSize: 10 } }}
                    />
                    <Tooltip />
                    <ReferenceLine y={50} stroke="#6b7280" strokeDasharray="6 3" />
                    <Bar dataKey="accuracy" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>
            </div>

            {/* Per-participant table */}
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="bg-white rounded-2xl shadow-xl p-6 mb-6 overflow-x-auto"
            >
              <h2 className="text-xl font-bold text-gray-900 mb-4">{t.participantsTitle}</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 border-b border-gray-100">
                    <th className="text-start py-2 pe-4">{t.colName}</th>
                    <th className="text-start py-2 pe-4">{t.colEnsErr}</th>
                    <th className="text-start py-2 pe-4">{t.colRecAcc}</th>
                    <th className="text-start py-2 pe-4">{t.colNEns}</th>
                    <th className="text-start py-2">{t.colNRec}</th>
                  </tr>
                </thead>
                <tbody>
                  {participants.map((p, i) => (
                    <tr key={p.sessionId} className={i % 2 === 0 ? 'bg-gray-50' : ''}>
                      <td className="py-2 pe-4 font-medium text-gray-900">{p.participantName}</td>
                      <td className="py-2 pe-4 text-orange-600">{p.ensembleError.toFixed(1)}</td>
                      <td className="py-2 pe-4 text-amber-600">{p.recognitionAcc.toFixed(1)}%</td>
                      <td className="py-2 pe-4 text-gray-500">{p.nEnsemble}</td>
                      <td className="py-2 text-gray-500">{p.nRecognition}</td>
                    </tr>
                  ))}
                  {participants.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-400">{t.noData}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </motion.div>

            {/* Buttons */}
            <div className="flex gap-3 justify-center flex-wrap">
              <button
                onClick={handleDownloadCSV}
                className="flex items-center gap-2 px-6 py-3 bg-gray-700 hover:bg-gray-800 text-white font-semibold rounded-xl transition-colors"
              >
                <Download className="w-4 h-4" />
                {t.download}
              </button>
              <button
                onClick={() => router.push('/')}
                className="flex items-center gap-2 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-xl transition-colors"
              >
                <Home className="w-4 h-4" />
                {t.home}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
