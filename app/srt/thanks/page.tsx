'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle } from 'lucide-react';
import { SrtTrialResult } from '@/types/srt';

export default function SrtThanks() {
  const [language, setLanguage] = useState<'en' | 'he'>('he');
  const [stats, setStats] = useState<{ meanRt: number; accuracy: number; blocks: number[] } | null>(null);

  useEffect(() => {
    const lang = sessionStorage.getItem('srt_language') as 'en' | 'he' | null;
    if (lang) setLanguage(lang);
    try {
      const raw = sessionStorage.getItem('srt_results');
      if (!raw) return;
      const results: SrtTrialResult[] = JSON.parse(raw);
      const correct = results.filter(r => r.correct && r.rt_ms != null);
      const meanRt = correct.length > 0
        ? Math.round(correct.reduce((s, r) => s + r.rt_ms!, 0) / correct.length)
        : 0;
      const accuracy = results.length > 0
        ? Math.round((correct.length / results.length) * 100)
        : 0;

      const blocks: number[] = [];
      for (let b = 1; b <= 6; b++) {
        const bTrials = correct.filter(r => r.block_number === b);
        blocks.push(bTrials.length > 0
          ? Math.round(bTrials.reduce((s, r) => s + r.rt_ms!, 0) / bTrials.length)
          : 0);
      }
      setStats({ meanRt, accuracy, blocks });
    } catch { /* ignore */ }
  }, []);

  const isHe = language === 'he';
  const t = isHe ? {
    thanks: '!תודה רבה',
    meanRt: 'זמן תגובה ממוצע',
    accuracy: 'דיוק',
    ms: 'מ"ש',
  } : {
    thanks: 'Thank You!',
    meanRt: 'Mean RT',
    accuracy: 'Accuracy',
    ms: 'ms',
  };

  return (
    <div
      className="min-h-screen bg-[#0f172a] flex items-center justify-center px-4"
      dir={isHe ? 'rtl' : 'ltr'}
    >
      <div className="flex flex-col items-center gap-6 text-center max-w-xs w-full">
        <CheckCircle className="w-16 h-16 text-green-400" />
        <h1 className="text-3xl font-bold text-white">{t.thanks}</h1>
        {stats && (
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">{t.meanRt}</span>
              <span className="text-white font-mono font-bold">{stats.meanRt} {t.ms}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">{t.accuracy}</span>
              <span className="text-white font-mono font-bold">{stats.accuracy}%</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
