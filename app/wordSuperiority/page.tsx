'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';

export default function WordSuperiorityLanding() {
  const router = useRouter();
  const [name, setName]         = useState('');
  const [language, setLanguage] = useState<'en' | 'he'>('he');
  const isHe = language === 'he';

  const t = isHe ? {
    title:    'אפקט עליונות המילה',
    inst: [
      'בכל ניסוי תוצג מילה (או אות) למשך זמן קצר מאוד, ואחריה מסיכה.',
      'לאחר מכן תוצגנה שתי אותיות — עליך לבחור איזו מהן הופיעה במיקום המסומן.',
      'ענה מהר ככל שאפשר, אבל נסה להיות מדויק.',
    ],
    nameLabel: 'שמך',
    namePH:    'הזן את שמך',
    start:     'התחל',
    toggle:    'English',
  } : {
    title:    'Word Superiority Effect',
    inst: [
      'On each trial a word (or letter) will flash briefly, followed by a mask.',
      'You will then see two letters — pick which one appeared at the marked position.',
      'Respond as quickly as you can while staying accurate.',
    ],
    nameLabel: 'Your name',
    namePH:    'Enter your name',
    start:     'Start',
    toggle:    'עברית',
  };

  const handleStart = () => {
    if (!name.trim()) {
      alert(isHe ? 'אנא הזן את שמך' : 'Please enter your name');
      return;
    }
    sessionStorage.setItem('wse_session_id',       uuidv4());
    sessionStorage.setItem('wse_participant_name', name.trim());
    sessionStorage.setItem('wse_language',         language);
    router.push('/wordSuperiority/practice');
  };

  return (
    <div
      className="min-h-screen bg-[#0f172a] flex items-center justify-center px-4 py-8"
      dir={isHe ? 'rtl' : 'ltr'}
    >
      <div className="w-full max-w-md">
        <div className="flex justify-end mb-6">
          <button
            onClick={() => setLanguage(l => l === 'en' ? 'he' : 'en')}
            className="px-3 py-1.5 text-sm text-orange-400 border border-orange-400/40 rounded-lg hover:bg-orange-400/10 transition-colors"
          >
            {t.toggle}
          </button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-gray-900 border border-gray-700 rounded-2xl p-8 flex flex-col gap-6"
        >
          <h1 className="text-2xl font-bold text-white text-center">{t.title}</h1>

          <ul className="flex flex-col gap-2">
            {t.inst.map((line, i) => (
              <li key={i} className="flex gap-2 text-gray-300 text-sm leading-relaxed">
                <span className="text-orange-400 font-bold mt-0.5">•</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-1">
            <label className="text-gray-400 text-sm">{t.nameLabel}</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleStart()}
              placeholder={t.namePH}
              className="px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-400 transition-colors"
            />
          </div>

          <button
            onPointerDown={e => { e.preventDefault(); handleStart(); }}
            className="w-full py-4 bg-orange-500 hover:bg-orange-400 text-white font-bold rounded-xl text-lg transition-colors touch-manipulation shadow-lg"
          >
            {t.start}
          </button>
        </motion.div>
      </div>
    </div>
  );
}
