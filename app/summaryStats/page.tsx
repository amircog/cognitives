'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { motion } from 'framer-motion';
import { BarChart2, ChevronLeft } from 'lucide-react';

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

  const content = {
    he: {
      title: 'תפיסת אנסמבל',
      subtitle: 'סטטיסטיקות סיכום',
      welcome: 'ברוכים הבאים לניסוי תפיסת האנסמבל',
      intro: 'ניסוי זה חוקר כיצד המוח מעבד קבוצות של אובייקטים. האם ניתן לחלץ תכונות ממוצעות של קהל מבלי לשים לב לפרטים הבודדים?',
      part1Title: 'חלק 1: סטטיסטיקות קבוצה (18 ניסויים)',
      part1Desc: 'תראה קצרות של קבוצות של עיגולים, קווים וכיוונים. לאחר כל הצגה תתבקש לדווח על תכונה סטטיסטית — כגון הגודל הממוצע, הגדול ביותר, או הקטן ביותר.',
      part2Title: 'חלק 2: זיהוי פריט (12 ניסויים)',
      part2Desc: 'לאחר חלק 1, יוצג לך פריט בודד ותתבקש לציין האם ראית אותו בדיוק בקבוצות הקודמות.',
      instructions: [
        'הניסוי כולל תרגול עם משוב ולאחריו הניסוי הראשי.',
        'כל הצגה קצרה — עיבוד מהיר הוא חלק ממה שנחקר.',
        'הניסוי כולו אורך כ-10-12 דקות.',
      ],
      nameLabel: 'שמך',
      namePlaceholder: 'הזן את שמך',
      startButton: 'התחל ניסוי',
      backButton: 'חזרה לדף הבית',
      languageToggle: 'English',
    },
    en: {
      title: 'Ensemble Perception',
      subtitle: 'Summary Statistics',
      welcome: 'Welcome to the Ensemble Perception Experiment',
      intro: 'This experiment explores how the brain processes groups of objects. Can you extract average properties of a crowd without attending to individual items?',
      part1Title: 'Part 1: Group Statistics (18 trials)',
      part1Desc: 'You will see brief glimpses of arrays of circles, lines, and orientations. After each, you will report a summary stat — such as the average, largest, or smallest value.',
      part2Title: 'Part 2: Item Recognition (12 trials)',
      part2Desc: 'After Part 1, you will be shown a single item and asked whether you saw that exact item in the previous arrays.',
      instructions: [
        'The experiment includes practice trials with feedback, then the main experiment.',
        'Each display is brief — rapid processing is part of what we are studying.',
        'The full experiment takes about 10-12 minutes.',
      ],
      nameLabel: 'Your Name',
      namePlaceholder: 'Enter your name',
      startButton: 'Start Experiment',
      backButton: 'Back to Home',
      languageToggle: 'עברית',
    },
  };

  const t = content[language];

  return (
    <div className={`min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 ${language === 'he' ? 'rtl' : 'ltr'}`}>
      <div className="container mx-auto px-4 py-8 max-w-3xl">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <BarChart2 className="w-12 h-12 text-orange-600" />
            <h1 className="text-4xl font-bold text-gray-900">{t.title}</h1>
          </div>
          <p className="text-lg text-orange-600 font-medium">{t.subtitle}</p>
        </motion.div>

        {/* Language Toggle */}
        <div className="flex justify-end mb-6">
          <button
            onClick={() => setLanguage(language === 'en' ? 'he' : 'en')}
            className="px-4 py-2 text-sm font-medium text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
          >
            {t.languageToggle}
          </button>
        </div>

        {/* Main card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl shadow-xl p-8 mb-6"
        >
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">{t.welcome}</h2>
          <p className="text-gray-700 mb-6 leading-relaxed">{t.intro}</p>

          <div className="bg-orange-50 rounded-xl p-5 mb-4">
            <h3 className="font-semibold text-orange-800 mb-1">{t.part1Title}</h3>
            <p className="text-gray-700 text-sm leading-relaxed">{t.part1Desc}</p>
          </div>
          <div className="bg-amber-50 rounded-xl p-5 mb-6">
            <h3 className="font-semibold text-amber-800 mb-1">{t.part2Title}</h3>
            <p className="text-gray-700 text-sm leading-relaxed">{t.part2Desc}</p>
          </div>

          <div className="bg-gray-50 rounded-xl p-5 mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">{language === 'he' ? 'הוראות:' : 'Instructions:'}</h3>
            <ul className="space-y-2">
              {t.instructions.map((instr, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-orange-500 font-bold">•</span>
                  <span className="text-gray-700 text-sm">{instr}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">{t.nameLabel}</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t.namePlaceholder}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-all"
              onKeyDown={e => e.key === 'Enter' && handleStart()}
            />
          </div>

          <button
            onClick={handleStart}
            className="w-full bg-orange-500 text-white py-4 rounded-lg font-semibold hover:bg-orange-600 transition-colors shadow-lg"
          >
            {t.startButton}
          </button>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mx-auto"
          >
            <ChevronLeft className="w-5 h-5" />
            {t.backButton}
          </button>
        </motion.div>
      </div>
    </div>
  );
}
