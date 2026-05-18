'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle } from 'lucide-react';
import { TwoStepTrialResult } from '@/types/two-step-task';

export default function TwoStepThanks() {
  const [language, setLanguage] = useState<'en' | 'he'>('he');
  const [stats, setStats] = useState<{ coins: number; total: number; missRate: number } | null>(null);

  useEffect(() => {
    const lang = sessionStorage.getItem('tst_language') as 'en' | 'he' | null;
    if (lang) setLanguage(lang);
    try {
      const raw = sessionStorage.getItem('tst_results');
      if (!raw) return;
      const results: TwoStepTrialResult[] = JSON.parse(raw);
      const total = results.length;
      const coins = results.filter(r => r.rewarded).length;
      const missed = results.filter(r => r.missed_stage1 || r.missed_stage2).length;
      setStats({ coins, total, missRate: total > 0 ? Math.round((missed / total) * 100) : 0 });
    } catch { /* ignore */ }
  }, []);

  const isHe = language === 'he';
  const t = isHe ? {
    thanks: '!תודה רבה',
    coins: 'מטבעות שנצברו',
    total: 'סה"כ ניסיונות',
    missRate: 'אחוז החמצות',
  } : {
    thanks: 'Thank You!',
    coins: 'Coins collected',
    total: 'Total trials',
    missRate: 'Miss rate',
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
            <StatRow label={t.coins} value={`🪙 ${stats.coins}`} />
            <StatRow label={t.total} value={String(stats.total)} />
            <StatRow label={t.missRate} value={`${stats.missRate}%`} />
          </div>
        )}
      </div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-400 text-sm">{label}</span>
      <span className="text-white font-bold text-lg">{value}</span>
    </div>
  );
}
