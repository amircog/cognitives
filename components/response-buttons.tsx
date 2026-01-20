'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { COLORS, ColorKey } from '@/types';
import { getColorFromKey } from '@/lib/experiment';

interface ResponseButtonsProps {
  onResponse: (color: ColorKey) => void;
  disabled: boolean;
}

const buttonConfig: { key: ColorKey; label: string; shortcut: string }[] = [
  { key: 'yellow', label: 'Y', shortcut: 'y' },
  { key: 'green', label: 'G', shortcut: 'g' },
  { key: 'red', label: 'R', shortcut: 'r' },
];

export function ResponseButtons({ onResponse, disabled }: ResponseButtonsProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (disabled) return;
      const color = getColorFromKey(event.key);
      if (color) {
        onResponse(color);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onResponse, disabled]);

  return (
    <div className="flex gap-4 md:gap-6">
      {buttonConfig.map(({ key, label }) => (
        <motion.button
          key={key}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onResponse(key)}
          disabled={disabled}
          className="w-16 h-16 md:w-20 md:h-20 rounded-xl font-bold text-2xl md:text-3xl
                     bg-white text-zinc-900 border-2 border-zinc-300
                     transition-opacity disabled:opacity-50 disabled:cursor-not-allowed
                     shadow-lg hover:border-zinc-400"
        >
          {label}
        </motion.button>
      ))}
    </div>
  );
}
