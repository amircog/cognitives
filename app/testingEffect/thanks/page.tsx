'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { TrialResult, Condition } from '@/types/testing-effect';
import { CONDITION_LABELS } from '@/lib/testing-effect/stimuli';

const BG = { background: '#111827', border: '1px solid #374151', borderRadius: 6 };
const TICK = { fill: '#9ca3af', fontSize: 11 };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pctFmt = (v: any): any => v != null ? [`${Number(v).toFixed(0)}%`, ''] : ['', ''];

interface BarPoint { name: string; accuracy: number }

export default function ThanksPage() {
  const router = useRouter();
  const [session, setSession] = useState<string | null>(null);
  const [language, setLanguage] = useState<'en' | 'he'>('he');
  const [chartData, setChartData] = useState<BarPoint[] | null>(null);

  useEffect(() => {
    const lang = sessionStorage.getItem('te_language') as 'en' | 'he' | null;
    if (lang) setLanguage(lang);
    const s = sessionStorage.getItem('te_session');
    setSession(s);

    if (s === '2') {
      try {
        const raw = sessionStorage.getItem('te_results_s2');
        if (!raw) return;
        const results: TrialResult[] = JSON.parse(raw);
        const conditions: Condition[] = ['baseline', 'restudy', 'retrieval'];
        const data = conditions.map(c => {
          const trials = results.filter(r => r.condition === c);
          const acc = trials.length
            ? Math.round((trials.filter(r => r.is_correct).length / trials.length) * 100)
            : 0;
          return {
            name: lang === 'he' ? CONDITION_LABELS[c].he : CONDITION_LABELS[c].en,
            accuracy: acc,
          };
        });
        setChartData(data);
      } catch { /* ignore */ }
    }
  }, []);

  const handleContinue = () => {
    const name = sessionStorage.getItem('te_name');
    if (name) sessionStorage.setItem('drm_participant_name', name);
    sessionStorage.setItem('drm_language', language);
    router.push('/drm');
  };

  const isHe = language === 'he';
  const t = isHe ? {
    thanks1: '!תודה רבה',
    done1: 'החלק הראשון הושלם. נתראה בשיעור הבא!',
    thanks2: '!תודה רבה',
    results: 'התוצאות שלך',
    accuracy: 'דיוק (%)',
    next: 'כעת נעבור למשימה נוספת.',
    cont: 'המשיכי',
  } : {
    thanks1: 'Thank You!',
    done1: 'Session 1 is complete. See you next week!',
    thanks2: 'Thank You!',
    results: 'Your Results',
    accuracy: 'Accuracy (%)',
    next: 'Now for one more task.',
    cont: 'Continue',
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center px-4 py-8"
      dir={isHe ? 'rtl' : 'ltr'}>
      <div className="flex flex-col items-center gap-6 text-center max-w-md w-full">
        <CheckCircle className="w-16 h-16 text-green-400" />
        <h1 className="text-3xl font-bold text-white">
          {session === '2' ? t.thanks2 : t.thanks1}
        </h1>


        {session === '2' && chartData && (
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full">
            <h2 className="text-base font-bold text-white mb-4">{t.results}</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ left: 10, bottom: 5 }} barCategoryGap="25%">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" tick={TICK} />
                <YAxis domain={[0, 100]} tick={TICK}
                  label={{ value: t.accuracy, angle: -90, position: 'insideLeft', style: { fill: '#9ca3af', fontSize: 11 } }} />
                <Tooltip contentStyle={BG} formatter={pctFmt} />
                <Bar dataKey="accuracy" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {session === '2' && (
          <>
            <p className="text-lg text-gray-200">{t.next}</p>
            <button
              onPointerDown={e => { e.preventDefault(); handleContinue(); }}
              className="mt-2 px-10 py-4 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-xl text-lg transition-colors touch-manipulation shadow-lg"
            >
              {t.cont}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
