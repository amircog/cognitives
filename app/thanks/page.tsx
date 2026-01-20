'use client';

import { motion } from 'framer-motion';
import { CheckCircle, Heart } from 'lucide-react';

export default function ThanksPage() {
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
          <CheckCircle className="w-24 h-24 text-emerald-400" />
        </motion.div>

        <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
          Thank You!
        </h1>

        <p className="text-xl text-muted mb-8">
          You have successfully completed the Stroop Effect experiment.
          Your responses have been recorded and will contribute to our
          understanding of cognitive interference.
        </p>

        <div className="bg-card border border-border rounded-xl p-6 mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Heart className="w-5 h-5 text-rose-400" />
            <h2 className="text-lg font-semibold">What's Next?</h2>
          </div>
          <p className="text-muted">
            Your teacher will share the aggregated results with the class.
            This data helps demonstrate how our brains process conflicting
            information and the fascinating phenomenon of cognitive interference.
          </p>
        </div>

        <p className="text-sm text-muted">
          You may now close this window.
        </p>
      </motion.div>
    </main>
  );
}
