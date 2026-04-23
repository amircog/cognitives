'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle } from 'lucide-react';
import { TrialResult } from '@/types/composite-face';

interface Stats {
  total: number;
  correct: number;
  aligned: number;
  alignedTotal: number;
  misaligned: number;
  misalignedTotal: number;
}

export default function ThanksPage() {
  const [language, setLanguage] = useState<'en' | 'he'>('he');
  const [stats, setStats]       = useState<Stats | null>(null);

  useEffect(() => {
    const lang = sessionStorage.getItem('cf_language') as 'en' | 'he' | null;
    if (lang) setLanguage(lang);

    try {
      const raw = sessionStorage.getItem('cf_main_results');
      if (!raw) return;
      const results: TrialResult[] = JSON.parse(raw);
      const main = results.filter(r => !r.is_practice);
      const aligned    = main.filter(r => r.condition === 'aligned');
      const misaligned = main.filter(r => r.condition !== 'aligned');
      setStats({
        total:            main.length,
        correct:          main.filter(r => r.is_correct).length,
        aligned:          aligned.filter(r => r.is_correct).length,
        alignedTotal:     aligned.length,
        misaligned:       misaligned.filter(r => r.is_correct).length,
        misalignedTotal:  misaligned.length,
      });
    } catch { /* ignore */ }
  }, []);

  const isHe = language === 'he';

  const pct = (c: number, t: number) => t > 0 ? Math.round((c / t) * 100) : 0;

  const t = isHe ? {
    thanks:     '!תודה רבה',
    accuracy:   'דיוק כולל',
    aligned:    'מיושר',
    misaligned: 'לא מיושר',
  } : {
    thanks:     'Thank You!',
    accuracy:   'Overall accuracy',
    aligned:    'Aligned',
    misaligned: 'Misaligned',
  };

  return (
    <div
      className="min-h-screen bg-[#0f172a] flex items-center justify-center px-4"
      dir={isHe ? 'rtl' : 'ltr'}
    >
      <div className="flex flex-col items-center gap-6 text-center max-w-xs">
        <CheckCircle className="w-16 h-16 text-green-400" />
        <h1 className="text-3xl font-bold text-white">{t.thanks}</h1>

        {stats && (
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full flex flex-col gap-3">
            <StatRow label={t.accuracy}    value={pct(stats.correct, stats.total)} />
            <StatRow label={t.aligned}     value={pct(stats.aligned, stats.alignedTotal)} />
            <StatRow label={t.misaligned}  value={pct(stats.misaligned, stats.misalignedTotal)} />
          </div>
        )}
      </div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-400 text-sm">{label}</span>
      <span className="text-white font-bold text-lg">{value}%</span>
    </div>
  );
}
