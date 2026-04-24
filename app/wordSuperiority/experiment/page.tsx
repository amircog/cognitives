'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { generateMainTrials, FIXATION_MS, DISPLAY_MS, MASK_MS, TARGET_IDX } from '@/lib/word-superiority/stimuli';
import { Trial, TrialResult } from '@/types/word-superiority';
import { getSupabase } from '@/lib/supabase';

type Phase = 'fixation' | 'stimulus' | 'mask' | 'response' | 'iti';

const TOTAL  = 60;
const ITI_MS = 300; // inter-trial interval

// ── WordShape ────────────────────────────────────────────────────────────────
function WordShape({ length, targetIdx, getLetter }: {
  length: number;
  targetIdx: number;
  getLetter?: (i: number) => string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'row', direction: 'rtl', gap: 6 }}>
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

export default function ExperimentPage() {
  const router = useRouter();
  const [language, setLanguage]   = useState<'en' | 'he'>('he');
  const [trials, setTrials]       = useState<Trial[]>([]);
  const [idx, setIdx]             = useState(0);
  const [phase, setPhase]         = useState<Phase>('fixation');
  const [results, setResults]     = useState<TrialResult[]>([]);
  const [saving, setSaving]       = useState(false);
  const [responseOrder, setResponseOrder] = useState<[string, string]>(['', '']);
  const responseOnsetRef          = useRef<number>(0);
  const timerRef                  = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const lang = sessionStorage.getItem('wse_language') as 'en' | 'he' | null;
    if (lang) setLanguage(lang);
    setTrials(generateMainTrials());
  }, []);

  const trial = trials[idx] as Trial | undefined;
  const isHe  = language === 'he';

  // Shuffle response order once per trial
  useEffect(() => {
    if (!trial) return;
    const order: [string, string] = Math.random() < 0.5
      ? [trial.correctLetter, trial.foilLetter]
      : [trial.foilLetter, trial.correctLetter];
    setResponseOrder(order);
  }, [idx, trial?.correctLetter]);

  useEffect(() => {
    if (!trial || phase === 'response') return;
    if (timerRef.current) clearTimeout(timerRef.current);

    const durations: Partial<Record<Phase, number>> = {
      fixation: FIXATION_MS, stimulus: DISPLAY_MS, mask: MASK_MS, iti: ITI_MS,
    };
    const nextPhase: Partial<Record<Phase, Phase>> = {
      fixation: 'stimulus', stimulus: 'mask', mask: 'response', iti: 'fixation',
    };

    timerRef.current = setTimeout(() => {
      const n = nextPhase[phase];
      if (!n) return;
      if (n === 'response') responseOnsetRef.current = performance.now();
      setPhase(n);
    }, durations[phase]);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [phase, trial]);

  const saveAndFinish = useCallback(async (allResults: TrialResult[]) => {
    setSaving(true);
    sessionStorage.setItem('wse_main_results', JSON.stringify(allResults));
    try {
      const supabase = getSupabase();
      if (supabase) {
        // Batch insert in chunks of 500
        for (let i = 0; i < allResults.length; i += 500) {
          await supabase.from('word_superiority_results').insert(allResults.slice(i, i + 500));
        }
      }
    } catch (e) { console.error('Save error:', e); }
    router.push('/wordSuperiority/thanks');
  }, [router]);

  const handleResponse = useCallback((letter: string) => {
    if (!trial || phase !== 'response') return;
    const rt        = Math.round(performance.now() - responseOnsetRef.current);
    const isCorrect = letter === trial.correctLetter;

    const result: TrialResult = {
      session_id:       sessionStorage.getItem('wse_session_id') ?? '',
      participant_name: sessionStorage.getItem('wse_participant_name') ?? null,
      trial_index:      idx,
      condition:        trial.condition,
      stimulus:         trial.stimulus,
      correct_letter:   trial.correctLetter,
      response_letter:  letter,
      is_correct:       isCorrect,
      reaction_time_ms: rt,
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
    question: 'איזו אות הופיעה במיקום המסומן?',
    saving: 'שומר…',
    trialOf: `${idx + 1} / ${TOTAL}`,
  } : {
    question: 'Which letter appeared at the marked position?',
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
      {/* Progress */}
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

          {/* Timed phases — no AnimatePresence so 50ms stimulus isn't eaten by exit animation */}
          {(phase === 'fixation' || phase === 'iti') && (
            <div className="text-white text-6xl font-thin">+</div>
          )}

          {phase === 'stimulus' && (
            <div style={{ direction: 'rtl' }}>
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
            </div>
          )}

          {phase === 'mask' && (
            <div style={{ fontSize: 36, fontWeight: 700, color: '#f1f5f9', fontFamily: 'monospace', letterSpacing: 6 }}>
              {'#'.repeat(trial.wordLength)}
            </div>
          )}

          {/* Response — animated fade-in is fine here (no timing constraint) */}
          <AnimatePresence>
          {phase === 'response' && (
            <motion.div key={`resp-${idx}`}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center gap-6"
            >
              <p className="text-gray-300 text-base font-semibold text-center">{t.question}</p>
              <WordShape length={trial.wordLength} targetIdx={TARGET_IDX} />
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
          </AnimatePresence>
      </div>
    </div>
  );
}
