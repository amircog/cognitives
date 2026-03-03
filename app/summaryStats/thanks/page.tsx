'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart2 } from 'lucide-react';

export default function ThanksPage() {
  const [language, setLanguage] = useState<'en' | 'he'>('he');

  useEffect(() => {
    const lang = sessionStorage.getItem('ss_language') as 'en' | 'he' | null;
    if (lang) setLanguage(lang);
  }, []);

  const content = {
    he: {
      title: '!תודה רבה על השתתפותך',
      subtitle: 'הניסוי הסתיים. תוצאותיך נשמרו.',
      scienceTitle: 'מה חקרנו?',
      science: [
        'ניסוי זה חוקר תפיסת אנסמבל — יכולת המוח לחלץ סטטיסטיקות של קבוצה ממבט קצר, מבלי לעקוב אחר כל פריט בנפרד.',
        'אריאלי (2001) הראה שאנשים מדויקים מאוד בהערכת הגודל הממוצע של עיגולים, גם כשהם אינם זוכרים עיגולים בודדים.',
        'צ׳ונג וטרייסמן (2003): תפיסת האנסמבל מהירה ואוטומטית — היא אינה דורשת קשב מכוון לכל פריט.',
        'אלוורז (2011): האנסמבל מיוצג בזיכרון העבודה כיחידה אחת, ולא כרשימה של פריטים.',
        'הממצא הצפוי: דיוק גבוה בסטטיסטיקות הקבוצה — אך זיהוי פריטים בודדים קרוב לסיכוי גרידא.',
      ],
    },
    en: {
      title: 'Thank You!',
      subtitle: 'The experiment is complete. Your results have been saved.',
      scienceTitle: 'What did we study?',
      science: [
        'This experiment investigates ensemble perception — the brain\'s ability to extract group statistics from a brief glimpse, without tracking each individual item.',
        'Ariely (2001): people are highly accurate at estimating the mean size of circles, even when they cannot recall individual circles.',
        'Chong & Treisman (2003): ensemble perception is fast and automatic — it does not require focused attention to individual items.',
        'Alvarez (2011): ensembles are represented in working memory as a single unit, not as a list of items.',
        'The expected finding: high accuracy on group statistics — but near-chance performance on individual item recognition.',
      ],
    },
  };

  const t = content[language];

  return (
    <div
      className={`min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 ${language === 'he' ? 'rtl' : 'ltr'}`}
    >
      <div className="container mx-auto px-4 py-16 max-w-2xl">

        {/* Big thank-you */}
        <motion.div
          initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="text-7xl mb-6">🎉</div>
          <h1 className="text-5xl font-extrabold text-gray-900 mb-3">{t.title}</h1>
          <p className="text-lg text-orange-600 font-medium">{t.subtitle}</p>
        </motion.div>

        {/* Science card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl shadow-xl p-8"
        >
          <h2 className="text-xl font-bold text-gray-900 mb-5 flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-orange-500 shrink-0" />
            {t.scienceTitle}
          </h2>
          <ul className="space-y-4">
            {t.science.map((s, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="text-orange-400 font-bold mt-0.5 shrink-0">•</span>
                <span className="text-gray-700 text-sm leading-relaxed">{s}</span>
              </li>
            ))}
          </ul>
        </motion.div>

      </div>
    </div>
  );
}
