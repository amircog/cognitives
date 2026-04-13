'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { motion } from 'framer-motion';
import { Eye } from 'lucide-react';

export default function SummaryStatsIntro() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [language, setLanguage] = useState<'en' | 'he'>('he');

  const handleStart = () => {
    if (!name.trim()) {
      alert(language === 'en' ? 'Please enter your name' : 'אנא הזן את שמך');
      return;
    }
    const sessionId = uuidv4();
    sessionStorage.setItem('ss_session_id', sessionId);
    sessionStorage.setItem('ss_participant_name', name.trim());
    sessionStorage.setItem('ss_language', language);
    router.push('/summaryStats/practice');
  };

  const isHe = language === 'he';

  const he = {
    welcome:   'ברוכים הבאים לניסוי תפיסת האנסמבל',
    intro:     'ניסוי זה חוקר כיצד המוח מעבד קבוצות של עצמים המוצגים במהירות.',
    instTitle: 'הוראות:',
    inst: [
      'יוצגו לך קבוצות של עיגולים או קווים.',
      'כל תצוגה תהיה קצרה מאוד!',
      'לאחר כל תצוגה תישאל שאלה אחת.',
    ],
    nameLabel: 'שמך',
    namePH:    'הזן את שמך',
    startBtn:  'התחל',
    langToggle: 'English',
  };

  const en = {
    welcome:   'Welcome to the Ensemble Perception Experiment',
    intro:     'This experiment explores how the brain processes rapidly shown groups of objects.',
    instTitle: 'Instructions:',
    inst: [
      'You will be shown groups of circles or lines.',
      'Each display will be very short!',
      'After each display you will be asked a question about it.',
    ],
    nameLabel: 'Your Name',
    namePH:    'Enter your name',
    startBtn:  'Start',
    langToggle: 'עברית',
  };

  const t = isHe ? he : en;

  return (
    <div
      className="min-h-screen bg-[#0f172a] flex items-center justify-center px-4 py-8"
      dir={isHe ? 'rtl' : 'ltr'}
    >
      <div className="w-full max-w-md">

        {/* Language toggle */}
        <div className="flex justify-end mb-6">
          <button
            onClick={() => setLanguage(l => l === 'en' ? 'he' : 'en')}
            className="px-3 py-1.5 text-sm text-orange-400 border border-orange-400/40 rounded-lg hover:bg-orange-400/10 transition-colors"
          >
            {t.langToggle}
          </button>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-gray-900 border border-gray-700 rounded-2xl p-8 flex flex-col gap-6"
        >
          {/* Header */}
          <div className="flex flex-col items-center gap-3 text-center">
            <Eye className="w-10 h-10 text-orange-400" />
            <h1 className="text-xl font-bold text-white">{t.welcome}</h1>
            <p className="text-gray-400 text-sm leading-relaxed">{t.intro}</p>
          </div>

          {/* Instructions */}
          <div className="bg-gray-800 rounded-xl p-4">
            <p className="text-gray-300 text-sm font-semibold mb-3">{t.instTitle}</p>
            <ul className="space-y-2">
              {t.inst.map((line, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-orange-400 mt-0.5 shrink-0">•</span>
                  <span className="text-gray-300 text-sm">{line}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Name input */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">{t.nameLabel}</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t.namePH}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-400 transition-colors"
              onKeyDown={e => e.key === 'Enter' && handleStart()}
              dir="auto"
            />
          </div>

          <button
            onClick={handleStart}
            className="w-full py-4 bg-orange-500 hover:bg-orange-400 text-white font-bold rounded-xl text-lg transition-colors shadow-lg touch-manipulation"
          >
            {t.startBtn}
          </button>
        </motion.div>
      </div>
    </div>
  );
}
