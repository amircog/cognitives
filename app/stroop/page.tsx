'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';
import { Beaker, Keyboard, ArrowRight } from 'lucide-react';

export default function StroopHomePage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');

  const handleStart = () => {
    if (!fullName.trim()) {
      alert('נא להזין שם מלא');
      return;
    }
    const sessionId = uuidv4();
    sessionStorage.setItem('stroop_session_id', sessionId);
    sessionStorage.setItem('stroop_participant_name', fullName.trim());
    router.push('/stroop/experiment');
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
          <Beaker className="w-10 h-10 text-emerald-400" />
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
            ניסוי סטרופ
          </h1>
        </div>

        <p className="text-xl text-muted mb-8">
          Stroop Effect Experiment
        </p>

        <div className="bg-card border border-border rounded-xl p-6 mb-8" dir="rtl">
          <h2 className="text-lg font-semibold mb-4 text-right">איך זה עובד?</h2>
          <ol className="space-y-3 text-muted" style={{ listStylePosition: 'inside', textAlign: 'right' }}>
            <li>
              על המסך יופיעו מילים בשלושה צבעים שונים: אדום, ירוק או צהוב.
            </li>
            <li>
              המשימה שלכם: לזהות את <strong className="text-foreground">צבע האותיות</strong> - לא את המילה עצמה!
            </li>
            <li>
              נתחיל ב-<strong className="text-foreground">5 ניסויי אימון</strong> ואחר כך נמשיך ל-36 ניסויים אמיתיים.
            </li>
            <li>
              נסו להגיב מהר ככל האפשר, אבל גם בדיוק - השתמשו בכפתורים או במקשי המקלדת.
            </li>
          </ol>

          <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-border text-sm text-muted" dir="rtl">
            <span>
              <kbd className="px-1.5 py-0.5 bg-background rounded text-foreground">Y</kbd> צהוב,{' '}
              <kbd className="px-1.5 py-0.5 bg-background rounded text-foreground">G</kbd> ירוק,{' '}
              <kbd className="px-1.5 py-0.5 bg-background rounded text-foreground">R</kbd> אדום :מקשי קיצור
            </span>
            <Keyboard className="w-4 h-4" />
          </div>
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
                       focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent
                       text-right"
            dir="rtl"
          />
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleStart}
          className="px-8 py-4 bg-emerald-400 text-zinc-900 font-bold text-lg rounded-xl
                     shadow-lg shadow-emerald-400/20 transition-colors hover:bg-emerald-300"
        >
          התחל ניסוי
        </motion.button>

        <p className="mt-6 text-sm text-muted" dir="rtl">
          5 אימון + 36 ניסויים • לוקח כ-3-4 דקות
        </p>
      </motion.div>
    </main>
  );
}
