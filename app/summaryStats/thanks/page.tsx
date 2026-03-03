'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { BarChart2, Home, Users, Award } from 'lucide-react';

export default function ThanksPage() {
  const router = useRouter();
  const [language, setLanguage] = useState<'en' | 'he'>('he');
  const [sessionId, setSessionId] = useState('');

  useEffect(() => {
    const lang = sessionStorage.getItem('ss_language') as 'en' | 'he' | null;
    const sid = sessionStorage.getItem('ss_session_id') || '';
    if (lang) setLanguage(lang);
    setSessionId(sid);
  }, []);

  const content = {
    he: {
      title: 'תודה על השתתפותך!',
      subtitle: 'השלמת את ניסוי תפיסת האנסמבל',
      scienceTitle: 'מה חקרנו?',
      science: [
        'ניסוי זה מבוסס על מחקרים קלאסיים של תפיסת אנסמבל — היכולת המדהימה של המוח לחלץ סטטיסטיקות של קהל ממבט קצר.',
        'אריאלי (2001) הראה שאנשים מדויקים מאוד בהערכת הגודל הממוצע של עיגולים, אפילו כשאינם מסוגלים לזכור עיגולים בודדים.',
        'צ׳ונג וטרייסמן (2003) הדגימו שתפיסת אנסמבל מהירה וחסכונית — היא אינה דורשת קשב לפרטים הבודדים.',
        'אלוורז (2011) הראה שתפיסת האנסמבל חזקה ומדויקת אפילו כאשר מספר הפריטים גדל.',
        'הממצא המרכזי: דיוק הסטטיסטיקות הקבוצתיות נשאר גבוה גם עם קבוצות גדולות, בעוד שזיהוי פריטים בודדים קרוב לסיכוי גרידא.',
      ],
      viewResults: 'ראה את תוצאותי',
      teacherDashboard: 'לוח בקרה למורים',
      home: 'חזרה לדף הבית',
    },
    en: {
      title: 'Thank You!',
      subtitle: 'You have completed the Ensemble Perception Experiment',
      scienceTitle: 'What did we study?',
      science: [
        'This experiment is based on classic research on ensemble perception — the brain\'s remarkable ability to extract crowd statistics from a brief glimpse.',
        'Ariely (2001) showed that people are highly accurate at estimating the average size of circles, even when they cannot recall individual circles.',
        'Chong & Treisman (2003) demonstrated that ensemble perception is fast and efficient — it does not require attention to individual items.',
        'Alvarez (2011) showed that ensemble perception remains accurate even as the number of items increases.',
        'Key finding: Group statistics accuracy stays high even with large sets, while individual item recognition is near chance.',
      ],
      viewResults: 'View My Results',
      teacherDashboard: 'Teacher Dashboard',
      home: 'Back to Home',
    },
  };

  const t = content[language];

  return (
    <div
      className={`min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 ${language === 'he' ? 'rtl' : 'ltr'}`}
    >
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 rounded-full bg-orange-100 flex items-center justify-center">
              <Award className="w-10 h-10 text-orange-500" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">{t.title}</h1>
          <p className="text-lg text-orange-600 font-medium">{t.subtitle}</p>
        </motion.div>

        {/* Science card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl shadow-xl p-8 mb-6"
        >
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-orange-500" />
            {t.scienceTitle}
          </h2>
          <ul className="space-y-3">
            {t.science.map((s, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="text-orange-400 font-bold mt-0.5 shrink-0">•</span>
                <span className="text-gray-700 text-sm leading-relaxed">{s}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Navigation buttons */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          {sessionId && (
            <button
              onClick={() => router.push(`/summaryStats/results?session=${sessionId}`)}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-colors shadow-lg"
            >
              <BarChart2 className="w-5 h-5" />
              {t.viewResults}
            </button>
          )}
          <button
            onClick={() => router.push('/summaryStats/teacher')}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl transition-colors shadow-lg"
          >
            <Users className="w-5 h-5" />
            {t.teacherDashboard}
          </button>
          <button
            onClick={() => router.push('/')}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-xl transition-colors"
          >
            <Home className="w-5 h-5" />
            {t.home}
          </button>
        </motion.div>
      </div>
    </div>
  );
}
