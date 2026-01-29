'use client';

import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';

export default function DRMThanksPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-8">
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
          <CheckCircle className="w-24 h-24 text-purple-400" />
        </motion.div>

        <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
          !תודה
        </h1>

        <div className="bg-card border border-border rounded-xl p-6 mb-6" dir="rtl">
          <p className="text-lg mb-4 text-right">
            סיימת את ניסוי הזיכרון!
          </p>
          <p className="text-muted text-right">
            התוצאות נשמרו במערכת. תוכל לראות את הביצועים שלך בדף התוצאות.
          </p>
        </div>

        <p className="text-sm text-muted">
          ניתן כעת לסגור את החלון
        </p>
      </motion.div>
    </main>
  );
}
