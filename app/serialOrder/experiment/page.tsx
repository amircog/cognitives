'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  STUDY_LIST_1,
  STUDY_LIST_2,
  FIXATION_MS,
  WORD_DISPLAY_MS,
  BLANK_MS,
  DISTRACTOR_DURATION_MS,
  RECALL_DURATION_MS,
  generateArithmeticProblem,
  matchResponse,
} from '@/lib/serial-order/stimuli';
import { DistractorResult, RecallResponse, StudyEvent } from '@/types/serial-order';
import { getSupabase } from '@/lib/supabase';

type ExperimentPhase = 'study' | 'distractor' | 'recall' | 'transition' | 'saving';
type StudySubPhase = 'fixation' | 'word' | 'blank';

export default function SerialOrderExperiment() {
  const router = useRouter();
  const [language, setLanguage] = useState<'en' | 'he'>('he');
  const [sessionNum, setSessionNum] = useState(1);
  const [expPhase, setExpPhase] = useState<ExperimentPhase>('study');

  // Study phase state
  const [wordIdx, setWordIdx] = useState(0);
  const [studySubPhase, setStudySubPhase] = useState<StudySubPhase>('fixation');
  const studyEventsRef = useRef<StudyEvent[]>([]);

  // Distractor phase state
  const [currentProblem, setCurrentProblem] = useState(generateArithmeticProblem());
  const [distractorAnswer, setDistractorAnswer] = useState('');
  const [distractorTimeLeft, setDistractorTimeLeft] = useState(DISTRACTOR_DURATION_MS / 1000);
  const distractorResultsRef = useRef<DistractorResult[]>([]);
  const distractorStartRef = useRef<number>(0);
  const problemOnsetRef = useRef<number>(0);

  // Recall phase state
  const [recallText, setRecallText] = useState('');
  const recallTextRef = useRef('');
  const [recallTimeLeft, setRecallTimeLeft] = useState(RECALL_DURATION_MS / 1000);

  const sessionId = useRef('');
  const participantName = useRef<string | null>(null);

  // Accumulated results across sessions
  const allRecallRef = useRef<RecallResponse[]>([]);

  const currentList = sessionNum === 1 ? STUDY_LIST_1 : STUDY_LIST_2;

  useEffect(() => {
    const lang = sessionStorage.getItem('so_language') as 'en' | 'he' | null;
    if (lang) setLanguage(lang);
    sessionId.current = sessionStorage.getItem('so_session_id') ?? crypto.randomUUID();
    participantName.current = sessionStorage.getItem('so_participant_name');
  }, []);

  const isHe = language === 'he';

  // ── Study phase timing ──────────────────────────────────────────────────────
  useEffect(() => {
    if (expPhase !== 'study') return;
    if (wordIdx >= currentList.length) {
      if (sessionNum === 1) {
        setExpPhase('distractor');
        distractorStartRef.current = Date.now();
        problemOnsetRef.current = performance.now();
      } else {
        // Session 2: immediate recall, no distractor
        setExpPhase('recall');
      }
      return;
    }

    const durations: Record<StudySubPhase, number> = {
      fixation: FIXATION_MS,
      word: WORD_DISPLAY_MS,
      blank: BLANK_MS,
    };

    const timer = setTimeout(() => {
      if (studySubPhase === 'fixation') {
        studyEventsRef.current.push({
          session_id: sessionId.current,
          participant_name: participantName.current,
          session_number: sessionNum,
          serial_position: currentList[wordIdx].serial_position,
          word: currentList[wordIdx].word,
          word_onset_time: new Date().toISOString(),
          word_offset_time: '',
        });
        setStudySubPhase('word');
      } else if (studySubPhase === 'word') {
        const lastEvent = studyEventsRef.current[studyEventsRef.current.length - 1];
        if (lastEvent) lastEvent.word_offset_time = new Date().toISOString();
        setStudySubPhase('blank');
      } else {
        setWordIdx(i => i + 1);
        setStudySubPhase('fixation');
      }
    }, durations[studySubPhase]);

    return () => clearTimeout(timer);
  }, [expPhase, wordIdx, studySubPhase, sessionNum, currentList]);

  // ── Distractor countdown ────────────────────────────────────────────────────
  useEffect(() => {
    if (expPhase !== 'distractor') return;
    const interval = setInterval(() => {
      const elapsed = (Date.now() - distractorStartRef.current) / 1000;
      const remaining = Math.max(0, DISTRACTOR_DURATION_MS / 1000 - elapsed);
      setDistractorTimeLeft(Math.ceil(remaining));
      if (remaining <= 0) {
        clearInterval(interval);
        setExpPhase('recall');
      }
    }, 250);
    return () => clearInterval(interval);
  }, [expPhase]);

  // ── Recall countdown ────────────────────────────────────────────────────────
  const recallStartRef = useRef<number>(0);
  useEffect(() => {
    if (expPhase !== 'recall') return;
    recallStartRef.current = Date.now();
    setRecallTimeLeft(RECALL_DURATION_MS / 1000);
    const interval = setInterval(() => {
      const elapsed = (Date.now() - recallStartRef.current) / 1000;
      const remaining = Math.max(0, RECALL_DURATION_MS / 1000 - elapsed);
      setRecallTimeLeft(Math.ceil(remaining));
      if (remaining <= 0) {
        clearInterval(interval);
        handleSubmitRecall();
      }
    }, 250);
    return () => clearInterval(interval);
  }, [expPhase, sessionNum]);

  // ── Distractor response ─────────────────────────────────────────────────────
  const handleDistractorSubmit = () => {
    const rt = Math.round(performance.now() - problemOnsetRef.current);
    const parsed = parseInt(distractorAnswer, 10);
    distractorResultsRef.current.push({
      session_id: sessionId.current,
      participant_name: participantName.current,
      problem: currentProblem.problem,
      correct_answer: currentProblem.correct_answer,
      participant_answer: isNaN(parsed) ? null : parsed,
      accuracy: parsed === currentProblem.correct_answer,
      reaction_time_ms: rt,
      onset_time: new Date().toISOString(),
    });
    setDistractorAnswer('');
    setCurrentProblem(generateArithmeticProblem());
    problemOnsetRef.current = performance.now();
  };

  // ── Recall submission ───────────────────────────────────────────────────────
  const handleSubmitRecall = useCallback(async () => {
    if (expPhase === 'saving' || expPhase === 'transition') return;

    const lines = recallTextRef.current.split('\n').filter(l => l.trim());
    const recallResponses: RecallResponse[] = [];
    const alreadyMatched = new Set<string>();

    lines.forEach((line, i) => {
      const clean = line.trim();
      const match = matchResponse(clean, sessionNum === 1 ? STUDY_LIST_1 : STUDY_LIST_2);
      const isRepetition = match ? alreadyMatched.has(match.word) : false;
      if (match && !isRepetition) alreadyMatched.add(match.word);

      recallResponses.push({
        session_id: sessionId.current,
        participant_name: participantName.current,
        session_number: sessionNum,
        output_position: i + 1,
        response_raw: line,
        response_clean: clean,
        matched_word: match?.word ?? null,
        matched_serial_position: match?.serial_position ?? null,
        is_correct_recall: match !== null && !isRepetition,
        is_repetition: isRepetition,
        recall_submission_time: new Date().toISOString(),
      });
    });

    allRecallRef.current.push(...recallResponses);

    if (sessionNum === 1) {
      // Transition to session 2
      setExpPhase('transition');
      // Save session 1 data now
      try {
        const supabase = getSupabase();
        if (supabase) {
          if (studyEventsRef.current.length > 0) {
            await supabase.from('serial_order_study').insert(studyEventsRef.current);
          }
          if (distractorResultsRef.current.length > 0) {
            await supabase.from('serial_order_distractor').insert(distractorResultsRef.current);
          }
          if (recallResponses.length > 0) {
            await supabase.from('serial_order_recall').insert(recallResponses);
          }
        }
      } catch (e) {
        console.error('Save error:', e);
      }
      // Reset for session 2
      studyEventsRef.current = [];
      setRecallText('');
      recallTextRef.current = '';
      setWordIdx(0);
      setStudySubPhase('fixation');
    } else {
      // Session 2 done — save and finish
      setExpPhase('saving');
      try {
        const supabase = getSupabase();
        if (supabase) {
          if (studyEventsRef.current.length > 0) {
            await supabase.from('serial_order_study').insert(studyEventsRef.current);
          }
          if (recallResponses.length > 0) {
            await supabase.from('serial_order_recall').insert(recallResponses);
          }
        }
      } catch (e) {
        console.error('Save error:', e);
      }
      sessionStorage.setItem('so_recall_results', JSON.stringify(allRecallRef.current));
      router.push('/serialOrder/thanks');
    }
  }, [expPhase, sessionNum, router]);

  // ── Start session 2 ─────────────────────────────────────────────────────────
  const startSession2 = () => {
    setSessionNum(2);
    setExpPhase('study');
  };

  // ── Study phase render ──────────────────────────────────────────────────────
  if (expPhase === 'study') {
    const progress = (wordIdx / currentList.length) * 100;
    return (
      <div className="bg-[#0f172a] flex flex-col select-none" style={{ height: '100dvh' }}>
        <div className="flex-shrink-0 h-6">
          <div className="h-1.5 bg-gray-800">
            <motion.div className="h-full bg-emerald-500" animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
          </div>
          <div className="flex justify-end px-4 pt-0.5">
            <span className="text-xs text-gray-600">
              {isHe ? `רשימה ${sessionNum}` : `List ${sessionNum}`}
            </span>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          {studySubPhase === 'fixation' && (
            <div className="text-white text-6xl font-thin">+</div>
          )}
          {studySubPhase === 'word' && wordIdx < currentList.length && (
            <div className="text-white text-5xl font-bold" style={{ fontFamily: 'serif' }}>
              {currentList[wordIdx].word}
            </div>
          )}
          {studySubPhase === 'blank' && <div />}
        </div>
      </div>
    );
  }

  // ── Distractor phase render ─────────────────────────────────────────────────
  if (expPhase === 'distractor') {
    const minutes = Math.floor(distractorTimeLeft / 60);
    const seconds = distractorTimeLeft % 60;
    return (
      <div className="bg-[#0f172a] flex flex-col select-none" style={{ height: '100dvh' }} dir={isHe ? 'rtl' : 'ltr'}>
        <div className="flex-shrink-0 px-4 pt-4">
          <p className="text-gray-400 text-sm text-center">
            {isHe ? 'פתרו כמה שיותר תרגילי חשבון' : 'Solve as many problems as you can'}
          </p>
          <p className="text-emerald-400 text-center text-lg font-bold mt-1">
            {minutes}:{String(seconds).padStart(2, '0')}
          </p>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4">
          <div className="text-white text-4xl font-bold" dir="ltr">
            {currentProblem.problem} = ?
          </div>
          <div className="flex gap-3 items-center" dir="ltr">
            <input
              type="number"
              inputMode="numeric"
              value={distractorAnswer}
              onChange={e => setDistractorAnswer(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleDistractorSubmit()}
              autoFocus
              className="w-32 px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white text-center text-2xl focus:outline-none focus:border-emerald-400 transition-colors"
            />
            <button
              onPointerDown={e => { e.preventDefault(); handleDistractorSubmit(); }}
              className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-xl transition-colors touch-manipulation"
            >
              {isHe ? 'הבא' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Recall phase render ─────────────────────────────────────────────────────
  if (expPhase === 'recall') {
    return (
      <div className="bg-[#0f172a] flex flex-col" style={{ height: '100dvh' }} dir={isHe ? 'rtl' : 'ltr'}>
        <div className="flex-shrink-0 px-4 pt-4">
          <p className="text-gray-500 text-xs text-center mb-1">
            {isHe ? `רשימה ${sessionNum}` : `List ${sessionNum}`}
          </p>
          <p className="text-emerald-400 text-center text-lg font-bold">
            {Math.floor(recallTimeLeft / 60)}:{String(recallTimeLeft % 60).padStart(2, '0')}
          </p>
        </div>
        <div className="flex-1 flex flex-col items-center px-4 pt-4 pb-6 gap-4 overflow-hidden">
          <div className="text-gray-300 text-sm text-center max-w-md">
            {isHe
              ? 'הקלידו את כל המילים שאתם זוכרים מהרשימה. הקלידו בסדר שהן עולות לכם בראש. מילה אחת בכל שורה. מותר לנחש.'
              : 'Type all the words you remember. One word per line. Type them in the order they come to mind. Guessing is okay.'}
          </div>
          <textarea
            value={recallText}
            onChange={e => { setRecallText(e.target.value); recallTextRef.current = e.target.value; }}
            autoFocus
            className="flex-1 w-full max-w-md px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white text-lg resize-none focus:outline-none focus:border-emerald-400 transition-colors"
            placeholder={isHe ? 'הקלידו מילה בכל שורה...' : 'Type one word per line...'}
            dir="rtl"
          />
          <button
            onPointerDown={e => { e.preventDefault(); handleSubmitRecall(); }}
            className="w-full max-w-md py-4 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-xl text-lg transition-colors touch-manipulation shadow-lg"
          >
            {isHe ? 'שלח' : 'Submit'}
          </button>
        </div>
      </div>
    );
  }

  // ── Transition screen between sessions ──────────────────────────────────────
  if (expPhase === 'transition') {
    return (
      <div className="bg-[#0f172a] flex flex-col items-center justify-center gap-6 px-4" style={{ height: '100dvh' }} dir={isHe ? 'rtl' : 'ltr'}>
        <div className="text-center max-w-md">
          <p className="text-white text-xl font-bold mb-3">
            {isHe ? 'כל הכבוד!' : 'Well done!'}
          </p>
          <p className="text-gray-300 text-sm">
            {isHe
              ? 'עכשיו תראו רשימה חדשה של מילים. הפעם תתבקשו להיזכר מיד לאחר הרשימה.'
              : 'Now you will see a new word list. This time you will recall immediately after the list.'}
          </p>
        </div>
        <button
          onPointerDown={e => { e.preventDefault(); startSession2(); }}
          className="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-xl text-lg transition-colors touch-manipulation shadow-lg"
        >
          {isHe ? 'המשך' : 'Continue'}
        </button>
      </div>
    );
  }

  // ── Saving ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
      <p className="text-gray-400 text-lg">{isHe ? 'שומר...' : 'Saving...'}</p>
    </div>
  );
}
