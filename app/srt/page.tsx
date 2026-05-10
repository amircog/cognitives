'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';

export default function SrtLanding() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [language, setLanguage] = useState<'en' | 'he'>('he');
  const isHe = language === 'he';

  const t = isHe ? {
    title: 'זמן תגובה סדרתי',
    inst: [
      'במשימה זו יופיעו ארבעה ריבועים על המסך בצורת מעוין.',
      'נקודה שחורה תופיע בתוך אחד הריבועים — לחץ/י על הריבוע שבו היא מופיעה, מהר ככל האפשר.',
      'המשימה כוללת מספר בלוקים. נסו להגיב מהר ובמדויק.',
    ],
    nameLabel: 'שמך',
    namePH: 'הזן את שמך',
    start: 'התחל',
    toggle: 'English',
  } : {
    title: 'Serial Reaction Time',
    inst: [
      'Four squares will appear on screen in a diamond formation.',
      'A black dot will appear inside one of the squares — tap the square containing the dot as fast as you can.',
      'The task includes several blocks. Try to respond quickly and accurately.',
    ],
    nameLabel: 'Your name',
    namePH: 'Enter your name',
    start: 'Start',
    toggle: 'עברית',
  };

  const handleStart = () => {
    if (!name.trim()) {
      alert(isHe ? 'אנא הזן את שמך' : 'Please enter your name');
      return;
    }
    sessionStorage.setItem('srt_session_id', uuidv4());
    sessionStorage.setItem('srt_participant_name', name.trim());
    sessionStorage.setItem('srt_language', language);
    sessionStorage.setItem('srt_main_is_a', Math.random() < 0.5 ? '1' : '0');
    router.push('/srt/experiment');
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
              placeholder={t.namePH}
              className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:border-orange-400"
              onKeyDown={e => { if (e.key === 'Enter') handleStart(); }}
            />
          </div>

          <button
            onClick={handleStart}
            className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold transition-colors touch-manipulation"
          >
            {t.start}
          </button>
        </motion.div>
      </div>
    </div>
  );
}
