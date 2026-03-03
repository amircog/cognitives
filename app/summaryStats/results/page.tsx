'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, ReferenceLine,
} from 'recharts';
import { BarChart2, Home, Download, Users } from 'lucide-react';
import { getSupabase } from '@/lib/supabase';
import { EnsembleResult, RecognitionResult } from '@/types/summary-stats';
import { computeSessionSummary } from '@/lib/summary-stats/analysis';
import { TYPE_LABELS } from '@/lib/summary-stats/stimuli';

function ResultsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [language, setLanguage] = useState<'en' | 'he'>('he');
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<ReturnType<typeof computeSessionSummary> | null>(null);
  const sessionId = searchParams.get('session');

  useEffect(() => {
    const lang = sessionStorage.getItem('ss_language') as 'en' | 'he' | null;
    if (lang) setLanguage(lang);
  }, []);

  useEffect(() => {
    const fetchResults = async () => {
      // Try Supabase first, fallback to sessionStorage
      try {
        if (sessionId) {
          const supabase = getSupabase();
          if (!supabase) throw new Error('Supabase not available');
          const { data } = await supabase
            .from('summary_stats_results')
            .select('*')
            .eq('session_id', sessionId);

          if (data && data.length > 0) {
            setSummary(computeSessionSummary(data as (EnsembleResult | RecognitionResult)[]));
            setLoading(false);
            return;
          }
        }
      } catch (e) {
        console.error(e);
      }

      // Fallback to sessionStorage
      const ensRaw = sessionStorage.getItem('ss_ensemble_results');
      const recRaw = sessionStorage.getItem('ss_recognition_results');
      const ensResults: EnsembleResult[] = ensRaw ? JSON.parse(ensRaw) : [];
      const recResults: RecognitionResult[] = recRaw ? JSON.parse(recRaw) : [];
      setSummary(computeSessionSummary([...ensResults, ...recResults]));
      setLoading(false);
    };

    fetchResults();
  }, [sessionId]);

  const handleDownloadCSV = () => {
    const ensRaw = sessionStorage.getItem('ss_ensemble_results');
    const recRaw = sessionStorage.getItem('ss_recognition_results');
    const ens: EnsembleResult[] = ensRaw ? JSON.parse(ensRaw) : [];
    const rec: RecognitionResult[] = recRaw ? JSON.parse(recRaw) : [];
    const allRows = [...ens, ...rec];
    if (allRows.length === 0) return;

    const headers = Object.keys(allRows[0]).join(',');
    const rows = allRows.map(r => Object.values(r).join(','));
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ensemble-results-${sessionId ?? 'session'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const content = {
    he: {
      title: 'תוצאותיך',
      ensembleTitle: 'חלק 1: טעות בסטטיסטיקות קבוצה',
      byTypeTitle: 'טעות ממוצעת לפי סוג גירוי',
      bySetSizeTitle: 'טעות ממוצעת לפי גודל הקבוצה',
      recTitle: 'חלק 2: דיוק זיהוי פריטים',
      recChartTitle: 'דיוק לפי סוג גירוי',
      chance: 'סיכוי (50%)',
      interpretation: 'פירוש: דיוק הסטטיסטיקות הקבוצתיות נשאר גבוה אפילו עם קבוצות גדולות, בעוד שזיהוי פריטים בודדים קרוב לסיכוי. זהו הממצא הקלאסי של תפיסת האנסמבל!',
      download: 'הורד CSV',
      teacherDashboard: 'לוח בקרה',
      home: 'דף הבית',
      errorAxis: 'טעות (px / °)',
      accuracyAxis: 'דיוק (%)',
      setSizeAxis: 'גודל קבוצה',
      loading: 'טוען תוצאות...',
    },
    en: {
      title: 'Your Results',
      ensembleTitle: 'Part 1: Group Statistics Error',
      byTypeTitle: 'Mean Absolute Error by Stimulus Type',
      bySetSizeTitle: 'Mean Absolute Error by Set Size',
      recTitle: 'Part 2: Item Recognition Accuracy',
      recChartTitle: 'Accuracy by Stimulus Type',
      chance: 'Chance (50%)',
      interpretation: 'Interpretation: Group statistics accuracy remained high even with large sets, while individual item recognition was near chance. This is the classic ensemble perception finding!',
      download: 'Download CSV',
      teacherDashboard: 'Teacher Dashboard',
      home: 'Home',
      errorAxis: 'Mean Abs Error (px / °)',
      accuracyAxis: 'Accuracy (%)',
      setSizeAxis: 'Set Size',
      loading: 'Loading results...',
    },
  };

  const t = content[language];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 flex items-center justify-center">
        <div className="text-gray-500 text-xl">{t.loading}</div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 flex items-center justify-center">
        <div className="text-gray-500 text-xl">No data found</div>
      </div>
    );
  }

  const stimTypes = ['circles', 'line-lengths', 'line-orientations'] as const;

  const ensembleByTypeData = stimTypes.map(st => ({
    name: TYPE_LABELS[st][language],
    value: Math.round(summary.ensemble.byType[st]?.meanAbsError ?? 0),
  }));

  const setSizeData = summary.ensemble.bySetSize.map(bs => ({
    name: bs.setSize,
    value: Math.round(bs.meanAbsError),
  }));

  const recognitionData = stimTypes.map(st => ({
    name: TYPE_LABELS[st][language],
    accuracy: Math.round(summary.recognition.byType[st]?.accuracy ?? 50),
  }));

  return (
    <div
      className={`min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 ${language === 'he' ? 'rtl' : 'ltr'}`}
    >
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-3 mb-2">
            <BarChart2 className="w-8 h-8 text-orange-500" />
            <h1 className="text-3xl font-bold text-gray-900">{t.title}</h1>
          </div>
        </motion.div>

        {/* Ensemble Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-xl p-6 mb-6"
        >
          <h2 className="text-xl font-bold text-gray-900 mb-4">{t.ensembleTitle}</h2>

          <h3 className="text-sm font-semibold text-gray-600 mb-2">{t.byTypeTitle}</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={ensembleByTypeData} margin={{ left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis
                label={{ value: t.errorAxis, angle: -90, position: 'insideLeft', style: { fontSize: 11 } }}
              />
              <Tooltip />
              <Bar dataKey="value" fill="#f97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>

          <h3 className="text-sm font-semibold text-gray-600 mt-6 mb-2">{t.bySetSizeTitle}</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={setSizeData} margin={{ left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                label={{ value: t.setSizeAxis, position: 'insideBottom', offset: -10 }}
              />
              <YAxis
                label={{ value: t.errorAxis, angle: -90, position: 'insideLeft', style: { fontSize: 11 } }}
              />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#f97316"
                strokeWidth={2}
                dot={{ r: 5, fill: '#f97316' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Recognition Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl shadow-xl p-6 mb-6"
        >
          <h2 className="text-xl font-bold text-gray-900 mb-4">{t.recTitle}</h2>
          <h3 className="text-sm font-semibold text-gray-600 mb-2">{t.recChartTitle}</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={recognitionData} margin={{ left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis
                domain={[0, 100]}
                label={{ value: t.accuracyAxis, angle: -90, position: 'insideLeft', style: { fontSize: 11 } }}
              />
              <Tooltip />
              <ReferenceLine
                y={50}
                stroke="#6b7280"
                strokeDasharray="6 3"
                label={{ value: t.chance, position: 'right', style: { fontSize: 10, fill: '#6b7280' } }}
              />
              <Bar dataKey="accuracy" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Interpretation */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          className="bg-orange-50 border border-orange-100 rounded-2xl p-6 mb-6"
        >
          <p className="text-gray-700 leading-relaxed text-sm">{t.interpretation}</p>
        </motion.div>

        {/* Buttons */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
          className="flex flex-wrap gap-3 justify-center"
        >
          <button
            onClick={handleDownloadCSV}
            className="flex items-center gap-2 px-6 py-3 bg-gray-700 hover:bg-gray-800 text-white font-semibold rounded-xl transition-colors"
          >
            <Download className="w-4 h-4" />
            {t.download}
          </button>
          <button
            onClick={() => router.push('/summaryStats/teacher')}
            className="flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl transition-colors"
          >
            <Users className="w-4 h-4" />
            {t.teacherDashboard}
          </button>
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-xl transition-colors"
          >
            <Home className="w-4 h-4" />
            {t.home}
          </button>
        </motion.div>
      </div>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 flex items-center justify-center">
          <div className="text-gray-500 text-xl">Loading…</div>
        </div>
      }
    >
      <ResultsContent />
    </Suspense>
  );
}
