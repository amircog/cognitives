'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { getSupabase } from '@/lib/supabase';
import {
  getConditionAssignment, shuffle, scoreResponse,
  TEST_FIXATION_MS, TEST_TIMEOUT_MS, TEST_BLANK_MS,
} from '@/lib/testing-effect/stimuli';
import { Condition, CounterbalanceGroup, TrialResult } from '@/types/testing-effect';

type Step = 'landing' | 'instructions' | 'test' | 'saving';
type TestPhase = 'fixation' | 'response' | 'iti';

interface TestTrial { cue: string; target: string; condition: Condition }

const TEST_TOTAL = 36;

export default function Session2Page() {
  const router = useRouter();

  const [step, setStep] = useState<Step>('landing');
  const [name, setName] = useState('');
  const [language, setLanguage] = useState<'en' | 'he'>('he');
  const [group, setGroup] = useState<CounterbalanceGroup>(1);
  const [sessionId, setSessionId] = useState('');
  const [nameError, setNameError] = useState(false);
  const [checking, setChecking] = useState(false);

  const [testTrials, setTestTrials] = useState<TestTrial[]>([]);
  const [testIdx, setTestIdx] = useState(0);
  const [testPhase, setTestPhase] = useState<TestPhase>('fixation');
  const [typedResponse, setTypedResponse] = useState('');

  const responseOnsetRef = useRef(0);
  const resultsRef = useRef<TrialResult[]>([]);
  const submittedRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isHe = language === 'he';

  const checkParticipant = async () => {
    if (!name.trim()) return;
    setChecking(true);
    setNameError(false);
    try {
      const supabase = getSupabase();
      if (!supabase) { setNameError(true); setChecking(false); return; }
      const { data } = await supabase
        .from('testing_effect_results')
        .select('counterbalance_group')
        .eq('participant_name', name.trim())
        .eq('session_number', 1)
        .limit(1);
      if (!data || data.length === 0) {
        setNameError(true);
        setChecking(false);
        return;
      }
      const g = data[0].counterbalance_group as CounterbalanceGroup;
      const sid = crypto.randomUUID();
      setGroup(g);
      setSessionId(sid);
      sessionStorage.setItem('te_name', name.trim());
      sessionStorage.setItem('te_language', language);
      sessionStorage.setItem('te_session_id_s2', sid);
      const assignment = getConditionAssignment(g);
      setTestTrials(shuffle(
        assignment.flatMap(({ condition, pairs }) =>
          pairs.map(p => ({ cue: p.cue, target: p.target, condition }))
        )
      ));
      setStep('instructions');
    } catch {
      setNameError(true);
    }
    setChecking(false);
  };

  // ── Test timer ──
  const handleTestSubmit = useCallback((response: string) => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    const trial = testTrials[testIdx];
    if (!trial) return;
    const rt = Math.round(performance.now() - responseOnsetRef.current);
    const correct = scoreResponse(response, trial.target);
    resultsRef.current.push({
      session_id: sessionId, participant_name: name.trim(),
      counterbalance_group: group, session_number: 2,
      phase: 'test', practice_round: null,
      trial_index: testIdx, cue: trial.cue,
      target: trial.target, condition: trial.condition,
      trial_type: 'test', response, is_correct: correct, reaction_time_ms: rt,
    });
    setTestPhase('iti');
  }, [testTrials, testIdx, sessionId, name, group]);

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
    sessionStorage.setItem('te_session', '2');
    sessionStorage.setItem('te_results_s2', JSON.stringify(resultsRef.current));
    router.push('/testingEffect/thanks');
  }, [router]);

  useEffect(() => {
    if (step !== 'test') return;
    let timer: ReturnType<typeof setTimeout> | null = null;

    if (testPhase === 'fixation') {
      timer = setTimeout(() => {
        responseOnsetRef.current = performance.now();
        submittedRef.current = false;
        setTestPhase('response');
      }, TEST_FIXATION_MS);
    } else if (testPhase === 'response') {
      timer = setTimeout(() => handleTestSubmit(''), TEST_TIMEOUT_MS);
    } else if (testPhase === 'iti') {
      timer = setTimeout(() => {
        if (testIdx + 1 >= testTrials.length) {
          saveAndFinish();
        } else {
          setTestIdx(i => i + 1);
          setTypedResponse('');
          submittedRef.current = false;
          setTestPhase('fixation');
        }
      }, TEST_BLANK_MS);
    }

    return () => { if (timer) clearTimeout(timer); };
  }, [step, testPhase, testIdx, testTrials.length, handleTestSubmit, saveAndFinish]);

  useEffect(() => {
    if (step === 'test' && testPhase === 'response') {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [step, testPhase, testIdx]);

  const testTrial = testTrials[testIdx];

  const t = isHe ? {
    title: 'אפקט הבחינה — חלק 2',
    nameLabel: 'שמך (כפי שהזנת בחלק 1)',
    namePH: 'הזן את שמך',
    check: 'המשך',
    toggle: 'English',
    nameErr: 'לא נמצאו נתונים מחלק 1 עבור שם זה. בדוק את האיות.',
    checking: 'בודק...',
    instrTitle: 'מבחן זיכרון',
    instrLines: [
      'בשיעור הקודם למדת מילים בדויות בזוגות עם מילים באנגלית.',
      'עבור כל מילה בדויה, הקלד את המילה באנגלית שהייתה בזוג איתה.',
      'אם אינך בטוח — נחש.',
      'אין להיעזר בחומרים חיצוניים.',
    ],
    begin: 'התחל',
    typeAnswer: 'הקלד את המילה באנגלית:',
    submit: 'שלח',
    saving: 'שומר...',
    test: 'מבחן',
  } : {
    title: 'The Testing Effect — Session 2',
    nameLabel: 'Your name (as entered in Session 1)',
    namePH: 'Enter your name',
    check: 'Continue',
    toggle: 'עברית',
    nameErr: 'No Session 1 data found for this name. Please check the spelling.',
    checking: 'Checking...',
    instrTitle: 'Memory Test',
    instrLines: [
      'Last lecture, you learned made-up words paired with English words.',
      'For each made-up word, type the English word that was paired with it.',
      'If you are unsure, please guess.',
      'Do not look anything up.',
    ],
    begin: 'Start',
    typeAnswer: 'Type the English word:',
    submit: 'Submit',
    saving: 'Saving...',
    test: 'Test',
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
              <input type="text" value={name} onChange={e => { setName(e.target.value); setNameError(false); }}
                onKeyDown={e => e.key === 'Enter' && checkParticipant()} placeholder={t.namePH}
                className={`px-4 py-3 bg-gray-800 border rounded-xl text-white placeholder-gray-500 focus:outline-none transition-colors ${nameError ? 'border-red-500' : 'border-gray-600 focus:border-orange-400'}`} />
              {nameError && <p className="text-red-400 text-sm mt-1">{t.nameErr}</p>}
            </div>
            <button onPointerDown={e => { e.preventDefault(); checkParticipant(); }} disabled={checking}
              className="w-full py-4 bg-orange-500 hover:bg-orange-400 disabled:opacity-60 text-white font-bold rounded-xl text-lg transition-colors touch-manipulation shadow-lg">
              {checking ? t.checking : t.check}
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  // ── Instructions ──
  if (step === 'instructions') {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center px-4 py-8" dir={isHe ? 'rtl' : 'ltr'}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-gray-900 border border-gray-700 rounded-2xl p-8 flex flex-col gap-6 max-w-md w-full">
          <h2 className="text-xl font-bold text-white text-center">{t.instrTitle}</h2>
          <ul className="flex flex-col gap-2">
            {t.instrLines.map((line, i) => (
              <li key={i} className="flex gap-2 text-gray-300 text-sm leading-relaxed">
                <span className="text-orange-400 font-bold mt-0.5">•</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <button onPointerDown={e => { e.preventDefault(); setStep('test'); }}
            className="w-full py-4 bg-orange-500 hover:bg-orange-400 text-white font-bold rounded-xl text-lg transition-colors touch-manipulation shadow-lg">
            {t.begin}
          </button>
        </motion.div>
      </div>
    );
  }

  // ── Test Phase ──
  if (step === 'test') {
    const progress = (testIdx / TEST_TOTAL) * 100;
    return (
      <div className="bg-[#0f172a] flex flex-col select-none" style={{ height: '100dvh' }} dir={isHe ? 'rtl' : 'ltr'}>
        <div className="flex-shrink-0 h-6">
          <div className="h-1.5 bg-gray-800">
            <motion.div className="h-full bg-orange-500" animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }} />
          </div>
          <div className="flex justify-between items-center px-4 pt-0.5">
            <span className="text-xs text-orange-400 font-medium">{t.test}</span>
            <span className="text-xs text-gray-500">{testIdx + 1} / {TEST_TOTAL}</span>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center overflow-hidden px-4">
          {testPhase === 'fixation' && (
            <div className="text-white text-6xl font-thin">+</div>
          )}

          <AnimatePresence>
            {testPhase === 'response' && testTrial && (
              <motion.div key={`test-${testIdx}`}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center gap-6 w-full max-w-sm">
                <div className="text-center">
                  <span className="text-3xl font-bold text-white" style={{ fontFamily: 'monospace' }}>
                    {testTrial.cue}
                  </span>
                  <span className="text-3xl text-gray-500 mx-4">— ?</span>
                </div>
                <p className="text-gray-400 text-sm">{t.typeAnswer}</p>
                <input ref={inputRef} type="text" value={typedResponse}
                  onChange={e => setTypedResponse(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleTestSubmit(typedResponse); }}
                  autoFocus autoComplete="off" autoCorrect="off" spellCheck={false}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white text-center text-xl placeholder-gray-500 focus:outline-none focus:border-orange-400 transition-colors"
                  style={{ fontFamily: 'monospace' }} />
                <button onPointerDown={e => { e.preventDefault(); handleTestSubmit(typedResponse); }}
                  className="px-10 py-3 bg-orange-500 hover:bg-orange-400 text-white font-bold rounded-xl transition-colors touch-manipulation shadow-lg">
                  {t.submit}
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {testPhase === 'iti' && (
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
