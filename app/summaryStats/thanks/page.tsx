'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';

export default function ThanksPage() {
  const [language, setLanguage] = useState<'en' | 'he'>('he');
  const [recStats, setRecStats] = useState<{ correct: number; total: number } | null>(null);

  useEffect(() => {
    const lang = sessionStorage.getItem('ss_language') as 'en' | 'he' | null;
    if (lang) setLanguage(lang);

    const raw = sessionStorage.getItem('ss_main_results');
    if (raw) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const results: any[] = JSON.parse(raw);
        const recResults = results.filter(r => r.trial_type === 'recognition');
        if (recResults.length > 0) {
          setRecStats({
            correct: recResults.filter(r => r.is_correct).length,
            total:   recResults.length,
          });
        }
      } catch { /* ignore parse errors */ }
    }
  }, []);

  const isHe = language === 'he';

  const t = isHe ? {
    title:   '!תודה רבה',
    recLabel: 'דיוק במשימת הזיהוי',
    outOf:   (c: number, n: number, pct: string) => `${c} מתוך ${n} (${pct}%)`,
  } : {
    title:   'Thank You!',
    recLabel: 'Recognition task accuracy',
    outOf:   (c: number, n: number, pct: string) => `${c} / ${n} correct (${pct}%)`,
  };

  const pct = recStats
    ? ((recStats.correct / recStats.total) * 100).toFixed(1)
    : null;

  return (
    <div
      className="min-h-screen bg-[#0f172a] flex items-center justify-center px-4"
      dir={isHe ? 'rtl' : 'ltr'}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center flex flex-col items-center gap-6"
      >
        <CheckCircle className="w-20 h-20 text-green-400" strokeWidth={1.5} />

        <h1 className="text-4xl font-extrabold text-white">{t.title}</h1>

        {recStats && pct && (
          <div className="bg-gray-800 border border-gray-700 rounded-2xl px-8 py-5 flex flex-col items-center gap-1">
            <p className="text-gray-400 text-sm">{t.recLabel}</p>
            <p className="text-2xl font-bold text-orange-400">
              {t.outOf(recStats.correct, recStats.total, pct)}
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
