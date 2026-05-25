'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { BookOpen } from 'lucide-react';

export default function TestingEffectHub() {
  const router = useRouter();
  const [language, setLanguage] = useState<'en' | 'he'>('he');
  const isHe = language === 'he';

  const t = isHe ? {
    title: 'אפקט הבחינה',
    subtitle: 'The Testing Effect',
    desc: 'ניסוי בשני חלקים הבודק כיצד תרגול שליפה משפר זיכרון לטווח ארוך.',
    session1: 'חלק 1: למידה',
    session1desc: 'לימוד זוגות מילים ותרגול',
    session2: 'חלק 2: מבחן',
    session2desc: 'מבחן זיכרון (שבוע לאחר חלק 1)',
    toggle: 'English',
  } : {
    title: 'The Testing Effect',
    subtitle: '',
    desc: 'A two-session experiment examining how retrieval practice improves long-term memory.',
    session1: 'Session 1: Learning',
    session1desc: 'Learn word pairs and practice',
    session2: 'Session 2: Test',
    session2desc: 'Memory test (one week after Session 1)',
    toggle: 'עברית',
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center px-4 py-8" dir={isHe ? 'rtl' : 'ltr'}>
      <div className="w-full max-w-md">
        <div className="flex justify-end mb-6">
          <button onClick={() => setLanguage(l => l === 'en' ? 'he' : 'en')}
            className="px-3 py-1.5 text-sm text-orange-400 border border-orange-400/40 rounded-lg hover:bg-orange-400/10 transition-colors">
            {t.toggle}
          </button>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-gray-900 border border-gray-700 rounded-2xl p-8 flex flex-col gap-6">
          <div className="flex flex-col items-center gap-2">
            <BookOpen className="w-10 h-10 text-blue-400" />
            <h1 className="text-2xl font-bold text-white text-center">{t.title}</h1>
            {t.subtitle && <p className="text-gray-400 text-sm">{t.subtitle}</p>}
          </div>

          <p className="text-gray-300 text-sm text-center leading-relaxed">{t.desc}</p>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => router.push('/testingEffect/session1')}
              className="w-full py-4 bg-orange-500 hover:bg-orange-400 text-white font-bold rounded-xl text-lg transition-colors touch-manipulation shadow-lg">
              <div>{t.session1}</div>
              <div className="text-sm font-normal opacity-80">{t.session1desc}</div>
            </button>

            <button
              onClick={() => router.push('/testingEffect/session2')}
              className="w-full py-4 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl text-lg transition-colors touch-manipulation shadow-lg border border-gray-600">
              <div>{t.session2}</div>
              <div className="text-sm font-normal opacity-60">{t.session2desc}</div>
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
