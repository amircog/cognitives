'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle, BarChart2 } from 'lucide-react';

export default function VisualSearchThanksPage() {
  const router = useRouter();
  const [lang, setLang] = useState<'he' | 'en'>('he');

  useEffect(() => {
    const saved = sessionStorage.getItem('vs_language') as 'he' | 'en' | null;
    if (saved) setLang(saved);
  }, []);

  const isHe = lang === 'he';
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 gap-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="flex justify-center mb-6"
        >
          <CheckCircle className="w-24 h-24 text-rose-400" />
        </motion.div>

        <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-2" dir={isHe ? 'rtl' : 'ltr'}>
          {isHe ? '!תודה רבה' : 'Thank You!'}
        </h1>
        <p className="text-xl text-muted" dir={isHe ? 'rtl' : 'ltr'}>
          {isHe ? 'הניסוי הסתיים' : 'The experiment is complete.'}
        </p>
      </motion.div>

      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        onClick={() => router.push('/visualSearch/results')}
        className="flex items-center gap-2 px-6 py-3 bg-card border border-border rounded-xl
                   font-medium text-gray-300 hover:border-rose-400 hover:text-rose-400 transition-colors"
      >
        <BarChart2 className="w-5 h-5" />
        <span dir={isHe ? 'rtl' : 'ltr'}>
          {isHe ? 'הצג את התוצאות שלי' : 'View my results'}
        </span>
      </motion.button>
    </main>
  );
}
