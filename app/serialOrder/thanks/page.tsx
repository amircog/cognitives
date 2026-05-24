'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';
import { RecallResponse } from '@/types/serial-order';

export default function SerialOrderThanks() {
  const [results, setResults] = useState<RecallResponse[]>([]);
  const [language, setLanguage] = useState<'en' | 'he'>('he');

  useEffect(() => {
    const lang = sessionStorage.getItem('so_language') as 'en' | 'he' | null;
    if (lang) setLanguage(lang);
    const stored = sessionStorage.getItem('so_recall_results');
    if (stored) {
      setResults(JSON.parse(stored));
    }
  }, []);

  const isHe = language === 'he';
  const correctCount = results.filter(r => r.is_correct_recall).length;
  const totalResponses = results.length;

  return (
    <main className="min-h-screen bg-[#0f172a] flex items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-2xl"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="flex justify-center mb-6"
        >
          <CheckCircle className="w-24 h-24 text-emerald-400" />
        </motion.div>

        <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6 text-white">
          {isHe ? '!תודה' : 'Thank you!'}
        </h1>

        <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 mb-6" dir={isHe ? 'rtl' : 'ltr'}>
          <p className="text-lg mb-4 text-gray-200">
            {isHe ? 'סיימת את משימת הזיכרון הסדרתי!' : 'You completed the serial order memory task!'}
          </p>
          {results.length > 0 && (
            <div className="bg-gray-800 rounded-lg p-4 mt-4">
              <p className="text-emerald-400 text-2xl font-bold">
                {correctCount} / 24
              </p>
              <p className="text-gray-400 text-sm mt-1">
                {isHe
                  ? `נזכרת ב-${correctCount} מילים מתוך 24 (מתוך ${totalResponses} תשובות)`
                  : `Recalled ${correctCount} of 24 words (from ${totalResponses} responses)`}
              </p>
            </div>
          )}
        </div>

        <p className="text-sm text-gray-500">
          {isHe ? 'ניתן כעת לסגור את החלון' : 'You may now close this window'}
        </p>
      </motion.div>
    </main>
  );
}
