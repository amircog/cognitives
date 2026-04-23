'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { FaceDisplay, StudyFace } from '@/components/composite-face/FaceDisplay';
import { generatePracticeTrials } from '@/lib/composite-face/stimuli';
import { Trial } from '@/types/composite-face';

type Phase = 'fixation' | 'study' | 'blank' | 'test' | 'feedback';

const FIXATION_MS = 500;
const STUDY_MS    = 800;
const BLANK_MS    = 500;
const TOTAL       = 6;

export default function PracticePage() {
  const router = useRouter();
  const [language, setLanguage] = useState<'en' | 'he'>('he');
  const [trials, setTrials]     = useState<Trial[]>([]);
  const [idx, setIdx]           = useState(0);
  const [phase, setPhase]       = useState<Phase>('fixation');
  const [correct, setCorrect]   = useState<boolean | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const lang = sessionStorage.getItem('cf_language') as 'en' | 'he' | null;
    if (lang) setLanguage(lang);
    setTrials(generatePracticeTrials());
  }, []);

  const trial = trials[idx] as Trial | undefined;
  const isHe  = language === 'he';

  useEffect(() => {
    if (!trial || phase === 'test' || phase === 'feedback') return;
    if (timerRef.current) clearTimeout(timerRef.current);
    const durations: Record<string, number> = { fixation: FIXATION_MS, study: STUDY_MS, blank: BLANK_MS };
    const next: Record<string, Phase>       = { fixation: 'study', study: 'blank', blank: 'test' };
    timerRef.current = setTimeout(() => setPhase(next[phase] as Phase), durations[phase]);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [phase, trial]);

  const handleResponse = (response: 'same' | 'different') => {
    if (!trial || phase !== 'test') return;
    const isCorrect = (response === 'same') === trial.isSame;
    setCorrect(isCorrect);
    setPhase('feedback');
  };

  const goNext = () => {
    if (idx + 1 >= TOTAL) {
      router.push('/CompositeFace/experiment');
    } else {
      setIdx(i => i + 1);
      setCorrect(null);
      setPhase('fixation');
    }
  };

  const t = isHe ? {
    practice: 'תרגול',
    trialOf: `ניסוי ${idx + 1} מתוך ${TOTAL}`,
    question: 'האם החצי העליון הוא אותו אדם?',
    same: 'כן',
    diff: 'לא',
    correct: '✓ נכון',
    incorrect: '✗ שגוי',
    answerSame: 'התשובה הנכונה: כן',
    answerDiff: 'התשובה הנכונה: לא',
    next: 'המשך',
  } : {
    practice: 'Practice',
    trialOf: `Trial ${idx + 1} of ${TOTAL}`,
    question: 'Is the top half the same person?',
    same: 'Yes',
    diff: 'No',
    correct: '✓ Correct',
    incorrect: '✗ Incorrect',
    answerSame: 'Correct answer: Yes',
    answerDiff: 'Correct answer: No',
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

          {phase === 'study' && (
            <motion.div key={`study-${idx}`}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <StudyFace src={trial.studyFace} />
            </motion.div>
          )}

          {phase === 'blank' && (
            <motion.div key="blank"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ width: 240, height: 240, background: '#1a1a2e', borderRadius: 8 }} />
          )}

          {phase === 'test' && (
            <motion.div key={`test-${idx}`}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-6"
            >
              <FaceDisplay
                topSrc={trial.testTopFace}
                bottomSrc={trial.testBottomFace}
                condition={trial.condition}
              />
              <p className="text-gray-200 text-base font-semibold text-center">{t.question}</p>
              <div className="flex gap-4">
                <button
                  onPointerDown={e => { e.preventDefault(); handleResponse('same'); }}
                  className="px-10 py-4 bg-green-700 hover:bg-green-600 text-white font-bold rounded-2xl text-xl touch-manipulation shadow-lg"
                >{t.same}</button>
                <button
                  onPointerDown={e => { e.preventDefault(); handleResponse('different'); }}
                  className="px-10 py-4 bg-red-800 hover:bg-red-700 text-white font-bold rounded-2xl text-xl touch-manipulation shadow-lg"
                >{t.diff}</button>
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
              <p className="text-gray-400 text-sm">
                {trial.isSame ? t.answerSame : t.answerDiff}
              </p>
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
