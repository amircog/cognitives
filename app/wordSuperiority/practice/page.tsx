'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { generatePracticeTrials, FIXATION_MS, DISPLAY_MS, MASK_MS, TARGET_IDX } from '@/lib/word-superiority/stimuli';
import { Trial } from '@/types/word-superiority';

type Phase = 'fixation' | 'stimulus' | 'mask' | 'response' | 'feedback';

const TOTAL = 6;

// ── WordShape: renders character boxes in RTL order (index 0 on right) ────────
function WordShape({ length, targetIdx, getLetter }: {
  length: number;
  targetIdx: number;
  getLetter?: (i: number) => string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'row-reverse', gap: 6 }}>
      {Array.from({ length }, (_, i) => {
        const isTarget = i === targetIdx;
        const letter = getLetter ? getLetter(i) : undefined;
        return (
          <div key={i} style={{
            width: 44, height: 52,
            border: isTarget ? '2px solid #f97316' : '1px solid #4b5563',
            borderRadius: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: isTarget ? 'rgba(249,115,22,0.12)' : 'transparent',
            color: isTarget ? '#f97316' : '#9ca3af',
            fontSize: 24, fontWeight: 700,
            fontFamily: 'monospace',
          }}>
            {letter ?? (isTarget ? '' : '_')}
          </div>
        );
      })}
    </div>
  );
}

export default function PracticePage() {
  const router = useRouter();
  const [language, setLanguage] = useState<'en' | 'he'>('he');
  const [trials, setTrials]     = useState<Trial[]>([]);
  const [idx, setIdx]           = useState(0);
  const [phase, setPhase]       = useState<Phase>('fixation');
  const [correct, setCorrect]   = useState<boolean | null>(null);
  const [responseOrder, setResponseOrder] = useState<[string, string]>(['', '']);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const lang = sessionStorage.getItem('wse_language') as 'en' | 'he' | null;
    if (lang) setLanguage(lang);
    setTrials(generatePracticeTrials());
  }, []);

  const trial = trials[idx] as Trial | undefined;
  const isHe  = language === 'he';

  // Shuffle response button order once per trial
  useEffect(() => {
    if (!trial) return;
    const order: [string, string] = Math.random() < 0.5
      ? [trial.correctLetter, trial.foilLetter]
      : [trial.foilLetter, trial.correctLetter];
    setResponseOrder(order);
  }, [idx, trial?.correctLetter]);

  useEffect(() => {
    if (!trial || phase === 'response' || phase === 'feedback') return;
    if (timerRef.current) clearTimeout(timerRef.current);
    const durations: Record<string, number> = { fixation: FIXATION_MS, stimulus: DISPLAY_MS, mask: MASK_MS };
    const next: Record<string, Phase>       = { fixation: 'stimulus', stimulus: 'mask', mask: 'response' };
    timerRef.current = setTimeout(() => setPhase(next[phase] as Phase), durations[phase]);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [phase, trial]);

  const handleResponse = (letter: string) => {
    if (phase !== 'response' || !trial) return;
    setCorrect(letter === trial.correctLetter);
    setPhase('feedback');
  };

  const goNext = () => {
    if (idx + 1 >= TOTAL) {
      router.push('/wordSuperiority/experiment');
    } else {
      setIdx(i => i + 1);
      setCorrect(null);
      setPhase('fixation');
    }
  };

  const t = isHe ? {
    practice: 'תרגול',
    trialOf: `ניסוי ${idx + 1} מתוך ${TOTAL}`,
    question: 'איזו אות הופיעה במיקום המסומן?',
    correct: '✓ נכון', incorrect: '✗ שגוי',
    answer: 'התשובה הנכונה:',
    next: 'המשך',
  } : {
    practice: 'Practice',
    trialOf: `Trial ${idx + 1} of ${TOTAL}`,
    question: 'Which letter appeared at the marked position?',
    correct: '✓ Correct', incorrect: '✗ Incorrect',
    answer: 'Correct answer:',
    next: 'Next',
  };

  if (!trial) {
    return <div className="min-h-screen bg-[#0f172a] flex items-center justify-center"><p className="text-gray-400">Loading…</p></div>;
  }

  const progress = (idx / TOTAL) * 100;

  return (
    <div className="bg-[#0f172a] flex flex-col select-none" style={{ height: '100dvh', direction: isHe ? 'rtl' : 'ltr' }}>
      {/* Progress */}
      <div className="flex-shrink-0 h-6">
        <div className="h-1.5 bg-gray-800">
          <motion.div className="h-full bg-orange-500" animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }} />
        </div>
        <div className="flex justify-between items-center px-4 pt-0.5">
          <span className="text-xs text-orange-400 font-medium">{t.practice}</span>
          <span className="text-xs text-gray-500">{t.trialOf}</span>
        </div>
      </div>

      {/* Center */}
      <div className="flex-1 flex flex-col items-center justify-center overflow-hidden px-4">
        <AnimatePresence mode="wait">

          {phase === 'fixation' && (
            <motion.div key={`fix-${idx}`}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-white text-6xl font-thin">+</motion.div>
          )}

          {phase === 'stimulus' && (
            <motion.div key={`stim-${idx}`}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ direction: 'rtl' }}
            >
              {trial.condition === 'single-letter' ? (
                <WordShape
                  length={trial.wordLength}
                  targetIdx={TARGET_IDX}
                  getLetter={i => i === TARGET_IDX ? trial.correctLetter : ''}
                />
              ) : (
                <span style={{ fontSize: 36, fontWeight: 700, color: '#f1f5f9', fontFamily: 'monospace', letterSpacing: 6 }}>
                  {trial.stimulus}
                </span>
              )}
            </motion.div>
          )}

          {phase === 'mask' && (
            <motion.div key={`mask-${idx}`}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ fontSize: 36, fontWeight: 700, color: '#6b7280', fontFamily: 'monospace', letterSpacing: 6 }}
            >
              {'#'.repeat(trial.wordLength)}
            </motion.div>
          )}

          {phase === 'response' && (
            <motion.div key={`resp-${idx}`}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-6"
            >
              <p className="text-gray-300 text-base font-semibold text-center">{t.question}</p>
              {/* Position indicator: show which slot to judge */}
              <WordShape length={trial.wordLength} targetIdx={TARGET_IDX} />
              {/* Letter choice buttons */}
              <div className="flex gap-4 mt-2">
                {responseOrder.map((letter, i) => (
                  <button key={i}
                    onPointerDown={e => { e.preventDefault(); handleResponse(letter); }}
                    className="w-20 h-20 bg-gray-800 hover:bg-gray-700 border-2 border-gray-600 hover:border-orange-400 text-white font-bold rounded-2xl text-3xl transition-colors touch-manipulation shadow-lg"
                    style={{ fontFamily: 'monospace' }}
                  >
                    {letter}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {phase === 'feedback' && (
            <motion.div key={`fb-${idx}`}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-5"
            >
              <p className={`text-3xl font-bold ${correct ? 'text-green-400' : 'text-red-400'}`}>
                {correct ? t.correct : t.incorrect}
              </p>
              {!correct && (
                <p className="text-gray-400 text-sm">
                  {t.answer} <span className="text-white font-bold text-lg" style={{ fontFamily: 'monospace' }}>{trial.correctLetter}</span>
                </p>
              )}
              <button
                onPointerDown={e => { e.preventDefault(); goNext(); }}
                className="mt-2 px-10 py-4 bg-orange-500 hover:bg-orange-400 text-white font-bold rounded-xl text-lg transition-colors touch-manipulation shadow-lg"
              >{t.next}</button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
