'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';
import { Target, ArrowRight } from 'lucide-react';

export default function PosnerCueingIntroPage() {
  const router = useRouter();
  const [participantName, setParticipantName] = useState('');

  const handleStart = () => {
    const sessionId = uuidv4();
    sessionStorage.setItem('posner_session_id', sessionId);
    sessionStorage.setItem('posner_participant_name', participantName.trim());
    router.push('/posnerCueing/experiment');
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-2xl w-full"
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

        <div className="flex items-center justify-center gap-3 mb-4">
          <Target className="w-10 h-10 text-amber-400" />
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            ניסוי הכוונת תשומת לב
          </h1>
        </div>

        <p className="text-xl text-muted mb-8">אפקט פוזנר</p>

        <div className="bg-card border border-border rounded-xl p-6 mb-8 text-right" dir="rtl">
          <h2 className="text-lg font-semibold mb-4">הוראות</h2>
          <ol className="space-y-3 text-muted list-decimal list-inside">
            <li>בניסוי זה תראו שתי תיבות על המסך – אחת משמאל ואחת מימין – ו-+ במרכז.</li>
            <li>בכל ניסיון, חץ יופיע במרכז ויצביע שמאלה (←) או ימינה (→).</li>
            <li>זמן קצר לאחר מכן, יופיע ● בתוך אחת התיבות.</li>
            <li>
              <strong className="text-foreground">משימה שלכם:</strong> לחצו על{' '}
              <kbd className="px-1.5 py-0.5 bg-background rounded text-foreground text-sm">רווח</kbd>{' '}
              מהר ככל האפשר כשאתם רואים את ה-●.
            </li>
            <li>החץ לרוב מצביע לכיוון הנכון – אך לא תמיד!</li>
            <li>
              <strong className="text-foreground">שמרו על עיניכם על ה-+ במרכז המסך</strong> – אל תביטו אל התיבות.
            </li>
            <li>בחלק מהניסיונות לא יופיע יעד. אל תלחצו כלום במקרה זה.</li>
          </ol>

          <div className="mt-6 pt-4 border-t border-border flex items-center justify-end gap-2 text-sm text-muted">
            <span>
              לחצו{' '}
              <kbd className="px-1.5 py-0.5 bg-background rounded text-foreground">רווח</kbd>{' '}
              כשרואים ●
            </span>
          </div>
        </div>

        <div className="w-full max-w-md mb-6 mx-auto" dir="rtl">
          <label htmlFor="participantName" className="block text-sm font-medium mb-2 text-right">
            שם מלא
          </label>
          <input
            id="participantName"
            type="text"
            value={participantName}
            onChange={(e) => setParticipantName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleStart()}
            placeholder="הזן שם מלא"
            className="w-full px-4 py-3 bg-card border border-border rounded-lg
                       text-foreground placeholder:text-muted
                       focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent
                       text-right"
            dir="rtl"
          />
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleStart}
          className="px-8 py-4 bg-amber-400 text-zinc-900 font-bold text-lg rounded-xl
                     shadow-lg shadow-amber-400/20 transition-colors hover:bg-amber-300"
        >
          התחל ניסוי
        </motion.button>

        <p className="mt-6 text-sm text-muted" dir="rtl">
          כ-6–8 דקות • 8 ניסיונות תרגול + 112 ניסיונות
        </p>
      </motion.div>
    </main>
  );
}
