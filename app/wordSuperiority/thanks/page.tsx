'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle } from 'lucide-react';
import { TrialResult } from '@/types/word-superiority';

interface Stats { word: number; pseudoword: number; single: number; }

export default function ThanksPage() {
  const [language, setLanguage] = useState<'en' | 'he'>('he');
  const [stats, setStats]       = useState<Stats | null>(null);

  useEffect(() => {
    const lang = sessionStorage.getItem('wse_language') as 'en' | 'he' | null;
    if (lang) setLanguage(lang);
    try {
      const raw = sessionStorage.getItem('wse_main_results');
      if (!raw) return;
      const results: TrialResult[] = JSON.parse(raw);
      const pct = (cond: string) => {
        const rows = results.filter(r => r.condition === cond);
        return rows.length ? Math.round((rows.filter(r => r.is_correct).length / rows.length) * 100) : 0;
      };
      setStats({ word: pct('word'), pseudoword: pct('pseudoword'), single: pct('single-letter') });
    } catch { /* ignore */ }
  }, []);

  const isHe = language === 'he';
  const t = isHe ? {
    thanks: '!תודה רבה',
    word: 'מילה', pseudoword: 'מילת תפל', single: 'אות בודדת',
  } : {
    thanks: 'Thank You!',
    word: 'Word', pseudoword: 'Pseudoword', single: 'Single Letter',
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
            <StatRow label={t.word}       value={stats.word} />
            <StatRow label={t.pseudoword} value={stats.pseudoword} />
            <StatRow label={t.single}     value={stats.single} />
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
