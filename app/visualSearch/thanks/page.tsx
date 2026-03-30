'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { CheckCircle } from 'lucide-react';

export default function VisualSearchThanksPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-2xl"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="flex justify-center mb-6"
        >
          <CheckCircle className="w-24 h-24 text-rose-400" />
        </motion.div>

        <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6" dir="rtl">
          !תודה רבה
        </h1>

        <p className="text-muted mb-10" dir="rtl">
          הניסוי הסתיים. תוצאותיך נשמרו.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push('/visualSearch/results')}
            className="px-8 py-4 bg-rose-500 text-white font-bold text-lg rounded-xl
                       shadow-lg shadow-rose-500/20 transition-colors hover:bg-rose-400"
          >
            ראה תוצאות
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push('/')}
            className="px-8 py-4 bg-card border border-border text-foreground font-bold text-lg rounded-xl
                       transition-colors hover:bg-border"
          >
            חזרה לדף הבית
          </motion.button>
        </div>
      </motion.div>
    </main>
  );
}
