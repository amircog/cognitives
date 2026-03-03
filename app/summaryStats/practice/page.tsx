'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import ArrayDisplay from '@/components/summary-stats/ArrayDisplay';
import ResponseScale, { FeedbackDisplay } from '@/components/summary-stats/ResponseScale';
import {
  generatePracticeTrials,
  DISPLAY_DURATION_MS,
  BLANK_DURATION_MS,
  FIXATION_DURATION_MS,
} from '@/lib/summary-stats/stimuli';
import { EnsembleTrial } from '@/types/summary-stats';

type Phase = 'fixation' | 'array' | 'blank' | 'response' | 'feedback';

const TOTAL_PRACTICE = 6;

export default function PracticePage() {
  const router = useRouter();
  const [language, setLanguage] = useState<'en' | 'he'>('he');
  const [trials, setTrials] = useState<EnsembleTrial[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('fixation');
  const [responseValue, setResponseValue] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const lang = sessionStorage.getItem('ss_language') as 'en' | 'he' | null;
    if (lang) setLanguage(lang);
    setTrials(generatePracticeTrials());
  }, []);

  const currentTrial = trials[currentIndex];

  // Timer-driven phase transitions
  useEffect(() => {
    if (!currentTrial) return;
    if (timerRef.current) clearTimeout(timerRef.current);

    if (phase === 'fixation') {
      timerRef.current = setTimeout(() => setPhase('array'), FIXATION_DURATION_MS);
    } else if (phase === 'array') {
      timerRef.current = setTimeout(() => setPhase('blank'), DISPLAY_DURATION_MS);
    } else if (phase === 'blank') {
      timerRef.current = setTimeout(() => setPhase('response'), BLANK_DURATION_MS);
    }

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [phase, currentTrial]);

  const handleResponse = (value: number) => {
    setResponseValue(value);
    setPhase('feedback');
  };

  const handleNext = () => {
    if (currentIndex + 1 >= TOTAL_PRACTICE) {
      router.push('/summaryStats/ensemble');
    } else {
      setCurrentIndex(i => i + 1);
      setResponseValue(null);
      setPhase('fixation');
    }
  };

  const content = {
    he: {
      practiceTitle: 'שלב תרגול',
      trialOf: (n: number, total: number) => `ניסוי ${n} מתוך ${total}`,
    },
    en: {
      practiceTitle: 'Practice Phase',
      trialOf: (n: number, total: number) => `Trial ${n} of ${total}`,
    },
  };

  const t = content[language];

  if (!currentTrial) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="text-gray-400 text-xl">Loading...</div>
      </div>
    );
  }

  const progress = (currentIndex / TOTAL_PRACTICE) * 100;

  return (
    <div
      className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center"
      style={{ direction: language === 'he' ? 'rtl' : 'ltr' }}
    >
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-1.5 bg-gray-800">
        <motion.div
          className="h-full bg-orange-500"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>

      {/* Counters */}
      <div className="fixed top-4 right-4 text-gray-400 text-sm">
        {t.trialOf(currentIndex + 1, TOTAL_PRACTICE)}
      </div>
      <div className="fixed top-4 left-4 text-orange-400 text-sm font-medium">
        {t.practiceTitle}
      </div>

      <AnimatePresence mode="wait">
        {/* FIXATION */}
        {phase === 'fixation' && (
          <motion.div
            key="fixation"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="text-white text-6xl font-thin select-none"
          >
            +
          </motion.div>
        )}

        {/* ARRAY */}
        {phase === 'array' && (
          <motion.div
            key="array"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <ArrayDisplay
              items={currentTrial.items}
              stimulusType={currentTrial.stimulusType}
              size={500}
            />
          </motion.div>
        )}

        {/* BLANK */}
        {phase === 'blank' && (
          <motion.div
            key="blank"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="w-[500px] h-[500px]"
            style={{ background: '#1a1a2e', borderRadius: 8 }}
          />
        )}

        {/* RESPONSE */}
        {phase === 'response' && (
          <motion.div
            key="response"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="w-full max-w-lg px-6"
          >
            <ResponseScale
              stimulusType={currentTrial.stimulusType}
              statType={currentTrial.statType}
              onConfirm={handleResponse}
              language={language}
            />
          </motion.div>
        )}

        {/* FEEDBACK */}
        {phase === 'feedback' && responseValue !== null && (
          <motion.div
            key="feedback"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="w-full max-w-lg px-6"
          >
            <FeedbackDisplay
              stimulusType={currentTrial.stimulusType}
              trueValue={currentTrial.trueValue}
              responseValue={responseValue}
              statType={currentTrial.statType}
              language={language}
              onNext={handleNext}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
