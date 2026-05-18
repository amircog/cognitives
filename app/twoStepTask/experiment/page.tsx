'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  STAGE1_STIMULI, STAGE2A_STIMULI, STAGE2B_STIMULI,
  STATE_COLORS, STAGE1_COLOR,
  STAGE1_CHOICE_MS, TRANSITION_MS, STAGE2_CHOICE_MS, REWARD_MS, ISI_MS,
  MAIN_TRIALS,
  generateTrials, getTransition, getReward, getStimulusForChoice,
} from '@/lib/two-step-task/stimuli';
import { TwoStepTrial, TwoStepTrialResult } from '@/types/two-step-task';
import { getSupabase } from '@/lib/supabase';

// transition: selected Stage 1 shown above Stage 2 options (not clickable)
// stage2: only Stage 2 options shown (clickable)
type Phase = 'stage1' | 'transition' | 'stage2' | 'stage2-highlight' | 'reward' | 'isi';

const STIM_SIZE = 'w-28 h-28';
const STIM_TEXT = 'text-5xl';

export default function TwoStepExperiment() {
  const router = useRouter();
  const [language, setLanguage] = useState<'en' | 'he'>('he');
  const [trials, setTrials] = useState<TwoStepTrial[]>([]);
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('stage1');
  const [coins, setCoins] = useState(0);
  const [saving, setSaving] = useState(false);

  const [stage1Choice, setStage1Choice] = useState<'left' | 'right' | null>(null);
  const [stage2State, setStage2State] = useState<'A' | 'B' | null>(null);
  const [transitionType, setTransitionType] = useState<'common' | 'rare' | null>(null);
  const [stage2Choice, setStage2Choice] = useState<'left' | 'right' | null>(null);
  const [rewarded, setRewarded] = useState(false);

  const stage1OnsetRef = useRef(0);
  const stage2OnsetRef = useRef(0);
  const stage1RtRef = useRef<number | null>(null);
  const stage2RtRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resultsRef = useRef<TwoStepTrialResult[]>([]);

  useEffect(() => {
    const lang = sessionStorage.getItem('tst_language') as 'en' | 'he' | null;
    if (lang) setLanguage(lang);
    setTrials(generateTrials(MAIN_TRIALS, false));
  }, []);

  const trial = trials[idx] as TwoStepTrial | undefined;
  const isHe = language === 'he';

  const clearTimer = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  }, []);

  const recordAndAdvance = useCallback((
    s1Choice: 'left' | 'right' | null,
    s1Rt: number | null,
    s2St: 'A' | 'B' | null,
    transType: 'common' | 'rare' | null,
    s2Choice: 'left' | 'right' | null,
    s2Rt: number | null,
    won: boolean,
    missS1: boolean,
    missS2: boolean,
    currentTrial: TwoStepTrial,
  ) => {
    const result: TwoStepTrialResult = {
      session_id: sessionStorage.getItem('tst_session_id') ?? '',
      participant_name: sessionStorage.getItem('tst_participant_name') ?? null,
      trial_index: currentTrial.trialIndex,
      is_practice: false,
      stage1_choice: s1Choice ?? 'left',
      stage1_stimulus: s1Choice ? getStimulusForChoice(1, null, s1Choice) : '',
      stage1_rt_ms: s1Rt,
      transition_type: transType ?? 'common',
      stage2_state: s2St ?? 'A',
      stage2_choice: s2Choice ?? 'left',
      stage2_stimulus: s2Choice && s2St ? getStimulusForChoice(2, s2St, s2Choice) : '',
      stage2_rt_ms: s2Rt,
      rewarded: won,
      reward_prob_s2a_left: currentTrial.rewardProbs[0],
      reward_prob_s2a_right: currentTrial.rewardProbs[1],
      reward_prob_s2b_left: currentTrial.rewardProbs[2],
      reward_prob_s2b_right: currentTrial.rewardProbs[3],
      missed_stage1: missS1,
      missed_stage2: missS2,
    };
    resultsRef.current.push(result);
  }, []);

  const saveAndFinish = useCallback(async () => {
    setSaving(true);
    const allResults = resultsRef.current;
    sessionStorage.setItem('tst_results', JSON.stringify(allResults));
    try {
      const supabase = getSupabase();
      if (supabase) {
        for (let i = 0; i < allResults.length; i += 500) {
          await supabase.from('two_step_results').insert(allResults.slice(i, i + 500));
        }
      }
    } catch (e) { console.error('Save error:', e); }
    router.push('/twoStepTask/thanks');
  }, [router]);

  const startNextTrial = useCallback(() => {
    if (idx + 1 >= MAIN_TRIALS) {
      saveAndFinish();
      return;
    }
    setIdx(i => i + 1);
    setStage1Choice(null);
    setStage2State(null);
    setTransitionType(null);
    setStage2Choice(null);
    setRewarded(false);
    stage1RtRef.current = null;
    stage2RtRef.current = null;
    setPhase('isi');
  }, [idx, saveAndFinish]);

  // Phase timer
  useEffect(() => {
    if (!trial) return;
    clearTimer();

    if (phase === 'stage1') {
      stage1OnsetRef.current = performance.now();
      timerRef.current = setTimeout(() => {
        recordAndAdvance(null, null, null, null, null, null, false, true, false, trial);
        startNextTrial();
      }, STAGE1_CHOICE_MS);
    } else if (phase === 'transition') {
      // Selected Stage 1 item shown above Stage 2 options for TRANSITION_MS
      timerRef.current = setTimeout(() => {
        stage2OnsetRef.current = performance.now();
        setPhase('stage2');
      }, TRANSITION_MS);
    } else if (phase === 'stage2') {
      timerRef.current = setTimeout(() => {
        recordAndAdvance(stage1Choice, stage1RtRef.current, stage2State, transitionType, null, null, false, false, true, trial);
        startNextTrial();
      }, STAGE2_CHOICE_MS);
    } else if (phase === 'stage2-highlight') {
      timerRef.current = setTimeout(() => {
        if (!stage2State || !stage2Choice) return;
        const won = getReward(stage2State, stage2Choice, trial.rewardProbs);
        setRewarded(won);
        if (won) setCoins(c => c + 1);
        recordAndAdvance(stage1Choice, stage1RtRef.current, stage2State, transitionType, stage2Choice, stage2RtRef.current, won, false, false, trial);
        setPhase('reward');
      }, 500);
    } else if (phase === 'reward') {
      timerRef.current = setTimeout(() => startNextTrial(), REWARD_MS);
    } else if (phase === 'isi') {
      timerRef.current = setTimeout(() => setPhase('stage1'), ISI_MS);
    }

    return clearTimer;
  }, [phase, trial, stage1Choice, stage2Choice, stage2State, transitionType, clearTimer, recordAndAdvance, startNextTrial]);

  const handleStage1 = useCallback((choice: 'left' | 'right') => {
    if (phase !== 'stage1') return;
    clearTimer();
    stage1RtRef.current = Math.round(performance.now() - stage1OnsetRef.current);
    setStage1Choice(choice);
    const trans = getTransition(choice);
    setStage2State(trans.state);
    setTransitionType(trans.type);
    setPhase('transition');
  }, [phase, clearTimer]);

  const handleStage2 = useCallback((choice: 'left' | 'right') => {
    if (phase !== 'stage2') return;
    clearTimer();
    stage2RtRef.current = Math.round(performance.now() - stage2OnsetRef.current);
    setStage2Choice(choice);
    setPhase('stage2-highlight');
  }, [phase, clearTimer]);

  if (!trial || saving) {
    return (
      <div className="bg-[#0f172a] flex items-center justify-center" style={{ height: '100dvh' }}>
        <p className="text-gray-400 text-lg">{saving ? (isHe ? 'שומר…' : 'Saving…') : 'Loading…'}</p>
      </div>
    );
  }

  const progress = (idx / MAIN_TRIALS) * 100;
  const stateColor = stage2State ? STATE_COLORS[stage2State] : null;
  const s1Sym = stage1Choice ? STAGE1_STIMULI[stage1Choice === 'left' ? 0 : 1] : null;
  const s2Stimuli = stage2State === 'A' ? STAGE2A_STIMULI : STAGE2B_STIMULI;

  return (
    <div className="bg-[#0f172a] flex flex-col select-none" style={{ height: '100dvh' }}>
      {/* Progress */}
      <div className="flex-shrink-0 h-6">
        <div className="h-1.5 bg-gray-800">
          <motion.div className="h-full bg-emerald-500" animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
        </div>
        <div className="flex justify-between items-center px-4 pt-0.5">
          <span className="text-xs text-gray-600">{idx + 1} / {MAIN_TRIALS}</span>
          <span className="text-xs text-yellow-400">🪙 {coins}</span>
        </div>
      </div>

      {/* Center */}
      <div className="flex-1 flex flex-col items-center justify-center overflow-hidden px-4">

        {/* ISI */}
        {phase === 'isi' && (
          <div className="text-white text-6xl font-thin">+</div>
        )}

        {/* Stage 1: two clickable options */}
        {phase === 'stage1' && (
          <div className="rounded-2xl p-6 flex gap-8" style={{ background: STAGE1_COLOR.bgLight, border: `2px solid ${STAGE1_COLOR.border}` }}>
            {(['left', 'right'] as const).map(side => {
              const sym = STAGE1_STIMULI[side === 'left' ? 0 : 1];
              return (
                <button
                  key={side}
                  onPointerDown={e => { e.preventDefault(); handleStage1(side); }}
                  className={`${STIM_SIZE} rounded-xl ${STIM_TEXT} flex items-center justify-center transition-all touch-manipulation shadow-lg text-white active:scale-95`}
                  style={{ background: STAGE1_COLOR.bg }}
                >
                  {sym}
                </button>
              );
            })}
          </div>
        )}

        {/* Transition: selected Stage 1 item above Stage 2 options (all non-clickable) */}
        {phase === 'transition' && stateColor && s1Sym && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-6"
          >
            {/* Selected Stage 1 item */}
            <div
              className={`${STIM_SIZE} rounded-2xl ${STIM_TEXT} flex items-center justify-center border-2`}
              style={{ background: STAGE1_COLOR.bg, borderColor: STAGE1_COLOR.border }}
            >
              {s1Sym}
            </div>
            {/* Stage 2 options (not clickable yet) */}
            <div className="rounded-2xl p-6 flex gap-8" style={{ background: stateColor.bgLight, border: `2px solid ${stateColor.border}` }}>
              {s2Stimuli.map((sym, i) => (
                <div
                  key={i}
                  className={`${STIM_SIZE} rounded-xl ${STIM_TEXT} flex items-center justify-center text-white`}
                  style={{ background: stateColor.bg }}
                >
                  {sym}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Stage 2: clickable options (no Stage 1 item shown) */}
        {(phase === 'stage2' || phase === 'stage2-highlight') && stateColor && (
          <div className="rounded-2xl p-6 flex gap-8" style={{ background: stateColor.bgLight, border: `2px solid ${stateColor.border}` }}>
            {(['left', 'right'] as const).map(side => {
              const sym = s2Stimuli[side === 'left' ? 0 : 1];
              const selected = stage2Choice === side;
              return (
                <button
                  key={side}
                  onPointerDown={e => { e.preventDefault(); handleStage2(side); }}
                  disabled={phase !== 'stage2'}
                  className={`${STIM_SIZE} rounded-xl ${STIM_TEXT} flex items-center justify-center transition-all touch-manipulation shadow-lg text-white
                    ${selected ? 'scale-110 ring-4 ring-emerald-400' : 'active:scale-95'}`}
                  style={{ background: stateColor.bg }}
                >
                  {sym}
                </button>
              );
            })}
          </div>
        )}

        {/* Reward */}
        {phase === 'reward' && (
          <motion.div
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="flex flex-col items-center gap-3"
          >
            {rewarded ? (
              <div className="text-8xl">🪙</div>
            ) : (
              <div className="text-8xl opacity-15">🪙</div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
