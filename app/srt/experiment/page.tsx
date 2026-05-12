'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { generateTrials, MAX_RT_MS, TOTAL_TRIALS, SEQUENCE_A, SEQUENCE_B } from '@/lib/srt/stimuli';
import { SrtTrial, SrtTrialResult } from '@/types/srt';
import { getSupabase } from '@/lib/supabase';

const POSITIONS: Record<number, { top: string; left: string }> = {
  4: { top: '10%', left: '50%' },
  2: { top: '50%', left: '10%' },
  3: { top: '50%', left: '90%' },
  1: { top: '90%', left: '50%' },
};

const GEN_PRIME_MS = 750;
const GEN_FEEDBACK_MS = 750;
const GEN_TRIALS = 12;

type Phase = 'experiment' | 'gen-awareness' | 'gen-instructions' | 'gen-prime' | 'gen-respond' | 'gen-feedback' | 'done';

export default function SrtExperiment() {
  const router = useRouter();
  const [trials, setTrials] = useState<SrtTrial[]>([]);
  const [idx, setIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const [phase, setPhase] = useState<Phase>('experiment');
  const [language, setLanguage] = useState<'en' | 'he'>('he');

  // Awareness + Generation state
  const [noticedRegularity, setNoticedRegularity] = useState<boolean | null>(null);
  const [genIdx, setGenIdx] = useState(0); // 0-11 for the 12 generation trials
  const [genResponses, setGenResponses] = useState<number[]>([]);
  const [genPrimeStep, setGenPrimeStep] = useState(0); // 0 or 1 for the two priming dots
  const [genFeedbackLoc, setGenFeedbackLoc] = useState<number | null>(null); // correct loc shown as dot
  const [genClickedLoc, setGenClickedLoc] = useState<number | null>(null); // what participant clicked
  const [genClickCorrect, setGenClickCorrect] = useState<boolean>(false);

  const stimulusOnsetRef = useRef<number>(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resultsRef = useRef<SrtTrialResult[]>([]);
  const sessionIdRef = useRef('');
  const participantNameRef = useRef<string | null>(null);
  const mainIsARef = useRef(true);
  const mainSeqRef = useRef(SEQUENCE_A);

  useEffect(() => {
    sessionIdRef.current = sessionStorage.getItem('srt_session_id') ?? '';
    participantNameRef.current = sessionStorage.getItem('srt_participant_name');
    const lang = sessionStorage.getItem('srt_language') as 'en' | 'he' | null;
    if (lang) setLanguage(lang);
    const mainIsA = sessionStorage.getItem('srt_main_is_a') === '1';
    mainIsARef.current = mainIsA;
    mainSeqRef.current = mainIsA ? SEQUENCE_A : SEQUENCE_B;
    setTrials(generateTrials(mainIsA));
    stimulusOnsetRef.current = performance.now();
  }, []);

  const trial = trials[idx] as SrtTrial | undefined;

  // --- EXPERIMENT PHASE ---
  const recordResponseRef = useRef<(loc: number) => void>(() => {});
  recordResponseRef.current = (responseLocation: number) => {
    if (!trial) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    const rt = responseLocation === 0 ? null : Math.round(performance.now() - stimulusOnsetRef.current);
    const correct = responseLocation === trial.target_location;

    resultsRef.current.push({
      session_id: sessionIdRef.current,
      participant_name: participantNameRef.current,
      block_number: trial.block_number,
      trial_in_block: trial.trial_in_block,
      trial_overall: trial.trial_overall,
      sequence_position: trial.sequence_position,
      target_location: trial.target_location,
      response_location: responseLocation,
      correct,
      rt_ms: rt,
      sequence_type: trial.sequence_type,
      is_practice: false,
    });

    if (idx + 1 >= trials.length) {
      saveResults();
      setPhase('gen-awareness');
    } else {
      setIdx(i => i + 1);
      stimulusOnsetRef.current = performance.now();
    }
  };

  useEffect(() => {
    if (!trial || phase !== 'experiment') return;
    timeoutRef.current = setTimeout(() => {
      recordResponseRef.current(0);
    }, MAX_RT_MS);
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [idx, phase, trial]);

  const saveResults = useCallback(async () => {
    const allResults = resultsRef.current;
    sessionStorage.setItem('srt_results', JSON.stringify(allResults));
    try {
      const supabase = getSupabase();
      if (supabase) {
        for (let i = 0; i < allResults.length; i += 500) {
          await supabase.from('srt_results').insert(allResults.slice(i, i + 500));
        }
      }
    } catch (e) { console.error('Save error:', e); }
  }, []);

  const handleExpClick = useCallback((location: number) => {
    if (phase !== 'experiment') return;
    recordResponseRef.current(location);
  }, [phase]);

  // --- GENERATION PRIMING ---
  // Show positions 10 and 11 (0-indexed) = sequence items 11 and 12
  useEffect(() => {
    if (phase !== 'gen-prime') return;
    const timer = setTimeout(() => {
      if (genPrimeStep === 0) {
        setGenPrimeStep(1);
      } else {
        setPhase('gen-respond');
      }
    }, GEN_PRIME_MS);
    return () => clearTimeout(timer);
  }, [phase, genPrimeStep]);

  // --- GENERATION FEEDBACK (show correct dot) ---
  useEffect(() => {
    if (phase !== 'gen-feedback') return;
    const timer = setTimeout(() => {
      const nextIdx = genIdx + 1;
      if (nextIdx >= GEN_TRIALS) {
        finishGeneration();
      } else {
        setGenIdx(nextIdx);
        setGenFeedbackLoc(null);
        setGenClickedLoc(null);
        setPhase('gen-respond');
      }
    }, GEN_FEEDBACK_MS);
    return () => clearTimeout(timer);
  }, [phase, genIdx]);

  const handleGenClick = (location: number) => {
    if (phase !== 'gen-respond') return;
    const seq = mainSeqRef.current;
    const correctLoc = seq[genIdx]; // genIdx 0-11 maps to sequence positions 0-11
    const isCorrect = location === correctLoc;

    setGenResponses(prev => [...prev, location]);
    setGenClickedLoc(location);
    setGenClickCorrect(isCorrect);
    setGenFeedbackLoc(correctLoc);
    setPhase('gen-feedback');
  };

  const finishGeneration = async () => {
    setSaving(true);
    const finalResponses = [...genResponses];
    sessionStorage.setItem('srt_generation', JSON.stringify(finalResponses));
    sessionStorage.setItem('srt_main_is_a_val', mainIsARef.current ? '1' : '0');
    try {
      const supabase = getSupabase();
      if (supabase) {
        const row: Record<string, unknown> = {
          session_id: sessionIdRef.current,
          participant_name: participantNameRef.current,
          sequence: finalResponses,
          main_is_a: mainIsARef.current,
          noticed_regularity: noticedRegularity,
        };
        const { error } = await supabase.from('srt_generation').insert(row);
        if (error) {
          // Retry without noticed_regularity if column doesn't exist yet
          delete row.noticed_regularity;
          await supabase.from('srt_generation').insert(row);
        }
      }
    } catch (e) { console.error('Save generation error:', e); }
    router.push('/srt/thanks');
  };

  // --- RENDER ---
  const isHe = language === 'he';

  if (saving) {
    return (
      <div className="bg-[#0f172a] flex items-center justify-center" style={{ height: '100dvh' }}>
        <p className="text-white text-lg animate-pulse">Saving...</p>
      </div>
    );
  }

  // Awareness question
  if (phase === 'gen-awareness') {
    return (
      <div className="bg-[#0f172a] flex items-center justify-center px-4" style={{ height: '100dvh' }} dir={isHe ? 'rtl' : 'ltr'}>
        <div className="max-w-sm text-center flex flex-col items-center gap-6">
          <p className="text-white text-base leading-relaxed">
            {isHe
              ? 'האם הבחנת בחוקיות כלשהי במיקומי הנקודות?'
              : 'Did you notice any regularity in the locations?'}
          </p>
          <div className="flex gap-4">
            <button
              onClick={() => { setNoticedRegularity(true); setPhase('gen-instructions'); }}
              className="px-8 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold transition-colors touch-manipulation"
            >
              {isHe ? 'כן' : 'Yes'}
            </button>
            <button
              onClick={() => { setNoticedRegularity(false); setPhase('gen-instructions'); }}
              className="px-8 py-3 rounded-xl bg-gray-600 hover:bg-gray-500 text-white font-semibold transition-colors touch-manipulation"
            >
              {isHe ? 'לא' : 'No'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Generation instructions screen
  if (phase === 'gen-instructions') {
    return (
      <div className="bg-[#0f172a] flex items-center justify-center px-4" style={{ height: '100dvh' }} dir={isHe ? 'rtl' : 'ltr'}>
        <div className="max-w-sm text-center flex flex-col items-center gap-6">
          <p className="text-white text-sm leading-relaxed">
            {isHe
              ? 'תודה, כמעט סיימת. במהלך הניסוי שביצעת הייתה סדרה של 12 מיקומים שחזרה על עצמה. אראה לך את שני המיקומים הראשונים ואז אבקש ממך לשחזר את ההמשך על ידי לחיצה על המיקומים. לאחר כל לחיצה, אם טעית — תוצג התשובה הנכונה. לחץ/י כשאת/ה מוכן/ה להתחיל.'
              : 'Thank you, you are almost finished. There was a sequence of 12 locations that repeated itself in the experiment you just did. I\'ll show you the first two locations and then ask you to reproduce the rest by clicking the locations. After each click, you\'ll be shown the correct answer if you answered incorrectly. Tap when ready to begin.'}
          </p>
          <button
            onClick={() => { setGenPrimeStep(0); setPhase('gen-prime'); }}
            className="px-8 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold transition-colors touch-manipulation"
          >
            {isHe ? 'מוכן/ה' : 'Ready'}
          </button>
        </div>
      </div>
    );
  }

  // Generation priming: show dots at positions 10 and 11 (0-indexed) of main sequence
  if (phase === 'gen-prime') {
    const seq = mainSeqRef.current;
    const primeLocs = [seq[10], seq[11]]; // last two items of the 12-item sequence
    const currentPrimeLoc = primeLocs[genPrimeStep];
    return (
      <div className="bg-[#0f172a] flex flex-col" style={{ height: '100dvh' }}>
        <div className="flex-1 relative">
          {[1, 2, 3, 4].map(loc => {
            const pos = POSITIONS[loc];
            const hasDot = loc === currentPrimeLoc;
            return (
              <div
                key={loc}
                className="absolute w-20 h-20 -ml-10 -mt-10 rounded-lg border-2 border-gray-500 bg-white flex items-center justify-center"
                style={{ top: pos.top, left: pos.left }}
              >
                {hasDot && <div className="w-8 h-8 rounded-full bg-black" />}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Generation respond: waiting for participant click
  if (phase === 'gen-respond') {
    return (
      <div className="bg-[#0f172a] flex flex-col" style={{ height: '100dvh' }}>
        <div className="flex-shrink-0 px-4 pt-3 text-center">
          <p className="text-gray-400 text-xs">
            {isHe ? `מיקום ${genIdx + 1} מתוך 12` : `Position ${genIdx + 1} of 12`}
          </p>
        </div>
        <div className="flex-1 relative">
          {[1, 2, 3, 4].map(loc => {
            const pos = POSITIONS[loc];
            return (
              <button
                key={loc}
                onClick={() => handleGenClick(loc)}
                className="absolute w-20 h-20 -ml-10 -mt-10 rounded-lg border-2 border-gray-500 bg-white flex items-center justify-center touch-manipulation active:scale-95 transition-transform"
                style={{ top: pos.top, left: pos.left }}
              />
            );
          })}
        </div>
      </div>
    );
  }

  // Generation feedback: show click result + correct dot
  if (phase === 'gen-feedback') {
    return (
      <div className="bg-[#0f172a] flex flex-col" style={{ height: '100dvh' }}>
        <div className="flex-shrink-0 px-4 pt-3 text-center">
          <p className="text-gray-400 text-xs">
            {isHe ? `מיקום ${genIdx + 1} מתוך 12` : `Position ${genIdx + 1} of 12`}
          </p>
        </div>
        <div className="flex-1 relative">
          {[1, 2, 3, 4].map(loc => {
            const pos = POSITIONS[loc];
            const isClicked = genClickedLoc === loc;
            const isCorrectLoc = genFeedbackLoc === loc;

            let borderClass = 'border-gray-500 bg-white';
            if (isClicked && genClickCorrect) {
              borderClass = 'border-emerald-400 bg-emerald-400/30';
            } else if (isClicked && !genClickCorrect) {
              borderClass = 'border-rose-400 bg-rose-400/30';
            } else if (isCorrectLoc && !genClickCorrect) {
              borderClass = 'border-emerald-400 bg-emerald-400/30';
            }

            return (
              <div
                key={loc}
                className={`absolute w-20 h-20 -ml-10 -mt-10 rounded-lg border-2 flex items-center justify-center transition-all ${borderClass}`}
                style={{ top: pos.top, left: pos.left }}
              >
                {isCorrectLoc && <div className="w-8 h-8 rounded-full bg-black" />}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Main experiment
  if (!trial) {
    return (
      <div className="bg-[#0f172a] flex items-center justify-center" style={{ height: '100dvh' }}>
        <p className="text-white">Loading...</p>
      </div>
    );
  }

  return (
    <div className="bg-[#0f172a] flex flex-col" style={{ height: '100dvh' }}>
      <div className="flex-shrink-0 h-6">
        <div className="h-1.5 bg-gray-800">
          <motion.div
            className="h-full bg-emerald-500"
            animate={{ width: `${(idx / TOTAL_TRIALS) * 100}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>
      <div className="flex-1 relative">
        {[1, 2, 3, 4].map(loc => {
          const pos = POSITIONS[loc];
          const hasDot = trial.target_location === loc;
          return (
            <button
              key={loc}
              onClick={() => handleExpClick(loc)}
              className="absolute w-20 h-20 -ml-10 -mt-10 rounded-lg border-2 border-gray-500 bg-white flex items-center justify-center touch-manipulation active:scale-95 transition-transform"
              style={{ top: pos.top, left: pos.left }}
            >
              {hasDot && <div className="w-8 h-8 rounded-full bg-black" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
