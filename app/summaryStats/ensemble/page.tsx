'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import ArrayDisplay from '@/components/summary-stats/ArrayDisplay';
import ResponseScale from '@/components/summary-stats/ResponseScale';
import {
  generateEnsembleTrials,
  DISPLAY_DURATION_MS,
  BLANK_DURATION_MS,
  FIXATION_DURATION_MS,
} from '@/lib/summary-stats/stimuli';
import { EnsembleTrial, EnsembleResult, SeenArray } from '@/types/summary-stats';
import { getSupabase } from '@/lib/supabase';

type Phase = 'ready' | 'fixation' | 'array' | 'blank' | 'response' | 'done';

const TOTAL_TRIALS = 18;

export default function EnsemblePage() {
  const router = useRouter();
  const [language, setLanguage] = useState<'en' | 'he'>('he');
  const [sessionId, setSessionId] = useState('');
  const [participantName, setParticipantName] = useState('');
  const [trials, setTrials] = useState<EnsembleTrial[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('ready');
  const [results, setResults] = useState<EnsembleResult[]>([]);
  const [responseStart, setResponseStart] = useState(0);
  const [saving, setSaving] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const lang = sessionStorage.getItem('ss_language') as 'en' | 'he' | null;
    const sid = sessionStorage.getItem('ss_session_id') || '';
    const name = sessionStorage.getItem('ss_participant_name') || '';
    if (lang) setLanguage(lang);
    setSessionId(sid);
    setParticipantName(name);
    setTrials(generateEnsembleTrials());
  }, []);

  const currentTrial = trials[currentIndex];

  // Timer-driven phase transitions
  useEffect(() => {
    if (!currentTrial || phase === 'ready' || phase === 'response' || phase === 'done') return;
    if (timerRef.current) clearTimeout(timerRef.current);

    if (phase === 'fixation') {
      timerRef.current = setTimeout(() => setPhase('array'), FIXATION_DURATION_MS);
    } else if (phase === 'array') {
      timerRef.current = setTimeout(() => setPhase('blank'), DISPLAY_DURATION_MS);
    } else if (phase === 'blank') {
      timerRef.current = setTimeout(() => {
        setResponseStart(Date.now());
        setPhase('response');
      }, BLANK_DURATION_MS);
    }

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [phase, currentTrial]);

  const handleResponse = async (value: number) => {
    if (!currentTrial) return;
    const rt = Date.now() - responseStart;
    const signed = value - currentTrial.trueValue;

    const result: EnsembleResult = {
      session_id: sessionId,
      participant_name: participantName,
      trial_type: 'ensemble',
      trial_number: currentIndex + 1,
      stimulus_type: currentTrial.stimulusType,
      stat_type: currentTrial.statType,
      n_items: currentTrial.nItems,
      true_value: currentTrial.trueValue,
      response_value: value,
      signed_error: signed,
      absolute_error: Math.abs(signed),
      reaction_time_ms: rt,
      is_practice: false,
    };

    const newResults = [...results, result];
    setResults(newResults);

    if (currentIndex + 1 >= TOTAL_TRIALS) {
      setSaving(true);

      // Save to sessionStorage
      sessionStorage.setItem('ss_ensemble_results', JSON.stringify(newResults));

      // Save seen arrays for recognition probe generation
      const seenArrays: SeenArray[] = trials.map(t => ({
        trialId: t.trialId,
        stimulusType: t.stimulusType,
        items: t.items,
      }));
      sessionStorage.setItem('ss_seen_arrays', JSON.stringify(seenArrays));

      // Push ensemble results to Supabase
      try {
        const supabase = getSupabase();
        if (!supabase) throw new Error('Supabase not available');
        await supabase.from('summary_stats_results').insert(
          newResults.map(r => ({
            session_id: r.session_id,
            participant_name: r.participant_name,
            trial_type: r.trial_type,
            trial_number: r.trial_number,
            stimulus_type: r.stimulus_type,
            stat_type: r.stat_type,
            n_items: r.n_items,
            true_value: r.true_value,
            response_value: r.response_value,
            signed_error: r.signed_error,
            absolute_error: r.absolute_error,
            reaction_time_ms: r.reaction_time_ms,
            is_practice: r.is_practice,
          }))
        );
      } catch (e) {
        console.error('Supabase save error:', e);
      }

      setSaving(false);
      setPhase('done');
    } else {
      setCurrentIndex(i => i + 1);
      setPhase('fixation');
    }
  };

  const content = {
    he: {
      readyTitle: 'חלק 1: סטטיסטיקות קבוצה',
      readyDesc: 'תראה הצגות קצרות של מערכי גירויים. לאחר כל הצגה, דווח על הסטטיסטיקה המבוקשת.',
      readyNote: 'אין משוב בשלב זה. פשוט עשה כמיטב יכולתך.',
      startButton: 'התחל',
      doneTitle: 'חלק 1 הושלם!',
      doneDesc: 'כעת עבור לחלק 2: זיהוי פריטים בודדים.',
      nextButton: 'המשך לחלק 2',
      saving: 'שומר תוצאות...',
      trialOf: (n: number, total: number) => `ניסוי ${n} מתוך ${total}`,
    },
    en: {
      readyTitle: 'Part 1: Group Statistics',
      readyDesc: 'You will see brief arrays of stimuli. After each display, report the requested statistic.',
      readyNote: 'There is no feedback in this phase. Just do your best.',
      startButton: 'Begin',
      doneTitle: 'Part 1 Complete!',
      doneDesc: 'Now move on to Part 2: recognizing individual items.',
      nextButton: 'Continue to Part 2',
      saving: 'Saving results...',
      trialOf: (n: number, total: number) => `Trial ${n} of ${total}`,
    },
  };

  const t = content[language];
  const progress = (currentIndex / TOTAL_TRIALS) * 100;

  return (
    <div
      className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center"
      style={{ direction: language === 'he' ? 'rtl' : 'ltr' }}
    >
      {/* Progress bar */}
      {phase !== 'ready' && phase !== 'done' && (
        <div className="fixed top-0 left-0 right-0 h-1.5 bg-gray-800">
          <motion.div
            className="h-full bg-orange-500"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      )}
      {phase !== 'ready' && phase !== 'done' && (
        <div className="fixed top-4 right-4 text-gray-400 text-sm">
          {t.trialOf(currentIndex + 1, TOTAL_TRIALS)}
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* READY */}
        {phase === 'ready' && (
          <motion.div
            key="ready"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="max-w-lg w-full mx-auto px-6 text-center"
          >
            <h1 className="text-3xl font-bold text-white mb-4">{t.readyTitle}</h1>
            <p className="text-gray-300 mb-4 leading-relaxed">{t.readyDesc}</p>
            <p className="text-orange-300 text-sm mb-8">{t.readyNote}</p>
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
          <motion.div
            key="fixation"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="text-white text-6xl font-thin select-none"
          >
            +
          </motion.div>
        )}

        {/* ARRAY */}
        {phase === 'array' && currentTrial && (
          <motion.div
            key={`array-${currentIndex}`}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <ArrayDisplay
              items={currentTrial.items}
              stimulusType={currentTrial.stimulusType}
              size={500}
            />
          </motion.div>
        )}

        {/* BLANK */}
        {phase === 'blank' && (
          <motion.div
            key="blank"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="w-[500px] h-[500px]"
            style={{ background: '#1a1a2e', borderRadius: 8 }}
          />
        )}

        {/* RESPONSE */}
        {phase === 'response' && currentTrial && (
          <motion.div
            key={`response-${currentIndex}`}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="w-full max-w-lg px-6"
          >
            <ResponseScale
              stimulusType={currentTrial.stimulusType}
              statType={currentTrial.statType}
              onConfirm={handleResponse}
              language={language}
            />
          </motion.div>
        )}

        {/* DONE */}
        {phase === 'done' && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="max-w-lg w-full mx-auto px-6 text-center"
          >
            <div className="text-5xl mb-6">🎉</div>
            <h1 className="text-3xl font-bold text-white mb-4">{t.doneTitle}</h1>
            <p className="text-gray-300 mb-8 leading-relaxed">{t.doneDesc}</p>
            {saving ? (
              <p className="text-orange-300 animate-pulse">{t.saving}</p>
            ) : (
              <button
                onClick={() => router.push('/summaryStats/recognition')}
                className="px-12 py-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-xl transition-colors shadow-lg"
              >
                {t.nextButton}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
