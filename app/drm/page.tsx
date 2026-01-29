'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';
import { Brain, ArrowRight } from 'lucide-react';

export default function DRMHomePage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');

  const handleStart = () => {
    if (!fullName.trim()) {
      alert('נא להזין שם מלא');
      return;
    }
    const sessionId = uuidv4();
    sessionStorage.setItem('drm_session_id', sessionId);
    sessionStorage.setItem('drm_participant_name', fullName.trim());
    router.push('/drm/study');
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-2xl"
      >
        {/* Back button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => router.push('/')}
          className="mb-8 flex items-center gap-2 text-muted hover:text-foreground transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
          <span>חזרה לרשימת הניסויים</span>
        </motion.button>

        <div className="flex items-center justify-center gap-3 mb-6">
          <Brain className="w-10 h-10 text-purple-400" />
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
            ניסוי זיכרון שווא
          </h1>
        </div>

        <p className="text-xl text-muted mb-8">
          False Memory Experiment (DRM Paradigm)
        </p>

        <div className="bg-card border border-border rounded-xl p-6 mb-8" dir="rtl">
          <h2 className="text-lg font-semibold mb-4 text-right">איך זה עובד?</h2>
          <ol className="space-y-3 text-muted" style={{ listStylePosition: 'inside', textAlign: 'right' }}>
            <li>
              <strong className="text-foreground">שלב 1: למידה</strong> - תראו רשימת מילים באנגלית. נסו לזכור אותן.
            </li>
            <li>
              <strong className="text-foreground">שלב 2: בדיקה</strong> - תראו מילים חדשות ותצטרכו להחליט: האם ראיתם את המילה קודם?
            </li>
            <li>
              הניסוי בודק <strong className="text-foreground">זיכרונות שווא</strong> - לפעמים אנשים "זוכרים" מילים שלא ראו בכלל!
            </li>
            <li>
              זה תופעה נורמלית ומעניינת בחקר הזיכרון.
            </li>
          </ol>
        </div>

        <div className="w-full max-w-md mb-6" dir="rtl">
          <label htmlFor="fullName" className="block text-sm font-medium mb-2 text-right">
            שם מלא
          </label>
          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleStart()}
            placeholder="הזן שם מלא"
            className="w-full px-4 py-3 bg-card border border-border rounded-lg
                       text-foreground placeholder:text-muted
                       focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent
                       text-right"
            dir="rtl"
          />
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleStart}
          className="px-8 py-4 bg-purple-400 text-zinc-900 font-bold text-lg rounded-xl
                     shadow-lg shadow-purple-400/20 transition-colors hover:bg-purple-300"
        >
          התחל ניסוי
        </motion.button>

        <p className="mt-6 text-sm text-muted" dir="rtl">
          שלב למידה (~3 דקות) + שלב בדיקה (~2 דקות)
        </p>
      </motion.div>
    </main>
  );
}
