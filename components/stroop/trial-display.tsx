'use client';

import { motion } from 'framer-motion';
import { Trial } from '@/types/stroop';

interface TrialDisplayProps {
  trial: Trial;
}

export function TrialDisplay({ trial }: TrialDisplayProps) {
  return (
    <motion.div
      key={trial.id}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.15 }}
      className="flex items-center justify-center"
    >
      <span
        className="text-7xl md:text-8xl font-bold uppercase tracking-tight select-none"
        style={{ color: trial.fontColor }}
      >
        {trial.wordText}
      </span>
    </motion.div>
  );
}
