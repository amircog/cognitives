'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { getSupabase } from '@/lib/supabase';
import {
  getConditionAssignment, shuffle, scoreResponse,
  STUDY_BLANK_MS, STUDY_DISPLAY_MS,
  RESTUDY_DISPLAY_MS, RESTUDY_BLANK_MS,
  RETRIEVAL_TIMEOUT_MS, RETRIEVAL_FEEDBACK_MS, RETRIEVAL_BLANK_MS,
} from '@/lib/testing-effect/stimuli';
import { Condition, CounterbalanceGroup, TrialResult } from '@/types/testing-effect';

type Step = 'landing' | 'study-intro' | 'study' | 'practice-intro' | 'practice' | 'saving';
type StudyPhase = 'blank' | 'display' | 'iti';
type PracticePhase = 'display' | 'response' | 'feedback' | 'iti';

interface StudyTrial { cue: string; target: string; condition: Condition }
interface PracticeTrial { cue: string; target: string; condition: Condition; trialType: 'restudy' | 'retrieval' }

const STUDY_TOTAL = 36;
const PRACTICE_ROUND_SIZE = 24;
const PRACTICE_TOTAL = 48;

export default function Session1Page() {
  const router = useRouter();

  const [step, setStep] = useState<Step>('landing');
  const [name, setName] = useState('');
  const [language, setLanguage] = useState<'en' | 'he'>('he');
  const [group, setGroup] = useState<CounterbalanceGroup>(1);
  const [sessionId, setSessionId] = useState('');

  // Study
  const [studyTrials, setStudyTrials] = useState<StudyTrial[]>([]);
  const [studyIdx, setStudyIdx] = useState(0);
  const [studyPhase, setStudyPhase] = useState<StudyPhase>('blank');

  // Practice
  const [practiceRound, setPracticeRound] = useState(1);
  const [practiceTrials, setPracticeTrials] = useState<PracticeTrial[]>([]);
  const [practiceIdx, setPracticeIdx] = useState(0);
  const [practicePhase, setPracticePhase] = useState<PracticePhase>('display');
  const [typedResponse, setTypedResponse] = useState('');
  const [lastCorrect, setLastCorrect] = useState(false);
  const [lastTarget, setLastTarget] = useState('');

  const responseOnsetRef = useRef(0);
  const practiceItemsRef = useRef<PracticeTrial[]>([]);
  const resultsRef = useRef<TrialResult[]>([]);
  const submittedRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isHe = language === 'he';

  const initTrials = useCallback((g: CounterbalanceGroup) => {
    const assignment = getConditionAssignment(g);
    setStudyTrials(shuffle(
      assignment.flatMap(({ condition, pairs }) =>
        pairs.map(p => ({ cue: p.cue, target: p.target, condition }))
      )
    ));
    const items: PracticeTrial[] = assignment
      .filter(a => a.condition !== 'baseline')
      .flatMap(({ condition, pairs }) =>
        pairs.map(p => ({
          cue: p.cue, target: p.target, condition,
          trialType: condition === 'restudy' ? 'restudy' as const : 'retrieval' as const,
        }))
      );
    practiceItemsRef.current = items;
    setPracticeTrials(shuffle(items));
  }, []);

  const handleStart = () => {
    if (!name.trim()) return;
    const g = (Math.floor(Math.random() * 3) + 1) as CounterbalanceGroup;
    const sid = crypto.randomUUID();
    setGroup(g);
    setSessionId(sid);
    sessionStorage.setItem('te_name', name.trim());
    sessionStorage.setItem('te_language', language);
    sessionStorage.setItem('te_session_id', sid);
    sessionStorage.setItem('te_group', String(g));
    initTrials(g);
    setStep('study-intro');
  };

  // ── Study timer ──
  useEffect(() => {
    if (step !== 'study') return;
    const durations: Record<StudyPhase, number> = {
      blank: STUDY_BLANK_MS, display: STUDY_DISPLAY_MS, iti: STUDY_BLANK_MS,
    };
    const timer = setTimeout(() => {
      if (studyPhase === 'blank') setStudyPhase('display');
      else if (studyPhase === 'display') setStudyPhase('iti');
      else {
        if (studyIdx + 1 >= studyTrials.length) setStep('practice-intro');
        else { setStudyIdx(i => i + 1); setStudyPhase('blank'); }
      }
    }, durations[studyPhase]);
    return () => clearTimeout(timer);
  }, [step, studyPhase, studyIdx, studyTrials.length]);

  // ── Practice helpers ──
  const saveAndFinish = useCallback(async () => {
    setStep('saving');
    try {
      const supabase = getSupabase();
      if (supabase) {
        const all = resultsRef.current;
        for (let i = 0; i < all.length; i += 500) {
          await supabase.from('testing_effect_results').insert(all.slice(i, i + 500));
        }
      }
    } catch (e) { console.error('Save error:', e); }
    sessionStorage.setItem('te_session', '1');
    router.push('/testingEffect/thanks');
  }, [router]);

  const advancePractice = useCallback(() => {
    const currentTrial = practiceTrials[practiceIdx];
    if (currentTrial?.trialType === 'restudy') {
      resultsRef.current.push({
        session_id: sessionId, participant_name: name.trim(),
        counterbalance_group: group, session_number: 1,
        phase: 'practice', practice_round: practiceRound,
        trial_index: practiceIdx, cue: currentTrial.cue,
        target: currentTrial.target, condition: currentTrial.condition,
        trial_type: 'restudy', response: null, is_correct: null, reaction_time_ms: null,
      });
    }

    const nextIdx = practiceIdx + 1;
    if (nextIdx >= practiceTrials.length) {
      if (practiceRound === 1) {
        let newTrials = shuffle([...practiceItemsRef.current]);
        const lastCue = practiceTrials[practiceTrials.length - 1]?.cue;
        let attempts = 0;
        while (newTrials[0]?.cue === lastCue && attempts < 20) {
          newTrials = shuffle([...practiceItemsRef.current]);
          attempts++;
        }
        setPracticeRound(2);
        setPracticeTrials(newTrials);
        setPracticeIdx(0);
        setTypedResponse('');
        submittedRef.current = false;
        setPracticePhase(newTrials[0].trialType === 'restudy' ? 'display' : 'response');
      } else {
        saveAndFinish();
      }
    } else {
      const nextTrial = practiceTrials[nextIdx];
      setPracticeIdx(nextIdx);
      setTypedResponse('');
      submittedRef.current = false;
      setPracticePhase(nextTrial.trialType === 'restudy' ? 'display' : 'response');
    }
  }, [practiceTrials, practiceIdx, practiceRound, sessionId, name, group, saveAndFinish]);

  const handlePracticeSubmit = useCallback((response: string) => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    const trial = practiceTrials[practiceIdx];
    if (!trial) return;
    const rt = Math.round(performance.now() - responseOnsetRef.current);
    const correct = scoreResponse(response, trial.target);
    setLastCorrect(correct);
    setLastTarget(trial.target);
    resultsRef.current.push({
      session_id: sessionId, participant_name: name.trim(),
      counterbalance_group: group, session_number: 1,
      phase: 'practice', practice_round: practiceRound,
      trial_index: practiceIdx, cue: trial.cue,
      target: trial.target, condition: trial.condition,
      trial_type: 'retrieval', response, is_correct: correct, reaction_time_ms: rt,
    });
    setPracticePhase('feedback');
  }, [practiceTrials, practiceIdx, sessionId, name, group, practiceRound]);

  // ── Practice timer ──
  useEffect(() => {
    if (step !== 'practice') return;
    const trial = practiceTrials[practiceIdx];
    if (!trial) return;

    let timer: ReturnType<typeof setTimeout> | null = null;

    if (trial.trialType === 'restudy' && practicePhase === 'display') {
      timer = setTimeout(() => setPracticePhase('iti'), RESTUDY_DISPLAY_MS);
    } else if (trial.trialType === 'retrieval' && practicePhase === 'response') {
      responseOnsetRef.current = performance.now();
      submittedRef.current = false;
      timer = setTimeout(() => handlePracticeSubmit(''), RETRIEVAL_TIMEOUT_MS);
    } else if (practicePhase === 'feedback') {
      timer = setTimeout(() => setPracticePhase('iti'), RETRIEVAL_FEEDBACK_MS);
    } else if (practicePhase === 'iti') {
      const ms = trial.trialType === 'restudy' ? RESTUDY_BLANK_MS : RETRIEVAL_BLANK_MS;
      timer = setTimeout(advancePractice, ms);
    }

    return () => { if (timer) clearTimeout(timer); };
  }, [step, practicePhase, practiceIdx, practiceTrials, handlePracticeSubmit, advancePractice]);

  useEffect(() => {
    if (step === 'practice' && practicePhase === 'response') {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [step, practicePhase, practiceIdx]);

  const studyTrial = studyTrials[studyIdx];
  const practiceTrial = practiceTrials[practiceIdx];
  const practiceProgress = ((practiceRound - 1) * PRACTICE_ROUND_SIZE + practiceIdx) / PRACTICE_TOTAL * 100;

  const t = isHe ? {
    title: 'אפקט הבחינה — חלק 1',
    nameLabel: 'שמך', namePH: 'הזן את שמך', start: 'התחל', toggle: 'English',
    studyIntroTitle: 'שלב הלמידה',
    studyIntro: [
      'כעת יוצגו בפניך זוגות של מילים — מילה בדויה ומילה באנגלית.',
      'נסה לזכור איזו מילה באנגלית שייכת לכל מילה בדויה.',
      'תיבחן על כך מאוחר יותר.',
    ],
    begin: 'התחל',
    practiceIntroTitle: 'שלב התרגול',
    practiceIntro: [
      'חלק מהזוגות יופיעו שוב.',
      'לפעמים תראה את הזוג המלא שוב.',
      'לפעמים תראה רק את המילה הבדויה ותצטרך להקליד את המילה באנגלית.',
      'אם אינך בטוח — נחש.',
    ],
    continue: 'המשך',
    typeAnswer: 'הקלד את המילה באנגלית:',
    submit: 'שלח',
    correct: '✓ נכון!', incorrect: '✗ לא נכון',
    theAnswer: 'התשובה:', saving: 'שומר...',
    round: 'סבב', study: 'למידה', practice: 'תרגול',
  } : {
    title: 'The Testing Effect — Session 1',
    nameLabel: 'Your name', namePH: 'Enter your name', start: 'Start', toggle: 'עברית',
    studyIntroTitle: 'Study Phase',
    studyIntro: [
      'You will see pairs of words — a made-up word and an English word.',
      'Try to remember which English word goes with each made-up word.',
      'You will be tested later.',
    ],
    begin: 'Start',
    practiceIntroTitle: 'Practice Phase',
    practiceIntro: [
      'Some pairs will now appear again.',
      'Sometimes you will see the full pair again.',
      'Sometimes you will see only the made-up word and will need to type the English word.',
      'If you are unsure, guess.',
    ],
    continue: 'Continue',
    typeAnswer: 'Type the English word:',
    submit: 'Submit',
    correct: '✓ Correct!', incorrect: '✗ Incorrect',
    theAnswer: 'The answer:', saving: 'Saving...',
    round: 'Round', study: 'Study', practice: 'Practice',
  };

  // ── Landing ──
  if (step === 'landing') {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center px-4 py-8" dir={isHe ? 'rtl' : 'ltr'}>
        <div className="w-full max-w-md">
          <div className="flex justify-end mb-6">
            <button onClick={() => setLanguage(l => l === 'en' ? 'he' : 'en')}
              className="px-3 py-1.5 text-sm text-orange-400 border border-orange-400/40 rounded-lg hover:bg-orange-400/10 transition-colors">
              {t.toggle}
            </button>
          </div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-gray-900 border border-gray-700 rounded-2xl p-8 flex flex-col gap-6">
            <h1 className="text-2xl font-bold text-white text-center">{t.title}</h1>
            <div className="flex flex-col gap-1">
              <label className="text-gray-400 text-sm">{t.nameLabel}</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleStart()} placeholder={t.namePH}
                className="px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-400 transition-colors" />
            </div>
            <button onPointerDown={e => { e.preventDefault(); handleStart(); }}
              className="w-full py-4 bg-orange-500 hover:bg-orange-400 text-white font-bold rounded-xl text-lg transition-colors touch-manipulation shadow-lg">
              {t.start}
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  // ── Study Instructions ──
  if (step === 'study-intro') {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center px-4 py-8" dir={isHe ? 'rtl' : 'ltr'}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-gray-900 border border-gray-700 rounded-2xl p-8 flex flex-col gap-6 max-w-md w-full">
          <h2 className="text-xl font-bold text-white text-center">{t.studyIntroTitle}</h2>
          <ul className="flex flex-col gap-2">
            {t.studyIntro.map((line, i) => (
              <li key={i} className="flex gap-2 text-gray-300 text-sm leading-relaxed">
                <span className="text-orange-400 font-bold mt-0.5">•</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <button onPointerDown={e => { e.preventDefault(); setStep('study'); }}
            className="w-full py-4 bg-orange-500 hover:bg-orange-400 text-white font-bold rounded-xl text-lg transition-colors touch-manipulation shadow-lg">
            {t.begin}
          </button>
        </motion.div>
      </div>
    );
  }

  // ── Study Phase ──
  if (step === 'study') {
    const progress = (studyIdx / STUDY_TOTAL) * 100;
    return (
      <div className="bg-[#0f172a] flex flex-col select-none" style={{ height: '100dvh' }}>
        <div className="flex-shrink-0 h-6">
          <div className="h-1.5 bg-gray-800">
            <motion.div className="h-full bg-orange-500" animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }} />
          </div>
          <div className="flex justify-between items-center px-4 pt-0.5">
            <span className="text-xs text-orange-400 font-medium">{t.study}</span>
            <span className="text-xs text-gray-500">{studyIdx + 1} / {STUDY_TOTAL}</span>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center overflow-hidden px-4">
          {(studyPhase === 'blank' || studyPhase === 'iti') && (
            <div className="text-white text-6xl font-thin">+</div>
          )}
          {studyPhase === 'display' && studyTrial && (
            <div className="text-center">
              <span className="text-3xl font-bold text-white" style={{ fontFamily: 'monospace' }}>
                {studyTrial.cue}
              </span>
              <span className="text-3xl text-gray-500 mx-4">—</span>
              <span className="text-3xl font-bold text-orange-400" style={{ fontFamily: 'monospace' }}>
                {studyTrial.target}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Practice Instructions ──
  if (step === 'practice-intro') {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center px-4 py-8" dir={isHe ? 'rtl' : 'ltr'}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-gray-900 border border-gray-700 rounded-2xl p-8 flex flex-col gap-6 max-w-md w-full">
          <h2 className="text-xl font-bold text-white text-center">{t.practiceIntroTitle}</h2>
          <ul className="flex flex-col gap-2">
            {t.practiceIntro.map((line, i) => (
              <li key={i} className="flex gap-2 text-gray-300 text-sm leading-relaxed">
                <span className="text-orange-400 font-bold mt-0.5">•</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <button onPointerDown={e => {
            e.preventDefault();
            const first = practiceTrials[0];
            setPracticePhase(first?.trialType === 'restudy' ? 'display' : 'response');
            setStep('practice');
          }}
            className="w-full py-4 bg-orange-500 hover:bg-orange-400 text-white font-bold rounded-xl text-lg transition-colors touch-manipulation shadow-lg">
            {t.continue}
          </button>
        </motion.div>
      </div>
    );
  }

  // ── Practice Phase ──
  if (step === 'practice') {
    return (
      <div className="bg-[#0f172a] flex flex-col select-none" style={{ height: '100dvh' }} dir={isHe ? 'rtl' : 'ltr'}>
        <div className="flex-shrink-0 h-6">
          <div className="h-1.5 bg-gray-800">
            <motion.div className="h-full bg-orange-500" animate={{ width: `${practiceProgress}%` }} transition={{ duration: 0.4 }} />
          </div>
          <div className="flex justify-between items-center px-4 pt-0.5">
            <span className="text-xs text-orange-400 font-medium">{t.practice} — {t.round} {practiceRound}</span>
            <span className="text-xs text-gray-500">{practiceIdx + 1} / {PRACTICE_ROUND_SIZE}</span>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center overflow-hidden px-4">
          {practiceTrial && practicePhase === 'display' && practiceTrial.trialType === 'restudy' && (
            <div className="text-center">
              <span className="text-3xl font-bold text-white" style={{ fontFamily: 'monospace' }}>
                {practiceTrial.cue}
              </span>
              <span className="text-3xl text-gray-500 mx-4">—</span>
              <span className="text-3xl font-bold text-orange-400" style={{ fontFamily: 'monospace' }}>
                {practiceTrial.target}
              </span>
            </div>
          )}

          <AnimatePresence>
            {practiceTrial && practicePhase === 'response' && practiceTrial.trialType === 'retrieval' && (
              <motion.div key={`resp-${practiceRound}-${practiceIdx}`}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center gap-6 w-full max-w-sm">
                <div className="text-center">
                  <span className="text-3xl font-bold text-white" style={{ fontFamily: 'monospace' }}>
                    {practiceTrial.cue}
                  </span>
                  <span className="text-3xl text-gray-500 mx-4">— ?</span>
                </div>
                <p className="text-gray-400 text-sm">{t.typeAnswer}</p>
                <input ref={inputRef} type="text" value={typedResponse}
                  onChange={e => setTypedResponse(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handlePracticeSubmit(typedResponse); }}
                  autoFocus autoComplete="off" autoCorrect="off" spellCheck={false}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white text-center text-xl placeholder-gray-500 focus:outline-none focus:border-orange-400 transition-colors"
                  style={{ fontFamily: 'monospace' }} />
                <button onPointerDown={e => { e.preventDefault(); handlePracticeSubmit(typedResponse); }}
                  className="px-10 py-3 bg-orange-500 hover:bg-orange-400 text-white font-bold rounded-xl transition-colors touch-manipulation shadow-lg">
                  {t.submit}
                </button>
              </motion.div>
            )}

            {practicePhase === 'feedback' && (
              <motion.div key={`fb-${practiceRound}-${practiceIdx}`}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center gap-4">
                <p className={`text-2xl font-bold ${lastCorrect ? 'text-green-400' : 'text-red-400'}`}>
                  {lastCorrect ? t.correct : t.incorrect}
                </p>
                <p className="text-gray-300 text-lg">
                  {t.theAnswer}{' '}
                  <span className="text-orange-400 font-bold" style={{ fontFamily: 'monospace' }}>{lastTarget}</span>
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {practicePhase === 'iti' && (
            <div className="text-white text-6xl font-thin">+</div>
          )}
        </div>
      </div>
    );
  }

  // ── Saving ──
  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
      <p className="text-gray-400 text-lg">{t.saving}</p>
    </div>
  );
}
