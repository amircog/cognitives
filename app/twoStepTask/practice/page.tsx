'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  STAGE1_STIMULI, STAGE2A_STIMULI, STAGE2B_STIMULI,
  STATE_COLORS, STAGE1_COLOR,
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
  | 'transition'
  | 'stage2'
  | 'stage2-highlight'
  | 'reward'
  | 'isi'
  | 'feedback';

const STIM_SIZE = 'w-24 h-24';
const STIM_TEXT = 'text-5xl';

export default function TwoStepPractice() {
  const router = useRouter();
  const [language, setLanguage] = useState<'en' | 'he'>('he');
  const [phase, setPhase] = useState<Phase>('tutorial-welcome');
  const [trials, setTrials] = useState<TwoStepTrial[]>([]);
  const [idx, setIdx] = useState(0);
  const [coins, setCoins] = useState(0);

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

  useEffect(() => {
    if (!trial) return;
    clearTimer();

    if (phase === 'stage1') {
      timerRef.current = setTimeout(() => {
        setMissed('stage1');
        setPhase('feedback');
      }, STAGE1_CHOICE_MS);
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
    const trans = getTransition(choice);
    setStage2State(trans.state);
    setTransitionType(trans.type);
    setPhase('transition');
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

  // ── Tutorial text (natural Hebrew) ────────────────────────────────
  const tutorialContent: Record<string, { he: string; en: string }> = {
    'tutorial-welcome': {
      he: 'ברוכים הבאים! במשימה הזו תצטרכו לבחור בין סמלים שונים כדי לאסוף כמה שיותר מטבעות. בואו נכיר את מבנה המשימה.',
      en: 'Welcome! In this task you will choose between symbols to collect coins. Let\'s walk through the structure together.',
    },
    'tutorial-stage1': {
      he: `בשלב הראשון מופיעים שני סמלים (${STAGE1_STIMULI[0]} ו-${STAGE1_STIMULI[1]}). הקישו על אחד מהם. יש לכם 2 שניות לבחור.`,
      en: `In Stage 1, you'll see two symbols (${STAGE1_STIMULI[0]} and ${STAGE1_STIMULI[1]}). Tap one to choose. You have 2 seconds.`,
    },
    'tutorial-transition': {
      he: 'הבחירה שלכם בשלב הראשון קובעת לאיזה מצב תגיעו בשלב השני — ורוד או כחול. כל סמל מוביל בדרך כלל (70%) למצב מסוים, אבל לפעמים (30%) למצב השני.',
      en: 'Your Stage 1 choice determines which state you reach in Stage 2 — pink or blue. Each symbol usually (70%) leads to one state, but sometimes (30%) to the other.',
    },
    'tutorial-stage2': {
      he: 'בשלב השני מופיעים שני סמלים חדשים על רקע צבעוני. הקישו על אחד מהם — לכל סמל סיכוי שונה לתת מטבע.',
      en: 'In Stage 2, you\'ll see two new symbols on a colored background. Tap one — each symbol has a different chance of giving a coin.',
    },
    'tutorial-reward': {
      he: 'אם זכיתם — מופיע מטבע! שימו לב: הסיכויים לזכייה משתנים לאט במהלך המשימה, אז כדאי לשים לב למה שעובד.',
      en: 'If you win — a coin appears! Note: the winning chances slowly change during the task, so pay attention to what works.',
    },
    'tutorial-strategy': {
      he: `עכשיו נתרגל ${PRACTICE_TRIALS} ניסיונות. נסו לחשוב גם על מה שקורה בשלב השני, וגם על המעברים בין השלבים. בהצלחה!`,
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
            <div className="rounded-2xl p-4 flex gap-6 mb-2" style={{ background: STAGE1_COLOR.bgLight, border: `2px solid ${STAGE1_COLOR.border}` }}>
              {STAGE1_STIMULI.map((s, i) => (
                <div key={i} className="w-20 h-20 rounded-xl flex items-center justify-center text-4xl text-white" style={{ background: STAGE1_COLOR.bg }}>
                  {s}
                </div>
              ))}
            </div>
          )}

          {phase === 'tutorial-transition' && (
            <div className="flex gap-6 mb-2">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-sm font-bold text-white" style={{ background: STATE_COLORS.A.bg }}>
                {isHe ? 'ורוד' : 'Pink'}
              </div>
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-sm font-bold text-white" style={{ background: STATE_COLORS.B.bg }}>
                {isHe ? 'כחול' : 'Blue'}
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
  const s1Sym = stage1Choice ? STAGE1_STIMULI[stage1Choice === 'left' ? 0 : 1] : null;
  const s2Stimuli = stage2State === 'A' ? STAGE2A_STIMULI : STAGE2B_STIMULI;

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

        {/* Stage 1: two clickable options */}
        {phase === 'stage1' && (
          <div className="flex flex-col items-center gap-6">
            <p className="text-gray-400 text-sm">{isHe ? 'שלב ראשון — בחרו סמל' : 'Stage 1 — Choose a symbol'}</p>
            <div className="rounded-2xl p-6 flex gap-6" style={{ background: STAGE1_COLOR.bgLight, border: `2px solid ${STAGE1_COLOR.border}` }}>
              {(['left', 'right'] as const).map(side => {
                const sym = STAGE1_STIMULI[side === 'left' ? 0 : 1];
                return (
                  <button
                    key={side}
                    onPointerDown={e => { e.preventDefault(); handleStage1(side); }}
                    className={`${STIM_SIZE} rounded-xl ${STIM_TEXT} flex items-center justify-center transition-all touch-manipulation shadow-lg text-white hover:scale-105 active:scale-95`}
                    style={{ background: STAGE1_COLOR.bg }}
                  >
                    {sym}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Transition: selected Stage 1 item above Stage 2 options (non-clickable) */}
        {phase === 'transition' && stateColor && s1Sym && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-4"
          >
            <p className="text-gray-400 text-sm">
              {transitionType === 'common'
                ? (isHe ? 'מעבר רגיל' : 'Common transition')
                : (isHe ? 'מעבר נדיר!' : 'Rare transition!')}
            </p>
            {/* Selected Stage 1 item */}
            <div
              className={`${STIM_SIZE} rounded-2xl ${STIM_TEXT} flex items-center justify-center border-2`}
              style={{ background: STAGE1_COLOR.bg, borderColor: STAGE1_COLOR.border }}
            >
              {s1Sym}
            </div>
            {/* Stage 2 options (not clickable) */}
            <div className="rounded-2xl p-6 flex gap-6" style={{ background: stateColor.bgLight, border: `2px solid ${stateColor.border}` }}>
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

        {/* Stage 2: clickable (no Stage 1 item) */}
        {(phase === 'stage2' || phase === 'stage2-highlight') && stateColor && (
          <div className="flex flex-col items-center gap-6">
            <p className="text-gray-400 text-sm">{isHe ? 'שלב שני — בחרו סמל' : 'Stage 2 — Choose a symbol'}</p>
            <div className="rounded-2xl p-6 flex gap-6" style={{ background: stateColor.bgLight, border: `2px solid ${stateColor.border}` }}>
              {(['left', 'right'] as const).map(side => {
                const sym = s2Stimuli[side === 'left' ? 0 : 1];
                const selected = stage2Choice === side;
                return (
                  <button
                    key={side}
                    onPointerDown={e => { e.preventDefault(); handleStage2(side); }}
                    disabled={phase !== 'stage2'}
                    className={`${STIM_SIZE} rounded-xl ${STIM_TEXT} flex items-center justify-center transition-all touch-manipulation shadow-lg text-white
                      ${selected ? 'scale-110 ring-4 ring-emerald-400' : 'hover:scale-105 active:scale-95'}`}
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
                <p className="text-yellow-400 text-xl font-bold">{isHe ? 'זכיתם!' : 'You win!'}</p>
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
                <p className="text-red-400 text-xl font-bold">{isHe ? 'לא הספקתם!' : 'Too slow!'}</p>
              ) : rewarded ? (
                <p className="text-yellow-400 text-lg">{isHe ? 'יופי! קיבלתם מטבע' : 'Great! You earned a coin'}</p>
              ) : (
                <p className="text-gray-400 text-lg">{isHe ? 'בלי מטבע הפעם' : 'No coin this time'}</p>
              )}
              {transitionType && (
                <p className="text-gray-500 text-sm">
                  {isHe ? `סוג מעבר: ${transitionType === 'common' ? 'רגיל' : 'נדיר'}` : `Transition: ${transitionType}`}
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
