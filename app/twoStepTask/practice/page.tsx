'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  STAGE1_STIMULI, STAGE2A_STIMULI, STAGE2B_STIMULI,
  STATE_COLORS,
  STAGE1_CHOICE_MS, TRANSITION_MS, STAGE2_CHOICE_MS, REWARD_MS, ISI_MS,
  PRACTICE_TRIALS,
  generateTrials, getTransition, getReward,
} from '@/lib/two-step-task/stimuli';
import { TwoStepTrial } from '@/types/two-step-task';

type Phase =
  | 'tutorial-welcome'
  | 'tutorial-stage1'
  | 'tutorial-transition'
  | 'tutorial-stage2'
  | 'tutorial-reward'
  | 'tutorial-strategy'
  | 'stage1'
  | 'stage1-highlight'
  | 'transition'
  | 'stage2'
  | 'stage2-highlight'
  | 'reward'
  | 'isi'
  | 'feedback';

export default function TwoStepPractice() {
  const router = useRouter();
  const [language, setLanguage] = useState<'en' | 'he'>('he');
  const [phase, setPhase] = useState<Phase>('tutorial-welcome');
  const [trials, setTrials] = useState<TwoStepTrial[]>([]);
  const [idx, setIdx] = useState(0);
  const [coins, setCoins] = useState(0);

  // Trial state
  const [stage1Choice, setStage1Choice] = useState<'left' | 'right' | null>(null);
  const [stage2State, setStage2State] = useState<'A' | 'B' | null>(null);
  const [transitionType, setTransitionType] = useState<'common' | 'rare' | null>(null);
  const [stage2Choice, setStage2Choice] = useState<'left' | 'right' | null>(null);
  const [rewarded, setRewarded] = useState(false);
  const [missed, setMissed] = useState<'stage1' | 'stage2' | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const lang = sessionStorage.getItem('tst_language') as 'en' | 'he' | null;
    if (lang) setLanguage(lang);
    setTrials(generateTrials(PRACTICE_TRIALS, true));
  }, []);

  const isHe = language === 'he';
  const trial = trials[idx] as TwoStepTrial | undefined;

  const clearTimer = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  }, []);

  // Timed phases
  useEffect(() => {
    if (!trial) return;
    clearTimer();

    if (phase === 'stage1') {
      timerRef.current = setTimeout(() => {
        setMissed('stage1');
        setPhase('feedback');
      }, STAGE1_CHOICE_MS);
    } else if (phase === 'stage1-highlight') {
      timerRef.current = setTimeout(() => {
        if (!stage1Choice) return;
        const trans = getTransition(stage1Choice);
        setStage2State(trans.state);
        setTransitionType(trans.type);
        setPhase('transition');
      }, 500);
    } else if (phase === 'transition') {
      timerRef.current = setTimeout(() => setPhase('stage2'), TRANSITION_MS);
    } else if (phase === 'stage2') {
      timerRef.current = setTimeout(() => {
        setMissed('stage2');
        setRewarded(false);
        setPhase('feedback');
      }, STAGE2_CHOICE_MS);
    } else if (phase === 'stage2-highlight') {
      timerRef.current = setTimeout(() => {
        if (!stage2State || !stage2Choice) return;
        const won = getReward(stage2State, stage2Choice, trial.rewardProbs);
        setRewarded(won);
        if (won) setCoins(c => c + 1);
        setPhase('reward');
      }, 500);
    } else if (phase === 'reward') {
      timerRef.current = setTimeout(() => setPhase('feedback'), REWARD_MS);
    } else if (phase === 'isi') {
      timerRef.current = setTimeout(() => setPhase('stage1'), ISI_MS);
    }

    return clearTimer;
  }, [phase, trial, stage1Choice, stage2Choice, stage2State, clearTimer]);

  const handleStage1 = (choice: 'left' | 'right') => {
    if (phase !== 'stage1') return;
    clearTimer();
    setStage1Choice(choice);
    setPhase('stage1-highlight');
  };

  const handleStage2 = (choice: 'left' | 'right') => {
    if (phase !== 'stage2') return;
    clearTimer();
    setStage2Choice(choice);
    setPhase('stage2-highlight');
  };

  const nextTrial = () => {
    if (idx + 1 >= PRACTICE_TRIALS) {
      router.push('/twoStepTask/experiment');
      return;
    }
    setIdx(i => i + 1);
    setStage1Choice(null);
    setStage2State(null);
    setTransitionType(null);
    setStage2Choice(null);
    setRewarded(false);
    setMissed(null);
    setPhase('isi');
  };

  // ── Tutorial text ─────────────────────────────────────────────────
  const tutorialContent: Record<string, { he: string; en: string }> = {
    'tutorial-welcome': {
      he: 'ברוכים הבאים! במשימה זו תלמד/י לבחור בין סמלים כדי לצבור מטבעות. נעבור יחד על המבנה של הניסוי.',
      en: 'Welcome! In this task you will learn to choose between symbols to collect coins. Let\'s walk through the structure together.',
    },
    'tutorial-stage1': {
      he: `בשלב 1, תראה/י שני סמלים טיבטיים (${STAGE1_STIMULI[0]} ו-${STAGE1_STIMULI[1]}). הקש/י על אחד מהם לבחירתך. יש לך 1.5 שניות לבחור.`,
      en: `In Stage 1, you'll see two Tibetan symbols (${STAGE1_STIMULI[0]} and ${STAGE1_STIMULI[1]}). Tap one to make your choice. You have 1.5 seconds to choose.`,
    },
    'tutorial-transition': {
      he: `הבחירה שלך בשלב 1 תוביל אותך למצב סגול או מצב טורקיז בשלב 2. כל סמל מוביל בדרך כלל (70%) למצב מסוים, אך לפעמים (30%) למצב השני.`,
      en: `Your Stage 1 choice will lead to a purple or cyan state in Stage 2. Each symbol usually (70%) leads to a specific state, but sometimes (30%) to the other.`,
    },
    'tutorial-stage2': {
      he: `בשלב 2, תראה/י שני סמלים חדשים על רקע צבעוני. הקש/י על אחד מהם. לכל סמל יש סיכוי שונה לזכייה.`,
      en: `In Stage 2, you'll see two new symbols on a colored background. Tap one. Each symbol has a different chance of winning.`,
    },
    'tutorial-reward': {
      he: 'אם זכית — יופיע מטבע! הסיכויים לזכייה משתנים לאט לאורך הניסוי, כך שכדאי לעקוב אחר מה שעובד.',
      en: 'If you win — a coin appears! The winning chances slowly change over time, so keep track of what works.',
    },
    'tutorial-strategy': {
      he: `עכשיו נתרגל ${PRACTICE_TRIALS} ניסיונות. נסה/י לחשוב הן על מה שקורה בשלב 2, והן על המעברים בין השלבים. בהצלחה!`,
      en: `Now let's practice ${PRACTICE_TRIALS} trials. Try to think about both what happens in Stage 2 and the transitions between stages. Good luck!`,
    },
  };

  const tutorialOrder: Phase[] = ['tutorial-welcome', 'tutorial-stage1', 'tutorial-transition', 'tutorial-stage2', 'tutorial-reward', 'tutorial-strategy'];

  const advanceTutorial = () => {
    const currentIndex = tutorialOrder.indexOf(phase);
    if (currentIndex < tutorialOrder.length - 1) {
      setPhase(tutorialOrder[currentIndex + 1]);
    } else {
      setPhase('stage1');
    }
  };

  // Tutorial screens
  if (phase.startsWith('tutorial-')) {
    const content = tutorialContent[phase];
    return (
      <div className="bg-[#0f172a] flex items-center justify-center px-4" style={{ height: '100dvh' }} dir={isHe ? 'rtl' : 'ltr'}>
        <motion.div
          key={phase}
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="max-w-sm text-center flex flex-col items-center gap-6"
        >
          {phase === 'tutorial-stage1' && (
            <div className="flex gap-6 mb-2">
              {STAGE1_STIMULI.map((s, i) => (
                <div key={i} className="w-20 h-20 bg-gray-800 border-2 border-gray-600 rounded-2xl flex items-center justify-center text-4xl text-white">
                  {s}
                </div>
              ))}
            </div>
          )}

          {phase === 'tutorial-transition' && (
            <div className="flex gap-6 mb-2">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-sm font-bold text-white" style={{ background: STATE_COLORS.A.bg }}>
                {isHe ? 'סגול' : 'Purple'}
              </div>
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-sm font-bold text-white" style={{ background: STATE_COLORS.B.bg }}>
                {isHe ? 'טורקיז' : 'Cyan'}
              </div>
            </div>
          )}

          {phase === 'tutorial-stage2' && (
            <div className="flex gap-8 mb-2">
              <div className="flex flex-col items-center gap-2">
                <div className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl text-white" style={{ background: STATE_COLORS.A.bg }}>
                  {STAGE2A_STIMULI[0]}
                </div>
                <div className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl text-white" style={{ background: STATE_COLORS.A.bg }}>
                  {STAGE2A_STIMULI[1]}
                </div>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl text-white" style={{ background: STATE_COLORS.B.bg }}>
                  {STAGE2B_STIMULI[0]}
                </div>
                <div className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl text-white" style={{ background: STATE_COLORS.B.bg }}>
                  {STAGE2B_STIMULI[1]}
                </div>
              </div>
            </div>
          )}

          {phase === 'tutorial-reward' && (
            <div className="text-6xl mb-2">🪙</div>
          )}

          <p className="text-white text-base leading-relaxed px-2">
            {isHe ? content.he : content.en}
          </p>

          <button
            onPointerDown={e => { e.preventDefault(); advanceTutorial(); }}
            className="px-10 py-4 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-xl text-lg transition-colors touch-manipulation shadow-lg"
          >
            {isHe ? 'המשך' : 'Continue'}
          </button>
        </motion.div>
      </div>
    );
  }

  if (!trial) {
    return <div className="bg-[#0f172a] flex items-center justify-center" style={{ height: '100dvh' }}><p className="text-gray-400">Loading…</p></div>;
  }

  const progress = (idx / PRACTICE_TRIALS) * 100;
  const stateColor = stage2State ? STATE_COLORS[stage2State] : null;

  return (
    <div className="bg-[#0f172a] flex flex-col select-none" style={{ height: '100dvh' }}>
      {/* Progress */}
      <div className="flex-shrink-0 h-6">
        <div className="h-1.5 bg-gray-800">
          <motion.div className="h-full bg-emerald-500" animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }} />
        </div>
        <div className="flex justify-between items-center px-4 pt-0.5">
          <span className="text-xs text-emerald-400 font-medium">{isHe ? 'תרגול' : 'Practice'}</span>
          <span className="text-xs text-gray-500">{idx + 1} / {PRACTICE_TRIALS}</span>
          <span className="text-xs text-yellow-400">🪙 {coins}</span>
        </div>
      </div>

      {/* Center */}
      <div className="flex-1 flex flex-col items-center justify-center overflow-hidden px-4">

        {/* ISI */}
        {phase === 'isi' && (
          <div className="text-white text-6xl font-thin">+</div>
        )}

        {/* Stage 1 */}
        {(phase === 'stage1' || phase === 'stage1-highlight') && (
          <div className="flex flex-col items-center gap-6">
            <p className="text-gray-400 text-sm">{isHe ? 'שלב 1 — בחר/י סמל' : 'Stage 1 — Choose a symbol'}</p>
            <div className="flex gap-6">
              {(['left', 'right'] as const).map(side => {
                const sym = STAGE1_STIMULI[side === 'left' ? 0 : 1];
                const selected = stage1Choice === side;
                return (
                  <button
                    key={side}
                    onPointerDown={e => { e.preventDefault(); handleStage1(side); }}
                    disabled={phase !== 'stage1'}
                    className={`w-24 h-24 rounded-2xl text-5xl flex items-center justify-center transition-all touch-manipulation shadow-lg
                      ${selected
                        ? 'bg-emerald-500/30 border-2 border-emerald-400 scale-110'
                        : 'bg-gray-800 border-2 border-gray-600 hover:border-gray-400 active:scale-95'
                      }`}
                  >
                    {sym}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Transition */}
        {phase === 'transition' && stateColor && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-4"
          >
            <p className="text-gray-400 text-sm">
              {transitionType === 'common'
                ? (isHe ? 'מעבר רגיל' : 'Common transition')
                : (isHe ? 'מעבר נדיר!' : 'Rare transition!')}
            </p>
            <div className="rounded-2xl p-8 flex gap-6" style={{ background: stateColor.bgLight, border: `2px solid ${stateColor.border}` }}>
              {(stage2State === 'A' ? STAGE2A_STIMULI : STAGE2B_STIMULI).map((sym, i) => (
                <div key={i} className="w-20 h-20 rounded-xl flex items-center justify-center text-4xl text-white" style={{ background: stateColor.bg }}>
                  {sym}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Stage 2 */}
        {(phase === 'stage2' || phase === 'stage2-highlight') && stateColor && (
          <div className="flex flex-col items-center gap-6">
            <p className="text-gray-400 text-sm">{isHe ? 'שלב 2 — בחר/י סמל' : 'Stage 2 — Choose a symbol'}</p>
            <div className="rounded-2xl p-8 flex gap-6" style={{ background: stateColor.bgLight, border: `2px solid ${stateColor.border}` }}>
              {(['left', 'right'] as const).map(side => {
                const stimuli = stage2State === 'A' ? STAGE2A_STIMULI : STAGE2B_STIMULI;
                const sym = stimuli[side === 'left' ? 0 : 1];
                const selected = stage2Choice === side;
                return (
                  <button
                    key={side}
                    onPointerDown={e => { e.preventDefault(); handleStage2(side); }}
                    disabled={phase !== 'stage2'}
                    className={`w-24 h-24 rounded-xl text-5xl flex items-center justify-center transition-all touch-manipulation shadow-lg
                      ${selected
                        ? 'scale-110 ring-4 ring-emerald-400'
                        : 'hover:scale-105 active:scale-95'
                      }`}
                    style={{ background: stateColor.bg }}
                  >
                    {sym}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Reward */}
        {phase === 'reward' && (
          <motion.div
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="flex flex-col items-center gap-4"
          >
            {rewarded ? (
              <>
                <div className="text-7xl">🪙</div>
                <p className="text-yellow-400 text-xl font-bold">{isHe ? '!זכית' : 'You win!'}</p>
              </>
            ) : (
              <>
                <div className="text-7xl opacity-20">🪙</div>
                <p className="text-gray-500 text-xl">{isHe ? 'לא הפעם' : 'No reward'}</p>
              </>
            )}
          </motion.div>
        )}

        {/* Feedback */}
        <AnimatePresence>
          {phase === 'feedback' && (
            <motion.div
              key={`fb-${idx}`}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center gap-4"
            >
              {missed ? (
                <p className="text-red-400 text-xl font-bold">{isHe ? 'איטי מדי!' : 'Too slow!'}</p>
              ) : rewarded ? (
                <p className="text-yellow-400 text-lg">{isHe ? 'כל הכבוד! קיבלת מטבע' : 'Great! You earned a coin'}</p>
              ) : (
                <p className="text-gray-400 text-lg">{isHe ? 'אין מטבע הפעם. נסה/י שוב' : 'No coin this time. Try again'}</p>
              )}
              {transitionType && (
                <p className="text-gray-500 text-sm">
                  {isHe ? `מעבר: ${transitionType === 'common' ? 'רגיל' : 'נדיר'}` : `Transition: ${transitionType}`}
                </p>
              )}
              <button
                onPointerDown={e => { e.preventDefault(); nextTrial(); }}
                className="mt-2 px-10 py-4 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-xl text-lg transition-colors touch-manipulation shadow-lg"
              >
                {isHe ? 'המשך' : 'Next'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
