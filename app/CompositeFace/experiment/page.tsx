'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { FaceDisplay, StudyFace } from '@/components/composite-face/FaceDisplay';
import { generateMainTrials } from '@/lib/composite-face/stimuli';
import { Trial, TrialResult } from '@/types/composite-face';
import { getSupabase } from '@/lib/supabase';

type Phase = 'fixation' | 'study' | 'blank' | 'test' | 'iti';

const FIXATION_MS = 500;
const STUDY_MS    = 800;
const BLANK_MS    = 500;
const ITI_MS      = 300;
const TOTAL       = 40;

export default function ExperimentPage() {
  const router = useRouter();
  const [language, setLanguage]   = useState<'en' | 'he'>('he');
  const [trials, setTrials]       = useState<Trial[]>([]);
  const [idx, setIdx]             = useState(0);
  const [phase, setPhase]         = useState<Phase>('fixation');
  const [results, setResults]     = useState<TrialResult[]>([]);
  const [saving, setSaving]       = useState(false);
  const testOnsetRef              = useRef<number>(0);
  const timerRef                  = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const lang = sessionStorage.getItem('cf_language') as 'en' | 'he' | null;
    if (lang) setLanguage(lang);
    setTrials(generateMainTrials());
  }, []);

  const trial = trials[idx] as Trial | undefined;
  const isHe  = language === 'he';

  // Timer-driven phases
  useEffect(() => {
    if (!trial || phase === 'test') return;
    if (timerRef.current) clearTimeout(timerRef.current);

    const durations: Partial<Record<Phase, number>> = {
      fixation: FIXATION_MS,
      study:    STUDY_MS,
      blank:    BLANK_MS,
      iti:      ITI_MS,
    };
    const nextPhase: Partial<Record<Phase, Phase>> = {
      fixation: 'study',
      study:    'blank',
      blank:    'test',
      iti:      'fixation',
    };

    timerRef.current = setTimeout(() => {
      const n = nextPhase[phase];
      if (!n) return;
      if (n === 'test') testOnsetRef.current = performance.now();
      setPhase(n);
    }, durations[phase]);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [phase, trial]);

  const saveAndFinish = useCallback(async (allResults: TrialResult[]) => {
    setSaving(true);
    sessionStorage.setItem('cf_main_results', JSON.stringify(allResults));
    try {
      const supabase = getSupabase();
      if (supabase) {
        await supabase.from('composite_face_results').insert(allResults);
      }
    } catch (e) { console.error('Save error:', e); }
    router.push('/CompositeFace/thanks');
  }, [router]);

  const handleResponse = useCallback((response: 'same' | 'different') => {
    if (!trial || phase !== 'test') return;
    const rt        = Math.round(performance.now() - testOnsetRef.current);
    const isCorrect = (response === 'same') === trial.isSame;

    const result: TrialResult = {
      session_id:       sessionStorage.getItem('cf_session_id') ?? '',
      participant_name: sessionStorage.getItem('cf_participant_name') ?? null,
      trial_index:      idx,
      condition:        trial.condition,
      is_same:          trial.isSame,
      response,
      is_correct:       isCorrect,
      reaction_time_ms: rt,
      study_face:       trial.studyFace,
      test_top_face:    trial.testTopFace,
      test_bottom_face: trial.testBottomFace,
      is_practice:      false,
    };

    const newResults = [...results, result];
    setResults(newResults);

    if (idx + 1 >= TOTAL) {
      saveAndFinish(newResults);
    } else {
      setIdx(i => i + 1);
      setPhase('iti');
    }
  }, [trial, phase, idx, results, saveAndFinish]);

  const t = isHe ? {
    question: 'האם החצי העליון הוא אותו אדם?',
    same: 'כן', diff: 'לא',
    saving: 'שומר…',
    trialOf: `${idx + 1} / ${TOTAL}`,
  } : {
    question: 'Is the top half the same person?',
    same: 'Yes', diff: 'No',
    saving: 'Saving…',
    trialOf: `${idx + 1} / ${TOTAL}`,
  };

  if (!trial || saving) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <p className="text-gray-400 text-lg">{saving ? t.saving : 'Loading…'}</p>
      </div>
    );
  }

  const progress = (idx / TOTAL) * 100;

  return (
    <div
      className="bg-[#0f172a] flex flex-col select-none"
      style={{ height: '100dvh', direction: isHe ? 'rtl' : 'ltr' }}
    >
      {/* Progress bar */}
      <div className="flex-shrink-0 h-5">
        <div className="h-1.5 bg-gray-800">
          <motion.div className="h-full bg-orange-500" animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
        </div>
        <div className="flex justify-end px-4 pt-0.5">
          <span className="text-xs text-gray-600">{t.trialOf}</span>
        </div>
      </div>

      {/* Center */}
      <div className="flex-1 flex flex-col items-center justify-center overflow-hidden px-4">
        <AnimatePresence mode="wait">

          {(phase === 'fixation' || phase === 'iti') && (
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
            <motion.div key={`blank-${idx}`}
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

        </AnimatePresence>
      </div>
    </div>
  );
}
