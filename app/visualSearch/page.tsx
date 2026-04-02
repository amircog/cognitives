'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';
import { Search, ArrowRight } from 'lucide-react';

const ITEM_COLOR: Record<string, string> = { red: '#ef4444', blue: '#3b82f6' };

export default function VisualSearchIntroPage() {
  const router = useRouter();
  const [participantName, setParticipantName] = useState('');
  const [targetColor, setTargetColor] = useState<'red' | 'blue'>('red');

  // Assign and show target color before experiment starts
  useEffect(() => {
    let tc = sessionStorage.getItem('vs_target_color') as 'red' | 'blue' | null;
    if (!tc) {
      tc = Math.random() < 0.5 ? 'red' : 'blue';
      sessionStorage.setItem('vs_target_color', tc);
    }
    setTargetColor(tc);
  }, []);

  const handleStart = () => {
    const sessionId = uuidv4();
    sessionStorage.setItem('vs_session_id', sessionId);
    sessionStorage.setItem('vs_participant_name', participantName.trim());
    router.push('/visualSearch/experiment');
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
          <Search className="w-10 h-10 text-rose-400" />
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            ניסוי חיפוש חזותי
          </h1>
        </div>

        <p className="text-xl text-muted mb-8">חיפוש צירוף – אפקט גודל המערך</p>

        {/* Target example */}
        <div className="bg-card border border-border rounded-xl p-5 mb-6 flex items-center justify-center gap-6">
          <span className="text-sm text-muted" dir="rtl">היעד שלך:</span>
          <span
            style={{
              color: ITEM_COLOR[targetColor],
              fontSize: 42,
              fontFamily: 'monospace',
              fontWeight: 'bold',
              lineHeight: 1,
            }}
          >
            T
          </span>
          <span className="text-sm text-muted">
            ({targetColor === 'red' ? 'T אדומה' : 'T כחולה'})
          </span>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 mb-8 text-right" dir="rtl">
          <h2 className="text-lg font-semibold mb-4">הוראות</h2>
          <ol className="space-y-3 text-muted list-decimal list-inside">
            <li>בניסוי זה תחפשו את האות T בצבע שמוצג למעלה בין אותיות אחרות על המסך.</li>
            <li>
              לחצו{' '}
              <kbd className="px-2 py-0.5 bg-background rounded text-foreground text-sm font-mono">L</kbd>{' '}
              או כפתור <strong className="text-foreground">נמצא</strong> אם T בצבע היעד נמצאת על המסך.
            </li>
            <li>
              לחצו{' '}
              <kbd className="px-2 py-0.5 bg-background rounded text-foreground text-sm font-mono">A</kbd>{' '}
              או כפתור <strong className="text-foreground">לא נמצא</strong> אם T בצבע היעד אינה נמצאת.
            </li>
            <li>נסו להיות מהירים ומדויקים ככל האפשר.</li>
          </ol>

          <div className="mt-6 pt-4 border-t border-border flex items-center justify-end gap-6 text-sm">
            <div className="flex items-center gap-2">
              <kbd className="px-3 py-1.5 bg-background rounded text-foreground font-mono text-base font-bold">L</kbd>
              <span className="text-muted">= נמצא</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-3 py-1.5 bg-background rounded text-foreground font-mono text-base font-bold">A</kbd>
              <span className="text-muted">= לא נמצא</span>
            </div>
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
                       focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent
                       text-right"
            dir="rtl"
          />
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleStart}
          className="px-8 py-4 bg-rose-500 text-white font-bold text-lg rounded-xl
                     shadow-lg shadow-rose-500/20 transition-colors hover:bg-rose-400"
        >
          התחל ניסוי
        </motion.button>

        <p className="mt-6 text-sm text-muted" dir="rtl">
          כ-8–10 דקות • 8 ניסיונות תרגול + 128 ניסיונות
        </p>
      </motion.div>
    </main>
  );
}
