'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { motion } from 'framer-motion';
import { Shapes, ChevronLeft } from 'lucide-react';

export default function BoubaKikiIntro() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [language, setLanguage] = useState<'en' | 'he'>('en');

  const handleStart = () => {
    if (!name.trim()) {
      alert(language === 'en' ? 'Please enter your name' : 'אנא הזן את שמך');
      return;
    }

    const sessionId = uuidv4();
    sessionStorage.setItem('bouba_kiki_session_id', sessionId);
    sessionStorage.setItem('bouba_kiki_participant_name', name.trim());
    sessionStorage.setItem('bouba_kiki_language', language);

    router.push('/bouba-kiki/experiment');
  };

  const content = {
    en: {
      title: 'Bouba-Kiki Effect',
      subtitle: 'Cross-Modal Sound Symbolism',
      welcome: 'Welcome to the Bouba-Kiki Experiment',
      intro: 'This experiment demonstrates a fascinating phenomenon where people associate certain sounds with specific shapes.',
      instructions: [
        'You will see pairs of shapes on the screen.',
        'Each trial will display a word (like "BOUBA" or "KIKI").',
        'Your task is to decide which shape best matches the word.',
        'There are no right or wrong answers - trust your intuition!',
        'The experiment takes about 3-4 minutes to complete.',
      ],
      nameLabel: 'Your Name',
      namePlaceholder: 'Enter your name',
      startButton: 'Start Experiment',
      backButton: 'Back to Home',
      languageToggle: 'עברית',
    },
    he: {
      title: 'אפקט בובה-קיקי',
      subtitle: 'סימבוליזם צלילי חוצה-מודאלי',
      welcome: 'ברוכים הבאים לניסוי בובה-קיקי',
      intro: 'ניסוי זה מדגים תופעה מרתקת שבה אנשים משייכים צלילים מסוימים לצורות ספציפיות.',
      instructions: [
        'תראו זוגות של צורות על המסך.',
        'בכל ניסיון תוצג מילה (כמו "בובה" או "קיקי").',
        'המשימה שלכם היא להחליט איזו צורה תואמת הכי טוב למילה.',
        'אין תשובות נכונות או שגויות - סמכו על האינטואיציה שלכם!',
        'הניסוי אורך כ-3-4 דקות.',
      ],
      nameLabel: 'שמך',
      namePlaceholder: 'הזן את שמך',
      startButton: 'התחל ניסוי',
      backButton: 'חזרה לדף הבית',
      languageToggle: 'English',
    },
  };

  const t = content[language];

  return (
    <div className={`min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 ${language === 'he' ? 'rtl' : 'ltr'}`}>
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <Shapes className="w-12 h-12 text-indigo-600" />
            <h1 className="text-4xl font-bold text-gray-900">{t.title}</h1>
          </div>
          <p className="text-lg text-indigo-600 font-medium">{t.subtitle}</p>
        </motion.div>

        {/* Language Toggle */}
        <div className="flex justify-end mb-6">
          <button
            onClick={() => setLanguage(language === 'en' ? 'he' : 'en')}
            className="px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
          >
            {t.languageToggle}
          </button>
        </div>

        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl shadow-xl p-8 mb-6"
        >
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">{t.welcome}</h2>
          <p className="text-gray-700 mb-6 leading-relaxed">{t.intro}</p>

          <div className="bg-indigo-50 rounded-xl p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">Instructions:</h3>
            <ul className="space-y-2">
              {t.instructions.map((instruction, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-indigo-600 font-bold mt-0.5">•</span>
                  <span className="text-gray-700">{instruction}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Name Input */}
          <div className="mb-6">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              {t.nameLabel}
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.namePlaceholder}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleStart();
                }
              }}
            />
          </div>

          {/* Start Button */}
          <button
            onClick={handleStart}
            className="w-full bg-indigo-600 text-white py-4 rounded-lg font-semibold hover:bg-indigo-700 transition-colors shadow-lg hover:shadow-xl"
          >
            {t.startButton}
          </button>
        </motion.div>

        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
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
