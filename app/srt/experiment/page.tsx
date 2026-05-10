'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { generateTrials, MAX_RT_MS, TOTAL_TRIALS } from '@/lib/srt/stimuli';
import { SrtTrial, SrtTrialResult } from '@/types/srt';
import { getSupabase } from '@/lib/supabase';

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
  const [showDot, setShowDot] = useState(true);
  const [saving, setSaving] = useState(false);
  const [phase, setPhase] = useState<'experiment' | 'generation'>('experiment');
  const [generationClicks, setGenerationClicks] = useState<number[]>([]);
  const [lastClicked, setLastClicked] = useState<number | null>(null);
  const [language, setLanguage] = useState<'en' | 'he'>('he');
  const stimulusOnsetRef = useRef<number>(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resultsRef = useRef<SrtTrialResult[]>([]);
  const sessionIdRef = useRef('');
  const participantNameRef = useRef<string | null>(null);
  const mainIsARef = useRef(true);

  useEffect(() => {
    sessionIdRef.current = sessionStorage.getItem('srt_session_id') ?? '';
    participantNameRef.current = sessionStorage.getItem('srt_participant_name');
    const lang = sessionStorage.getItem('srt_language') as 'en' | 'he' | null;
    if (lang) setLanguage(lang);
    const mainIsA = sessionStorage.getItem('srt_main_is_a') === '1';
    mainIsARef.current = mainIsA;
    setTrials(generateTrials(mainIsA));
    stimulusOnsetRef.current = performance.now();
  }, []);

  const trial = trials[idx] as SrtTrial | undefined;

  const recordResponseRef = useRef<(loc: number) => void>(() => {});

  recordResponseRef.current = (responseLocation: number) => {
    if (!trial || !showDot) return;
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
      saveResults();
      setPhase('generation');
    } else {
      setIdx(i => i + 1);
      stimulusOnsetRef.current = performance.now();
    }
  };

  // Max RT timeout
  useEffect(() => {
    if (!trial || !showDot || phase !== 'experiment') return;
    timeoutRef.current = setTimeout(() => {
      recordResponseRef.current(0);
    }, MAX_RT_MS);
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [idx, showDot, phase, trial]);

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

  const handleClick = useCallback((location: number) => {
    if (phase === 'experiment') {
      if (!showDot) return;
      recordResponseRef.current(location);
    }
  }, [phase, showDot]);

  const handleGenerationClick = (location: number) => {
    setLastClicked(location);
    setGenerationClicks(prev => [...prev, location]);
    setTimeout(() => setLastClicked(null), 200);
  };

  const handleGenerationDone = async () => {
    setSaving(true);
    sessionStorage.setItem('srt_generation', JSON.stringify(generationClicks));
    sessionStorage.setItem('srt_main_is_a_val', mainIsARef.current ? '1' : '0');
    try {
      const supabase = getSupabase();
      if (supabase) {
        await supabase.from('srt_generation').insert({
          session_id: sessionIdRef.current,
          participant_name: participantNameRef.current,
          sequence: generationClicks,
          main_is_a: mainIsARef.current,
        });
      }
    } catch (e) { console.error('Save generation error:', e); }
    router.push('/srt/thanks');
  };

  if (saving) {
    return (
      <div className="bg-[#0f172a] flex items-center justify-center" style={{ height: '100dvh' }}>
        <p className="text-white text-lg animate-pulse">Saving...</p>
      </div>
    );
  }

  // Generation task phase
  if (phase === 'generation') {
    const isHe = language === 'he';
    return (
      <div className="bg-[#0f172a] flex flex-col" style={{ height: '100dvh' }} dir={isHe ? 'rtl' : 'ltr'}>
        <div className="flex-shrink-0 px-4 pt-4 pb-2 text-center">
          <p className="text-white text-sm leading-relaxed max-w-sm mx-auto">
            {isHe
              ? 'במהלך המשימה הייתה סדרה חוזרת. נסו לשחזר אותה — לחצו על המיקומים בסדר שבו הם הופיעו.'
              : 'There was a recurring sequence during the task. Try to reproduce it — click the locations in the order they appeared.'}
          </p>
          <p className="text-gray-400 text-xs mt-1">
            {isHe ? `לחיצות: ${generationClicks.length}` : `Clicks: ${generationClicks.length}`}
          </p>
        </div>

        <div className="flex-1 relative">
          {[1, 2, 3, 4].map(loc => {
            const pos = POSITIONS[loc];
            const isHighlighted = lastClicked === loc;
            return (
              <button
                key={loc}
                onClick={() => handleGenerationClick(loc)}
                className={`absolute w-20 h-20 -ml-10 -mt-10 rounded-lg border-2 flex items-center justify-center touch-manipulation active:scale-95 transition-all ${
                  isHighlighted ? 'border-emerald-400 bg-emerald-400/30' : 'border-gray-500 bg-white'
                }`}
                style={{ top: pos.top, left: pos.left }}
              />
            );
          })}
        </div>

        <div className="flex-shrink-0 px-4 pb-6 flex justify-center">
          <button
            onClick={handleGenerationDone}
            disabled={generationClicks.length === 0}
            className="px-8 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold transition-colors touch-manipulation"
          >
            {isHe ? 'סיום' : 'Done'}
          </button>
        </div>
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
          const hasDot = trial.target_location === loc;
          return (
            <button
              key={loc}
              onClick={() => handleClick(loc)}
              className="absolute w-20 h-20 -ml-10 -mt-10 rounded-lg border-2 border-gray-500 bg-white flex items-center justify-center touch-manipulation active:scale-95 transition-transform"
              style={{ top: pos.top, left: pos.left }}
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
