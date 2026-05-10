'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { generateTrials, ISI_MS, MAX_RT_MS, TOTAL_TRIALS } from '@/lib/srt/stimuli';
import { SrtTrial, SrtTrialResult } from '@/types/srt';
import { getSupabase } from '@/lib/supabase';

type Phase = 'isi' | 'stimulus';

// Location coordinates for diamond formation (relative positioning)
// 1=down, 2=left, 3=right, 4=up
const POSITIONS: Record<number, { top: string; left: string }> = {
  4: { top: '10%', left: '50%' },   // up
  2: { top: '50%', left: '10%' },   // left
  3: { top: '50%', left: '90%' },   // right
  1: { top: '90%', left: '50%' },   // down
};

export default function SrtExperiment() {
  const router = useRouter();
  const [trials, setTrials] = useState<SrtTrial[]>([]);
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('isi');
  const [saving, setSaving] = useState(false);
  const stimulusOnsetRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resultsRef = useRef<SrtTrialResult[]>([]);
  const sessionIdRef = useRef('');
  const participantNameRef = useRef<string | null>(null);

  useEffect(() => {
    sessionIdRef.current = sessionStorage.getItem('srt_session_id') ?? '';
    participantNameRef.current = sessionStorage.getItem('srt_participant_name');
    const mainIsA = sessionStorage.getItem('srt_main_is_a') === '1';
    setTrials(generateTrials(mainIsA));
  }, []);

  const trial = trials[idx] as SrtTrial | undefined;

  // Phase timing: ISI -> stimulus
  useEffect(() => {
    if (!trial || phase !== 'isi') return;
    timerRef.current = setTimeout(() => {
      stimulusOnsetRef.current = performance.now();
      setPhase('stimulus');
    }, ISI_MS);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [phase, trial]);

  const recordResponseRef = useRef<(loc: number) => void>(() => {});

  recordResponseRef.current = (responseLocation: number) => {
    if (!trial || phase !== 'stimulus') return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    const rt = responseLocation === 0 ? null : Math.round(performance.now() - stimulusOnsetRef.current);
    const correct = responseLocation === trial.target_location;

    const result: SrtTrialResult = {
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
    };

    resultsRef.current.push(result);

    if (idx + 1 >= trials.length) {
      saveAndFinish();
    } else {
      setIdx(i => i + 1);
      setPhase('isi');
    }
  };

  // Max RT timeout
  useEffect(() => {
    if (!trial || phase !== 'stimulus') return;
    timeoutRef.current = setTimeout(() => {
      recordResponseRef.current(0);
    }, MAX_RT_MS);
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [phase, trial]);

  const saveAndFinish = useCallback(async () => {
    setSaving(true);
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
    router.push('/srt/thanks');
  }, [router]);

  const handleClick = useCallback((location: number) => {
    if (phase !== 'stimulus') return;
    recordResponseRef.current(location);
  }, [phase]);

  if (saving) {
    return (
      <div className="bg-[#0f172a] flex items-center justify-center" style={{ height: '100dvh' }}>
        <p className="text-white text-lg animate-pulse">Saving...</p>
      </div>
    );
  }

  if (!trial) {
    return (
      <div className="bg-[#0f172a] flex items-center justify-center" style={{ height: '100dvh' }}>
        <p className="text-white">Loading...</p>
      </div>
    );
  }

  return (
    <div className="bg-[#0f172a] flex flex-col" style={{ height: '100dvh' }}>
      {/* Progress bar */}
      <div className="flex-shrink-0 h-6">
        <div className="h-1.5 bg-gray-800">
          <motion.div
            className="h-full bg-emerald-500"
            animate={{ width: `${(idx / TOTAL_TRIALS) * 100}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>

      {/* Diamond arena */}
      <div className="flex-1 relative">
        {[1, 2, 3, 4].map(loc => {
          const pos = POSITIONS[loc];
          const hasDot = phase === 'stimulus' && trial.target_location === loc;
          return (
            <button
              key={loc}
              onClick={() => handleClick(loc)}
              className="absolute w-20 h-20 -ml-10 -mt-10 rounded-lg border-2 border-gray-500 bg-white flex items-center justify-center touch-manipulation active:scale-95 transition-transform"
              style={{ top: pos.top, left: pos.left }}
              disabled={phase !== 'stimulus'}
            >
              {hasDot && (
                <div className="w-8 h-8 rounded-full bg-black" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
