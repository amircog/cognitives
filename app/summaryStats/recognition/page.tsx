'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { SingleItemDisplay } from '@/components/summary-stats/ArrayDisplay';
import { generateRecognitionTrials } from '@/lib/summary-stats/stimuli';
import { RecognitionTrial, RecognitionResult, SeenArray } from '@/types/summary-stats';
import { getSupabase } from '@/lib/supabase';

type Phase = 'instructions' | 'fixation' | 'probe' | 'done';

const TOTAL_PROBES = 12;
const FIXATION_MS = 500;

export default function RecognitionPage() {
  const router = useRouter();
  const [language, setLanguage] = useState<'en' | 'he'>('he');
  const [sessionId, setSessionId] = useState('');
  const [participantName, setParticipantName] = useState('');
  const [trials, setTrials] = useState<RecognitionTrial[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('instructions');
  const [results, setResults] = useState<RecognitionResult[]>([]);
  const [probeStart, setProbeStart] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const lang = sessionStorage.getItem('ss_language') as 'en' | 'he' | null;
    const sid = sessionStorage.getItem('ss_session_id') || '';
    const name = sessionStorage.getItem('ss_participant_name') || '';
    const seenRaw = sessionStorage.getItem('ss_seen_arrays');
    if (lang) setLanguage(lang);
    setSessionId(sid);
    setParticipantName(name);
    if (seenRaw) {
      const seenArrays: SeenArray[] = JSON.parse(seenRaw);
      setTrials(generateRecognitionTrials(seenArrays));
    }
  }, []);

  const currentTrial = trials[currentIndex];

  // Fixation timer
  useEffect(() => {
    if (phase === 'fixation') {
      const t = setTimeout(() => {
        setProbeStart(Date.now());
        setPhase('probe');
      }, FIXATION_MS);
      return () => clearTimeout(t);
    }
  }, [phase]);

  const handleResponse = useCallback(async (yes: boolean) => {
    if (!currentTrial || phase !== 'probe') return;

    const rt = Date.now() - probeStart;
    const isCorrect = yes === currentTrial.probeIsTarget;

    const result: RecognitionResult = {
      session_id: sessionId,
      participant_name: participantName,
      trial_type: 'recognition',
      trial_number: currentIndex + 1,
      stimulus_type: currentTrial.stimulusType,
      probe_value: currentTrial.probeValue,
      probe_is_target: currentTrial.probeIsTarget,
      response_yes: yes,
      is_correct: isCorrect,
      reaction_time_ms: rt,
    };

    const newResults = [...results, result];
    setResults(newResults);

    if (currentIndex + 1 >= TOTAL_PROBES) {
      setSaving(true);
      sessionStorage.setItem('ss_recognition_results', JSON.stringify(newResults));

      try {
        const supabase = getSupabase();
        await supabase.from('summary_stats_results').insert(
          newResults.map(r => ({
            session_id: r.session_id,
            participant_name: r.participant_name,
            trial_type: r.trial_type,
            trial_number: r.trial_number,
            stimulus_type: r.stimulus_type,
            probe_value: r.probe_value,
            probe_is_target: r.probe_is_target,
            response_yes: r.response_yes,
            is_correct: r.is_correct,
            reaction_time_ms: r.reaction_time_ms,
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
  }, [currentTrial, phase, probeStart, results, currentIndex, sessionId, participantName]);

  // Keyboard S/N
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (phase !== 'probe') return;
      if (e.key === 's' || e.key === 'S') handleResponse(true);
      if (e.key === 'n' || e.key === 'N') handleResponse(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [phase, handleResponse]);

  const content = {
    he: {
      instrTitle: 'חלק 2: זיהוי פריטים',
      instrDesc: 'כעת יוצג לך פריט בודד. ציין האם ראית את הפריט המדויק הזה באחת מהקבוצות שראית קודם.',
      instrNote: 'לחץ S עבור "כן" ו-N עבור "לא", או השתמש בכפתורים.',
      startButton: 'התחל',
      yes: 'כן (S)',
      no: 'לא (N)',
      doneTitle: 'הניסוי הושלם!',
      doneDesc: 'תודה על השתתפותך.',
      nextButton: 'המשך',
      probeOf: (n: number, total: number) => `פריט ${n} מתוך ${total}`,
      question: 'האם ראית את הפריט הזה בדיוק?',
      saving: 'שומר תוצאות...',
    },
    en: {
      instrTitle: 'Part 2: Item Recognition',
      instrDesc: 'You will now see a single item. Indicate whether you saw that exact item in any of the previous arrays.',
      instrNote: 'Press S for "Yes" and N for "No", or use the buttons.',
      startButton: 'Begin',
      yes: 'Yes (S)',
      no: 'No (N)',
      doneTitle: 'Experiment Complete!',
      doneDesc: 'Thank you for your participation.',
      nextButton: 'Continue',
      probeOf: (n: number, total: number) => `Probe ${n} of ${total}`,
      question: 'Did you see this exact item?',
      saving: 'Saving results...',
    },
  };

  const t = content[language];
  const progress = (currentIndex / TOTAL_PROBES) * 100;

  return (
    <div
      className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center"
      style={{ direction: language === 'he' ? 'rtl' : 'ltr' }}
    >
      {/* Progress bar */}
      {phase !== 'instructions' && phase !== 'done' && (
        <>
          <div className="fixed top-0 left-0 right-0 h-1.5 bg-gray-800">
            <motion.div
              className="h-full bg-orange-500"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
          <div className="fixed top-4 right-4 text-gray-400 text-sm">
            {t.probeOf(currentIndex + 1, TOTAL_PROBES)}
          </div>
        </>
      )}

      <AnimatePresence mode="wait">
        {/* INSTRUCTIONS */}
        {phase === 'instructions' && (
          <motion.div
            key="instr"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="max-w-lg w-full mx-auto px-6 text-center"
          >
            <h1 className="text-3xl font-bold text-white mb-4">{t.instrTitle}</h1>
            <p className="text-gray-300 mb-4 leading-relaxed">{t.instrDesc}</p>
            <p className="text-orange-300 text-sm mb-8">{t.instrNote}</p>
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
            key={`fix-${currentIndex}`}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="text-white text-6xl font-thin select-none"
          >
            +
          </motion.div>
        )}

        {/* PROBE */}
        {phase === 'probe' && currentTrial && (
          <motion.div
            key={`probe-${currentIndex}`}
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-6"
          >
            <p className="text-gray-200 text-xl font-semibold">{t.question}</p>
            <SingleItemDisplay
              value={currentTrial.probeValue}
              stimulusType={currentTrial.stimulusType}
              size={220}
              color="#f97316"
            />
            <div className="flex gap-6 mt-2">
              <button
                onClick={() => handleResponse(true)}
                className="px-10 py-3 bg-green-700 hover:bg-green-600 text-white font-bold rounded-xl text-lg transition-colors shadow-lg"
              >
                {t.yes}
              </button>
              <button
                onClick={() => handleResponse(false)}
                className="px-10 py-3 bg-red-800 hover:bg-red-700 text-white font-bold rounded-xl text-lg transition-colors shadow-lg"
              >
                {t.no}
              </button>
            </div>
          </motion.div>
        )}

        {/* DONE */}
        {phase === 'done' && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="max-w-lg w-full mx-auto px-6 text-center"
          >
            <div className="text-5xl mb-6">✅</div>
            <h1 className="text-3xl font-bold text-white mb-4">{t.doneTitle}</h1>
            <p className="text-gray-300 mb-8">{t.doneDesc}</p>
            {saving ? (
              <p className="text-orange-300 animate-pulse">{t.saving}</p>
            ) : (
              <button
                onClick={() => router.push('/summaryStats/thanks')}
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
