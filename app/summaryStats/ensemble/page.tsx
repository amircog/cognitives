'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import ArrayDisplay, { SingleItemDisplay } from '@/components/summary-stats/ArrayDisplay';
import ResponseScale from '@/components/summary-stats/ResponseScale';
import {
  generateMainTrials,
  DISPLAY_DURATION_MS,
  BLANK_DURATION_MS,
  FIXATION_DURATION_MS,
  TWO_AFC_LABELS,
} from '@/lib/summary-stats/stimuli';
import {
  EnsembleTrial, RecognitionTrial, TwoAFCTrial,
  EnsembleResult, RecognitionResult, TwoAFCResult, TrialResult,
} from '@/types/summary-stats';
import { getSupabase } from '@/lib/supabase';

type Phase = 'intro' | 'fixation' | 'array' | 'blank' | 'question' | 'done';
type MainTrial = EnsembleTrial | RecognitionTrial | TwoAFCTrial;

const TOTAL_TRIALS = 24;

export default function MainExperimentPage() {
  const router = useRouter();
  const [language, setLanguage]             = useState<'en' | 'he'>('he');
  const [sessionId, setSessionId]           = useState('');
  const [participantName, setParticipantName] = useState('');
  const [trials, setTrials]                 = useState<MainTrial[]>([]);
  const [currentIndex, setCurrentIndex]     = useState(0);
  const [phase, setPhase]                   = useState<Phase>('intro');
  const [results, setResults]               = useState<TrialResult[]>([]);
  const [responseStart, setResponseStart]   = useState(0);
  const [saving, setSaving]                 = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const lang = sessionStorage.getItem('ss_language') as 'en' | 'he' | null;
    const sid  = sessionStorage.getItem('ss_session_id') || '';
    const name = sessionStorage.getItem('ss_participant_name') || '';
    if (lang) setLanguage(lang);
    setSessionId(sid);
    setParticipantName(name);
    setTrials(generateMainTrials());
  }, []);

  const currentTrial = trials[currentIndex] as MainTrial | undefined;

  // Timer-driven phase transitions
  useEffect(() => {
    if (!currentTrial || phase === 'intro' || phase === 'question' || phase === 'done') return;
    if (timerRef.current) clearTimeout(timerRef.current);

    if (phase === 'fixation') {
      timerRef.current = setTimeout(() => setPhase('array'), FIXATION_DURATION_MS);
    } else if (phase === 'array') {
      timerRef.current = setTimeout(() => setPhase('blank'), DISPLAY_DURATION_MS);
    } else if (phase === 'blank') {
      timerRef.current = setTimeout(() => {
        setResponseStart(Date.now());
        setPhase('question');
      }, BLANK_DURATION_MS);
    }

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [phase, currentTrial]);

  const advanceTrial = useCallback(async (newResult: TrialResult) => {
    const newResults = [...results, newResult];
    setResults(newResults);

    if (currentIndex + 1 >= TOTAL_TRIALS) {
      setSaving(true);
      setPhase('done');
      sessionStorage.setItem('ss_main_results', JSON.stringify(newResults));

      try {
        const supabase = getSupabase();
        if (!supabase) throw new Error('Supabase not available');
        const rows = newResults.map(r => {
          const base = {
            session_id: r.session_id, participant_name: r.participant_name,
            trial_type: r.trial_type, trial_number: r.trial_number,
            stimulus_type: r.stimulus_type, reaction_time_ms: r.reaction_time_ms,
          };
          if (r.trial_type === 'ensemble') {
            const e = r as EnsembleResult;
            return { ...base, stat_type: e.stat_type, n_items: e.n_items, true_value: e.true_value, response_value: e.response_value, signed_error: e.signed_error, absolute_error: e.absolute_error, is_practice: e.is_practice };
          } else if (r.trial_type === 'recognition') {
            const rc = r as RecognitionResult;
            return { ...base, probe_value: rc.probe_value, probe_is_target: rc.probe_is_target, response_yes: rc.response_yes, is_correct: rc.is_correct };
          } else {
            const f = r as TwoAFCResult;
            return { ...base, stat_type: f.stat_type, n_items: f.n_items, true_value: f.true_value, foil_value: f.foil_value, correct_is_a: f.correct_is_a, chose_a: f.chose_a, is_correct: f.is_correct };
          }
        });
        await supabase.from('summary_stats_results').insert(rows);
      } catch (e) {
        console.error('Save error:', e);
      } finally {
        setSaving(false);
      }
    } else {
      setCurrentIndex(i => i + 1);
      setPhase('fixation');
    }
  }, [results, currentIndex]);

  // Response handlers
  const handleEnsembleResponse = useCallback((value: number) => {
    if (!currentTrial || currentTrial.type !== 'ensemble') return;
    const trial = currentTrial as EnsembleTrial;
    const rt = Date.now() - responseStart;
    const signed = value - trial.trueValue;
    advanceTrial({
      session_id: sessionId, participant_name: participantName,
      trial_type: 'ensemble', trial_number: currentIndex + 1,
      stimulus_type: trial.stimulusType, stat_type: trial.statType,
      n_items: trial.nItems, true_value: trial.trueValue, response_value: value,
      signed_error: signed, absolute_error: Math.abs(signed),
      reaction_time_ms: rt, is_practice: false,
    });
  }, [currentTrial, responseStart, sessionId, participantName, currentIndex, advanceTrial]);

  const handleRecognitionResponse = useCallback((yes: boolean) => {
    if (!currentTrial || currentTrial.type !== 'recognition') return;
    const trial = currentTrial as RecognitionTrial;
    const rt = Date.now() - responseStart;
    advanceTrial({
      session_id: sessionId, participant_name: participantName,
      trial_type: 'recognition', trial_number: currentIndex + 1,
      stimulus_type: trial.stimulusType, probe_value: trial.probeValue,
      probe_is_target: trial.probeIsTarget, response_yes: yes,
      is_correct: yes === trial.probeIsTarget, reaction_time_ms: rt,
    });
  }, [currentTrial, responseStart, sessionId, participantName, currentIndex, advanceTrial]);

  const handle2AFCResponse = useCallback((choseA: boolean) => {
    if (!currentTrial || currentTrial.type !== '2afc') return;
    const trial = currentTrial as TwoAFCTrial;
    const rt = Date.now() - responseStart;
    advanceTrial({
      session_id: sessionId, participant_name: participantName,
      trial_type: '2afc', trial_number: currentIndex + 1,
      stimulus_type: trial.stimulusType, stat_type: trial.statType,
      n_items: trial.nItems, true_value: trial.trueValue, foil_value: trial.foilValue,
      correct_is_a: trial.correctIsA, chose_a: choseA,
      is_correct: choseA === trial.correctIsA, reaction_time_ms: rt,
    });
  }, [currentTrial, responseStart, sessionId, participantName, currentIndex, advanceTrial]);

  // Keyboard shortcuts
  useEffect(() => {
    if (phase !== 'question' || !currentTrial) return;
    const handleKey = (e: KeyboardEvent) => {
      if (currentTrial.type === 'recognition') {
        if (e.key === 's' || e.key === 'S') handleRecognitionResponse(true);
        if (e.key === 'n' || e.key === 'N') handleRecognitionResponse(false);
      }
      if (currentTrial.type === '2afc') {
        if (e.key === 'f' || e.key === 'F') handle2AFCResponse(true);
        if (e.key === 'j' || e.key === 'J') handle2AFCResponse(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [phase, currentTrial, handleRecognitionResponse, handle2AFCResponse]);

  const t = language === 'he' ? {
    introTitle:    'הניסוי הראשי',
    introDesc:     'בכל ניסוי תראה תצוגה קצרה, ואחריה שאלה אחת מתוך שלושה סוגים:',
    introTypes: [
      '📊 סטטיסטיקה — דווח על הממוצע / הגדול ביותר / הקטן ביותר באמצעות פס הזזה',
      '🔍 זיהוי — האם פריט זה הופיע בתצוגה?  (S = כן ,  N = לא)',
      '⚖️ בחירה — איזה מבין שני הפריטים תואם את הסטטיסטיקה?  (F = שמאל ,  J = ימין)',
    ],
    startButton:   'התחל',
    probeQuestion: 'האם פריט זה הופיע בתצוגה?',
    yes: 'כן  (S)', no: 'לא  (N)',
    optA: 'F  ←',  optB: '→  J',
    doneTitle: 'סיימת!', doneSaving: 'שומר תוצאות...',
    continueBtn: 'המשך',
  } : {
    introTitle:    'Main Experiment',
    introDesc:     'Each trial shows a brief display, then one of three question types:',
    introTypes: [
      '📊 Statistic — report mean / largest / smallest using a slider',
      '🔍 Recognition — did that single item appear in the display?  (S = Yes ,  N = No)',
      '⚖️ 2AFC — which of the two items matches the statistic?  (F = left ,  J = right)',
    ],
    startButton:   'Begin',
    probeQuestion: 'Did this item appear in the display?',
    yes: 'Yes  (S)', no: 'No  (N)',
    optA: 'F  ←',   optB: '→  J',
    doneTitle: 'Done!', doneSaving: 'Saving…',
    continueBtn: 'Continue',
  };

  const progress = (currentIndex / TOTAL_TRIALS) * 100;

  // Compute 2AFC option values (A = left option, B = right)
  const afc = currentTrial?.type === '2afc' ? currentTrial as TwoAFCTrial : null;
  const optionAValue = afc ? (afc.correctIsA ? afc.trueValue : afc.foilValue) : 0;
  const optionBValue = afc ? (afc.correctIsA ? afc.foilValue : afc.trueValue) : 0;

  return (
    <div
      className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center"
      style={{ direction: language === 'he' ? 'rtl' : 'ltr' }}
    >
      {/* Progress bar */}
      {phase !== 'intro' && phase !== 'done' && (
        <div className="fixed top-0 left-0 right-0 h-1.5 bg-gray-800">
          <motion.div className="h-full bg-orange-500" animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }} />
        </div>
      )}
      {phase !== 'intro' && phase !== 'done' && (
        <div className="fixed top-4 right-4 text-gray-500 text-sm tabular-nums">
          {currentIndex + 1} / {TOTAL_TRIALS}
        </div>
      )}

      <AnimatePresence mode="wait">

        {/* INTRO */}
        {phase === 'intro' && (
          <motion.div key="intro"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="max-w-lg w-full mx-auto px-6 text-center"
          >
            <h1 className="text-3xl font-bold text-white mb-4">{t.introTitle}</h1>
            <p className="text-gray-300 mb-4">{t.introDesc}</p>
            <ul className="text-start mb-8 space-y-2">
              {t.introTypes.map((line, i) => (
                <li key={i} className="text-gray-200 text-sm bg-gray-800 rounded-lg px-4 py-3">{line}</li>
              ))}
            </ul>
            <button
              onClick={() => setPhase('fixation')}
              className="px-12 py-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-xl transition-colors shadow-lg"
            >
              {t.startButton}
            </button>
          </motion.div>
        )}

        {/* FIXATION */}
        {phase === 'fixation' && (
          <motion.div key={`fix-${currentIndex}`}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="text-white text-6xl font-thin select-none"
          >+</motion.div>
        )}

        {/* ARRAY */}
        {phase === 'array' && currentTrial && (
          <motion.div key={`arr-${currentIndex}`}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <ArrayDisplay items={currentTrial.items} stimulusType={currentTrial.stimulusType} size={500} />
          </motion.div>
        )}

        {/* BLANK */}
        {phase === 'blank' && (
          <motion.div key="blank"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ width: 500, height: 500, background: '#1a1a2e', borderRadius: 8 }}
          />
        )}

        {/* QUESTION — ENSEMBLE */}
        {phase === 'question' && currentTrial?.type === 'ensemble' && (
          <motion.div key={`q-e-${currentIndex}`}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="w-full max-w-lg px-6"
          >
            <ResponseScale
              stimulusType={(currentTrial as EnsembleTrial).stimulusType}
              statType={(currentTrial as EnsembleTrial).statType}
              onConfirm={handleEnsembleResponse}
              language={language}
            />
          </motion.div>
        )}

        {/* QUESTION — RECOGNITION */}
        {phase === 'question' && currentTrial?.type === 'recognition' && (
          <motion.div key={`q-r-${currentIndex}`}
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-6"
          >
            <p className="text-gray-200 text-xl font-semibold">{t.probeQuestion}</p>
            <SingleItemDisplay
              value={(currentTrial as RecognitionTrial).probeValue}
              stimulusType={(currentTrial as RecognitionTrial).stimulusType}
              size={220} color="#f97316"
            />
            <div className="flex gap-6">
              <button onClick={() => handleRecognitionResponse(true)}
                className="px-10 py-3 bg-green-700 hover:bg-green-600 text-white font-bold rounded-xl text-lg transition-colors shadow-lg">
                {t.yes}
              </button>
              <button onClick={() => handleRecognitionResponse(false)}
                className="px-10 py-3 bg-red-800 hover:bg-red-700 text-white font-bold rounded-xl text-lg transition-colors shadow-lg">
                {t.no}
              </button>
            </div>
          </motion.div>
        )}

        {/* QUESTION — 2AFC */}
        {phase === 'question' && currentTrial?.type === '2afc' && afc && (
          <motion.div key={`q-f-${currentIndex}`}
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-6 px-4"
          >
            <p className="text-gray-200 text-xl font-semibold text-center">
              {TWO_AFC_LABELS[afc.stimulusType][afc.statType][language]}
            </p>
            <div className="flex gap-8 items-end" style={{ direction: 'ltr' }}>
              <button onClick={() => handle2AFCResponse(true)}
                className="flex flex-col items-center gap-3 p-5 rounded-2xl border-2 border-gray-600 hover:border-orange-400 bg-gray-800 hover:bg-gray-750 transition-all group">
                <SingleItemDisplay value={optionAValue} stimulusType={afc.stimulusType} size={180} color="#f97316" />
                <span className="text-gray-400 text-sm group-hover:text-orange-400 font-mono">{t.optA}</span>
              </button>
              <button onClick={() => handle2AFCResponse(false)}
                className="flex flex-col items-center gap-3 p-5 rounded-2xl border-2 border-gray-600 hover:border-orange-400 bg-gray-800 hover:bg-gray-750 transition-all group">
                <SingleItemDisplay value={optionBValue} stimulusType={afc.stimulusType} size={180} color="#f97316" />
                <span className="text-gray-400 text-sm group-hover:text-orange-400 font-mono">{t.optB}</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* DONE */}
        {phase === 'done' && (
          <motion.div key="done"
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="text-center px-6"
          >
            <div className="text-5xl mb-4">✅</div>
            <h1 className="text-3xl font-bold text-white mb-3">{t.doneTitle}</h1>
            {saving && <p className="text-orange-300 animate-pulse">{t.doneSaving}</p>}
            {!saving && (
              <button onClick={() => router.push('/summaryStats/thanks')}
                className="mt-6 px-10 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-lg transition-colors">
                {t.continueBtn}
              </button>
            )}
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
