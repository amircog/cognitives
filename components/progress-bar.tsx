'use client';

import { motion } from 'framer-motion';

interface ProgressBarProps {
  current: number;
  total: number;
}

export function ProgressBar({ current, total }: ProgressBarProps) {
  const progress = (current / total) * 100;

  return (
    <div className="w-full max-w-md">
      <div className="flex justify-between text-sm text-muted mb-2">
        <span>Trial {current} of {total}</span>
        <span>{Math.round(progress)}%</span>
      </div>
      <div className="h-2 bg-card rounded-full overflow-hidden border border-border">
        <motion.div
          className="h-full bg-emerald-400"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
    </div>
  );
}
