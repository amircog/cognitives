'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import ArrayDisplay, { SingleItemDisplay } from '@/components/summary-stats/ArrayDisplay';
import ResponseScale, { EnsembleFeedback } from '@/components/summary-stats/ResponseScale';
import {
  generatePracticeTrials,
  DISPLAY_DURATION_MS,
  BLANK_DURATION_MS,
  FIXATION_DURATION_MS,
  TWO_AFC_LABELS,
  RECOGNITION_LABEL,
} from '@/lib/summary-stats/stimuli';
import { Trial, EnsembleTrial, RecognitionTrial, TwoAFCTrial } from '@/types/summary-stats';

type Phase = 'fixation' | 'array' | 'blank' | 'question' | 'feedback';

const TOTAL_PRACTICE = 10;

interface FeedbackState {
  trialType: 'ensemble' | 'recognition' | '2afc';
  // ensemble
  trueValue?: number;
  responseValue?: number;
  // recognition / 2afc
  isCorrect?: boolean;
  correctLabel?: string;
}

export default function PracticePage() {
  const router = useRouter();
  const [language, setLanguage] = useState<'en' | 'he'>('he');
  const [trials, setTrials]     = useState<Trial[]>([]);
  const [idx, setIdx]           = useState(0);
  const [phase, setPhase]       = useState<Phase>('fixation');
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const lang = sessionStorage.getItem('ss_language') as 'en' | 'he' | null;
    if (lang) setLanguage(lang);
    setTrials(generatePracticeTrials());
  }, []);

  const trial = trials[idx] as Trial | undefined;
  const isHe  = language === 'he';

  // Timer-driven transitions
  useEffect(() => {
    if (!trial || phase === 'question' || phase === 'feedback') return;
    if (timerRef.current) clearTimeout(timerRef.current);

    if (phase === 'fixation') {
      timerRef.current = setTimeout(() => setPhase('array'), FIXATION_DURATION_MS);
    } else if (phase === 'array') {
      timerRef.current = setTimeout(() => setPhase('blank'), DISPLAY_DURATION_MS);
    } else if (phase === 'blank') {
      timerRef.current = setTimeout(() => setPhase('question'), BLANK_DURATION_MS);
    }

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [phase, trial]);

  const goNext = () => {
    if (idx + 1 >= TOTAL_PRACTICE) {
      router.push('/summaryStats/ensemble');
    } else {
      setIdx(i => i + 1);
      setFeedback(null);
      setPhase('fixation');
    }
  };

  // Response handlers
  const handleEnsemble = (value: number) => {
    const t = trial as EnsembleTrial;
    setFeedback({ trialType: 'ensemble', trueValue: t.trueValue, responseValue: value });
    setPhase('feedback');
  };

  const handleRecognition = (yes: boolean) => {
    const t = trial as RecognitionTrial;
    const correct = yes === t.probeIsTarget;
    const correctLabel = isHe
      ? (t.probeIsTarget ? 'הפריט הופיע בתצוגה' : 'הפריט לא הופיע בתצוגה')
      : (t.probeIsTarget ? 'This item DID appear' : 'This item did NOT appear');
    setFeedback({ trialType: 'recognition', isCorrect: correct, correctLabel });
    setPhase('feedback');
  };

  const handle2AFC = (choseA: boolean) => {
    const t = trial as TwoAFCTrial;
    const correct = choseA === t.correctIsA;
    setFeedback({ trialType: '2afc', isCorrect: correct });
    setPhase('feedback');
  };

  if (!trial) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <p className="text-gray-400 text-lg">Loading...</p>
      </div>
    );
  }

  const progress = (idx / TOTAL_PRACTICE) * 100;
  const afc = trial.type === '2afc' ? (trial as TwoAFCTrial) : null;
  const optAValue = afc ? (afc.correctIsA ? afc.trueValue  : afc.foilValue) : 0;
  const optBValue = afc ? (afc.correctIsA ? afc.foilValue  : afc.trueValue) : 0;

  const t = {
    practiceLabel: isHe ? 'תרגול' : 'Practice',
    trialOf: isHe ? `ניסוי ${idx + 1} מתוך ${TOTAL_PRACTICE}` : `Trial ${idx + 1} of ${TOTAL_PRACTICE}`,
    probeQ: RECOGNITION_LABEL[language],
    afcQ: trial.type === '2afc' ? TWO_AFC_LABELS[trial.stimulusType][language] : '',
    yes: isHe ? 'כן' : 'Yes',
    no:  isHe ? 'לא' : 'No',
    correct:   isHe ? '✓ נכון' : '✓ Correct',
    incorrect: isHe ? '✗ שגוי' : '✗ Incorrect',
    next: isHe ? 'ניסוי הבא' : 'Next',
  };

  return (
    <div
      className="bg-[#0f172a] flex flex-col select-none"
      style={{ height: '100dvh', direction: isHe ? 'rtl' : 'ltr' }}
    >
      {/* Top bar */}
      <div className="flex-shrink-0 h-6">
        <div className="h-1.5 bg-gray-800">
          <motion.div className="h-full bg-orange-500" animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }} />
        </div>
        <div className="flex justify-between items-center px-4 pt-0.5">
          <span className="text-xs text-orange-400 font-medium">{t.practiceLabel}</span>
          <span className="text-xs text-gray-500">{t.trialOf}</span>
        </div>
      </div>

      {/* Center area */}
      <div className="flex-1 flex flex-col items-center justify-center overflow-hidden px-4">
        <AnimatePresence mode="wait">

          {phase === 'fixation' && (
            <motion.div key={`fix-${idx}`}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-white text-6xl font-thin">+</motion.div>
          )}

          {phase === 'array' && (
            <motion.div key={`arr-${idx}`}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ width: '100%', maxWidth: 480 }}
            >
              <ArrayDisplay items={trial.items} stimulusType={trial.stimulusType} />
            </motion.div>
          )}

          {phase === 'blank' && (
            <motion.div key="blank"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ width: '100%', maxWidth: 480, aspectRatio: '1', background: '#1a1a2e', borderRadius: 8 }}
            />
          )}

          {/* QUESTION — ENSEMBLE */}
          {phase === 'question' && trial.type === 'ensemble' && (
            <motion.div key={`q-e-${idx}`}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="w-full max-w-sm"
            >
              <ResponseScale
                stimulusType={(trial as EnsembleTrial).stimulusType}
                onConfirm={handleEnsemble}
                language={language}
              />
            </motion.div>
          )}

          {/* QUESTION — RECOGNITION */}
          {phase === 'question' && trial.type === 'recognition' && (
            <motion.div key={`q-r-${idx}`}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-5"
            >
              <p className="text-gray-200 text-lg font-semibold text-center px-4">{t.probeQ}</p>
              <SingleItemDisplay
                value={(trial as RecognitionTrial).probeValue}
                stimulusType={trial.stimulusType}
                size={180} color="#f97316"
              />
              <div className="flex gap-4">
                <button
                  onPointerDown={e => { e.preventDefault(); handleRecognition(true); }}
                  className="px-8 py-4 bg-green-700 hover:bg-green-600 text-white font-bold rounded-2xl text-lg touch-manipulation shadow-lg"
                >{t.yes}</button>
                <button
                  onPointerDown={e => { e.preventDefault(); handleRecognition(false); }}
                  className="px-8 py-4 bg-red-800 hover:bg-red-700 text-white font-bold rounded-2xl text-lg touch-manipulation shadow-lg"
                >{t.no}</button>
              </div>
            </motion.div>
          )}

          {/* QUESTION — 2AFC */}
          {phase === 'question' && trial.type === '2afc' && afc && (
            <motion.div key={`q-f-${idx}`}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-5 px-2"
            >
              <p className="text-gray-200 text-lg font-semibold text-center">{t.afcQ}</p>
              <div className="flex gap-5 items-end" style={{ direction: 'ltr' }}>
                <button
                  onPointerDown={e => { e.preventDefault(); handle2AFC(true); }}
                  className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 border-gray-600 hover:border-orange-400 bg-gray-800 active:scale-95 transition-all touch-manipulation"
                >
                  <SingleItemDisplay value={optAValue} stimulusType={afc.stimulusType} size={150} color="#f97316" />
                </button>
                <button
                  onPointerDown={e => { e.preventDefault(); handle2AFC(false); }}
                  className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 border-gray-600 hover:border-orange-400 bg-gray-800 active:scale-95 transition-all touch-manipulation"
                >
                  <SingleItemDisplay value={optBValue} stimulusType={afc.stimulusType} size={150} color="#f97316" />
                </button>
              </div>
            </motion.div>
          )}

          {/* FEEDBACK — ENSEMBLE */}
          {phase === 'feedback' && feedback?.trialType === 'ensemble' && feedback.trueValue !== undefined && feedback.responseValue !== undefined && (
            <motion.div key={`fb-e-${idx}`}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="w-full max-w-sm"
            >
              <EnsembleFeedback
                stimulusType={trial.stimulusType}
                trueValue={feedback.trueValue}
                responseValue={feedback.responseValue}
                language={language}
                onNext={goNext}
              />
            </motion.div>
          )}

          {/* FEEDBACK — RECOGNITION or 2AFC */}
          {phase === 'feedback' && feedback?.trialType !== 'ensemble' && (
            <motion.div key={`fb-b-${idx}`}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-5 px-6"
            >
              <div className={`text-3xl font-bold ${feedback?.isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                {feedback?.isCorrect ? t.correct : t.incorrect}
              </div>
              {feedback?.correctLabel && (
                <p className="text-gray-300 text-base text-center">{feedback.correctLabel}</p>
              )}
              <button
                onPointerDown={e => { e.preventDefault(); goNext(); }}
                className="px-10 py-4 bg-orange-500 hover:bg-orange-400 text-white font-bold rounded-xl text-lg transition-colors touch-manipulation shadow-lg"
              >{t.next}</button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
