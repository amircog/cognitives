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
  RECOGNITION_LABEL,
} from '@/lib/summary-stats/stimuli';
import {
  Trial, EnsembleTrial, RecognitionTrial,
  EnsembleResult, RecognitionResult, TrialResult,
} from '@/types/summary-stats';
import { getSupabase } from '@/lib/supabase';

type Phase = 'intro' | 'fixation' | 'array' | 'blank' | 'question' | 'done';

const TOTAL_TRIALS = 72;

export default function MainExperimentPage() {
  const router = useRouter();
  const [language, setLanguage]         = useState<'en' | 'he'>('he');
  const [sessionId, setSessionId]       = useState('');
  const [participantName, setParticipantName] = useState('');
  const [trials, setTrials]             = useState<Trial[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase]               = useState<Phase>('intro');
  const [results, setResults]           = useState<TrialResult[]>([]);
  const [responseStart, setResponseStart] = useState(0);
  const [saving, setSaving]             = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const lang = sessionStorage.getItem('ss_language') as 'en' | 'he' | null;
    const sid  = sessionStorage.getItem('ss_session_id') ?? '';
    const name = sessionStorage.getItem('ss_participant_name') ?? '';
    if (lang) setLanguage(lang);
    setSessionId(sid);
    setParticipantName(name);
    setTrials(generateMainTrials());
  }, []);

  const isHe = language === 'he';
  const currentTrial = trials[currentIndex] as Trial | undefined;

  useEffect(() => {
    if (!currentTrial || phase === 'intro' || phase === 'question' || phase === 'done') return;
    if (timerRef.current) clearTimeout(timerRef.current);

    if (phase === 'fixation') {
      timerRef.current = setTimeout(() => setPhase('array'), FIXATION_DURATION_MS);
    } else if (phase === 'array') {
      timerRef.current = setTimeout(() => setPhase('blank'), DISPLAY_DURATION_MS);
    } else if (phase === 'blank') {
      timerRef.current = setTimeout(() => { setResponseStart(Date.now()); setPhase('question'); }, BLANK_DURATION_MS);
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
          } else {
            const rc = r as RecognitionResult;
            return { ...base, n_items: rc.n_items, probe_value: rc.probe_value, probe_is_target: rc.probe_is_target, probe_type: rc.probe_type, response_yes: rc.response_yes, is_correct: rc.is_correct };
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

  const handleEnsembleResponse = useCallback((value: number) => {
    if (!currentTrial || currentTrial.type !== 'ensemble') return;
    const trial = currentTrial as EnsembleTrial;
    const rt = Date.now() - responseStart;
    const signed = value - trial.trueValue;
    advanceTrial({
      session_id: sessionId, participant_name: participantName,
      trial_type: 'ensemble', trial_number: currentIndex + 1,
      stimulus_type: trial.stimulusType, stat_type: trial.statType,
      n_items: trial.nItems, true_value: trial.trueValue,
      response_value: value, signed_error: signed, absolute_error: Math.abs(signed),
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
      stimulus_type: trial.stimulusType, n_items: trial.nItems,
      probe_value: trial.probeValue, probe_is_target: trial.probeIsTarget,
      probe_type: trial.probeType, response_yes: yes,
      is_correct: yes === trial.probeIsTarget, reaction_time_ms: rt,
    });
  }, [currentTrial, responseStart, sessionId, participantName, currentIndex, advanceTrial]);

  const progress = (currentIndex / TOTAL_TRIALS) * 100;

  const t = {
    introTitle:  isHe ? 'הניסוי הראשי'   : 'Main Experiment',
    startBtn:    isHe ? 'התחל'            : 'Begin',
    probeQ:      RECOGNITION_LABEL[language],
    yes:         isHe ? 'כן' : 'Yes',
    no:          isHe ? 'לא' : 'No',
    doneTitle:   isHe ? '!סיימת'          : 'Done!',
    doneSaving:  isHe ? 'שומר תוצאות...' : 'Saving…',
    continueBtn: isHe ? 'המשך'            : 'Continue',
  };

  return (
    <div
      className="bg-[#0f172a] flex flex-col select-none"
      style={{ height: '100dvh', direction: isHe ? 'rtl' : 'ltr' }}
    >
      {/* Top bar */}
      {phase !== 'intro' && phase !== 'done' && (
        <div className="flex-shrink-0 h-6">
          <div className="h-1.5 bg-gray-800">
            <motion.div className="h-full bg-orange-500" animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }} />
          </div>
          <div className="flex justify-end px-4 pt-0.5">
            <span className="text-xs text-gray-500 tabular-nums">{currentIndex + 1} / {TOTAL_TRIALS}</span>
          </div>
        </div>
      )}
      {(phase === 'intro' || phase === 'done') && <div className="flex-shrink-0 h-6" />}

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center overflow-hidden px-4">
        <AnimatePresence mode="wait">

          {phase === 'intro' && (
            <motion.div key="intro"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-6 text-center"
            >
              <h1 className="text-3xl font-bold text-white">{t.introTitle}</h1>
              <button
                onPointerDown={e => { e.preventDefault(); setPhase('fixation'); }}
                className="px-12 py-4 bg-orange-500 hover:bg-orange-400 text-white font-bold rounded-xl text-xl transition-colors shadow-lg touch-manipulation"
              >{t.startBtn}</button>
            </motion.div>
          )}

          {phase === 'fixation' && (
            <motion.div key={`fix-${currentIndex}`}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-white text-6xl font-thin">+</motion.div>
          )}

          {phase === 'array' && currentTrial && (
            <motion.div key={`arr-${currentIndex}`}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ width: '100%', maxWidth: 480 }}
            >
              <ArrayDisplay items={currentTrial.items} stimulusType={currentTrial.stimulusType} />
            </motion.div>
          )}

          {phase === 'blank' && (
            <motion.div key="blank"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ width: '100%', maxWidth: 480, aspectRatio: '1', background: '#1a1a2e', borderRadius: 8 }}
            />
          )}

          {/* QUESTION — ENSEMBLE */}
          {phase === 'question' && currentTrial?.type === 'ensemble' && (
            <motion.div key={`q-e-${currentIndex}`}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="w-full max-w-sm"
            >
              <ResponseScale
                stimulusType={(currentTrial as EnsembleTrial).stimulusType}
                onConfirm={handleEnsembleResponse}
                language={language}
              />
            </motion.div>
          )}

          {/* QUESTION — RECOGNITION */}
          {phase === 'question' && currentTrial?.type === 'recognition' && (
            <motion.div key={`q-r-${currentIndex}`}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-5"
            >
              <p className="text-gray-200 text-lg font-semibold text-center px-4">{t.probeQ}</p>
              <SingleItemDisplay
                value={(currentTrial as RecognitionTrial).probeValue}
                stimulusType={currentTrial.stimulusType}
                size={200} color="#f97316"
              />
              <div className="flex gap-4">
                <button
                  onPointerDown={e => { e.preventDefault(); handleRecognitionResponse(true); }}
                  className="px-10 py-4 bg-green-700 hover:bg-green-600 text-white font-bold rounded-2xl text-xl touch-manipulation shadow-lg"
                >{t.yes}</button>
                <button
                  onPointerDown={e => { e.preventDefault(); handleRecognitionResponse(false); }}
                  className="px-10 py-4 bg-red-800 hover:bg-red-700 text-white font-bold rounded-2xl text-xl touch-manipulation shadow-lg"
                >{t.no}</button>
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
                <button
                  onPointerDown={e => { e.preventDefault(); router.push('/summaryStats/thanks'); }}
                  className="mt-6 px-10 py-4 bg-orange-500 hover:bg-orange-400 text-white font-bold rounded-xl text-lg transition-colors touch-manipulation"
                >{t.continueBtn}</button>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
