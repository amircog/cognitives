'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PosnerTrial, PosnerResult } from '@/types/posner-cueing';
import { generatePracticeTrials, generateMainTrials } from '@/lib/posner-cueing/experiment';
import { getSupabase } from '@/lib/supabase';

type Phase =
  | 'loading'
  | 'fixation'
  | 'cue'
  | 'target'
  | 'feedback'
  | 'iti'
  | 'practice_break'
  | 'complete';

export default function PosnerExperimentPage() {
  const router = useRouter();

  // UI state
  const [phase, setPhase] = useState<Phase>('loading');
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [mainProgress, setMainProgress] = useState(0);
  const [isPracticeUI, setIsPracticeUI] = useState(true);

  // Refs
  const phaseRef = useRef<Phase>('loading');
  const isPracticeRef = useRef(true);
  const trialIndexRef = useRef(0);
  const currentTrialRef = useRef<PosnerTrial | null>(null);
  const startTimeRef = useRef<number>(0);
  const resultsRef = useRef<PosnerResult[]>([]);
  const trialsRef = useRef<PosnerTrial[]>([]);
  const mainTrialsRef = useRef<PosnerTrial[]>([]);
  const sessionIdRef = useRef('');
  const participantNameRef = useRef('');
  const mainTrialCountRef = useRef(0);
  const missTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const catchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setPhaseSync = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  // ── Save result ──────────────────────────────────────────────────────────
  const saveResult = useCallback(
    (trial: PosnerTrial, response: string, correct: boolean, rt: number | null) => {
      const result: PosnerResult = {
        session_id: sessionIdRef.current,
        participant_name: participantNameRef.current,
        trial_number: trial.id,
        cue_direction: trial.cueDirection,
        target_side: trial.targetSide ?? 'none',
        validity: trial.validity,
        soa: trial.soa,
        response,
        correct,
        rt_ms: rt,
        is_practice: trial.isPractice,
      };
      resultsRef.current.push(result);

      const supabase = getSupabase();
      if (supabase) {
        supabase.from('posner_results').insert(result).then(({ error }) => {
          if (error) console.error('Supabase insert error:', error);
        });
      }
    },
    [],
  );

  // ── Advance trial ────────────────────────────────────────────────────────
  const advanceTrial = useCallback(() => {
    const trials = trialsRef.current;
    const nextIndex = trialIndexRef.current + 1;

    if (nextIndex >= trials.length) {
      if (isPracticeRef.current) {
        setPhaseSync('practice_break');
        return;
      } else {
        setPhaseSync('complete');
        return;
      }
    }

    trialIndexRef.current = nextIndex;
    currentTrialRef.current = trials[nextIndex];

    if (!isPracticeRef.current) {
      mainTrialCountRef.current += 1;
      setMainProgress(mainTrialCountRef.current);
    }

    const fixDuration = 800 + Math.floor(Math.random() * 401);
    setPhaseSync('fixation');

    setTimeout(() => {
      if (phaseRef.current !== 'fixation') return;
      const trial = currentTrialRef.current!;
      setPhaseSync('cue');

      setTimeout(() => {
        if (phaseRef.current !== 'cue') return;
        if (trial.validity === 'catch') {
          setPhaseSync('target');
          const catchTimeout = setTimeout(() => {
            if (phaseRef.current !== 'target') return;
            if (!trial.isPractice) saveResult(trial, 'none', true, null);
            setPhaseSync('iti');
            setTimeout(() => {
              if (phaseRef.current !== 'iti') return;
              advanceTrial();
            }, 600);
          }, 1500);
          catchTimeoutRef.current = catchTimeout;
        } else {
          setPhaseSync('target');
          startTimeRef.current = performance.now();
          const missTimeout = setTimeout(() => {
            if (phaseRef.current !== 'target') return;
            if (!trial.isPractice) saveResult(trial, 'miss', false, null);
            setFeedbackMsg('!פספסת – נסה ללחוץ מהר יותר');
            setPhaseSync('feedback');
            setTimeout(() => {
              if (phaseRef.current !== 'feedback') return;
              setPhaseSync('iti');
              setTimeout(() => {
                if (phaseRef.current !== 'iti') return;
                advanceTrial();
              }, 600);
            }, 500);
          }, 1500);
          missTimeoutRef.current = missTimeout;
        }
      }, trial.soa);
    }, fixDuration);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Unified response handler (keyboard + touch) ──────────────────────────
  const handleResponse = useCallback(() => {
    const p = phaseRef.current;
    const trial = currentTrialRef.current;
    if (!trial) return;

    if (p === 'fixation' || p === 'cue') {
      if (missTimeoutRef.current) clearTimeout(missTimeoutRef.current);
      if (catchTimeoutRef.current) clearTimeout(catchTimeoutRef.current);
      setFeedbackMsg('!מוקדם מדי – המתן ל-●');
      setPhaseSync('feedback');
      setTimeout(() => {
        if (phaseRef.current !== 'feedback') return;
        setPhaseSync('iti');
        setTimeout(() => {
          if (phaseRef.current !== 'iti') return;
          advanceTrial();
        }, 600);
      }, 500);
      return;
    }

    if (p === 'target') {
      if (trial.validity === 'catch') {
        if (catchTimeoutRef.current) clearTimeout(catchTimeoutRef.current);
        if (!trial.isPractice) saveResult(trial, 'false_alarm', false, null);
        setFeedbackMsg('!לא היה יעד – אל תלחץ');
        setPhaseSync('feedback');
        setTimeout(() => {
          if (phaseRef.current !== 'feedback') return;
          setPhaseSync('iti');
          setTimeout(() => {
            if (phaseRef.current !== 'iti') return;
            advanceTrial();
          }, 600);
        }, 500);
      } else {
        const rt = performance.now() - startTimeRef.current;
        if (missTimeoutRef.current) clearTimeout(missTimeoutRef.current);
        if (!trial.isPractice) saveResult(trial, 'hit', true, Math.round(rt));
        setPhaseSync('iti');
        setTimeout(() => {
          if (phaseRef.current !== 'iti') return;
          advanceTrial();
        }, 600);
      }
    }
  }, [advanceTrial, saveResult, setPhaseSync]);

  // ── Keyboard handler ─────────────────────────────────────────────────────
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      e.preventDefault();
      handleResponse();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleResponse]);

  // ── Initialise ───────────────────────────────────────────────────────────
  useEffect(() => {
    const sid = sessionStorage.getItem('posner_session_id') ?? '';
    const name = sessionStorage.getItem('posner_participant_name') ?? '';
    if (!sid) {
      router.push('/posnerCueing');
      return;
    }
    sessionIdRef.current = sid;
    participantNameRef.current = name;

    const practiceTrials = generatePracticeTrials();
    const mainTrials = generateMainTrials();
    mainTrialsRef.current = mainTrials;

    trialsRef.current = practiceTrials;
    isPracticeRef.current = true;
    setIsPracticeUI(true);
    trialIndexRef.current = -1;

    advanceTrial();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Complete ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase === 'complete') {
      sessionStorage.setItem('posner_results', JSON.stringify(resultsRef.current));
      router.push('/posnerCueing/thanks');
    }
  }, [phase, router]);

  // ── Start main trials ────────────────────────────────────────────────────
  const startMainTrials = useCallback(() => {
    trialsRef.current = mainTrialsRef.current;
    isPracticeRef.current = false;
    setIsPracticeUI(false);
    trialIndexRef.current = -1;
    mainTrialCountRef.current = 0;
    setMainProgress(0);
    advanceTrial();
  }, [advanceTrial]);

  // ── Derived display values ───────────────────────────────────────────────
  const trial = currentTrialRef.current;
  const showCue = phase === 'cue' || phase === 'target';
  const showTarget = phase === 'target' && trial?.validity !== 'catch';

  // For exo_invalid: red rectangle on cue side, no arrow
  const isExoTrial = trial?.validity === 'exo_invalid';
  const showExoRect = showCue && isExoTrial;

  const cueSymbol = isExoTrial
    ? '+'
    : trial?.cueDirection === 'left'
    ? '←'
    : trial?.cueDirection === 'right'
    ? '→'
    : '+';
  const centerSymbol =
    phase === 'fixation'
      ? '+'
      : showCue
      ? cueSymbol
      : phase === 'iti'
      ? ''
      : '+';

  const progressPct =
    mainTrialsRef.current.length > 0
      ? (mainProgress / mainTrialsRef.current.length) * 100
      : 0;

  const showResponseButton =
    phase === 'fixation' || phase === 'cue' || phase === 'target';

  // ── Render ───────────────────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <main className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <p className="text-white text-xl">טוען...</p>
      </main>
    );
  }

  if (phase === 'practice_break') {
    return (
      <main className="min-h-screen bg-zinc-900 flex flex-col items-center justify-center gap-8 p-8">
        <div className="text-center" dir="rtl">
          <p className="text-4xl mb-4">✓</p>
          <h2 className="text-3xl font-bold text-amber-400 mb-3">!תרגול הסתיים</h2>
          <p className="text-white text-lg mb-2">עכשיו יתחיל הניסוי האמיתי.</p>
          <p className="text-zinc-400 text-sm">132 ניסיונות</p>
        </div>
        <button
          onClick={startMainTrials}
          className="px-10 py-4 bg-amber-400 hover:bg-amber-300 text-zinc-900 font-bold text-xl rounded-xl transition-colors touch-manipulation"
        >
          התחל
        </button>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-900 flex flex-col items-center justify-center select-none overflow-hidden">
      {/* Progress bar */}
      {!isPracticeUI && (
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-zinc-700">
          <div
            className="h-full bg-amber-400 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      )}

      {/* Practice indicator */}
      {isPracticeUI && (
        <div className="absolute top-4 left-0 right-0 flex justify-center">
          <span className="text-xs text-amber-400 bg-zinc-800 px-3 py-1 rounded-full border border-amber-400/30">
            תרגול
          </span>
        </div>
      )}

      {/* Experiment area – responsive */}
      <div className="flex items-center justify-center gap-4 sm:gap-10 md:gap-16 w-full px-4">
        {/* Left box */}
        <div
          className={`flex-shrink-0 w-[clamp(72px,22vw,128px)] h-[clamp(72px,22vw,128px)] rounded-lg flex items-center justify-center transition-colors duration-75
            ${showExoRect && trial?.cueDirection === 'left'
              ? 'border-4 border-red-500'
              : 'border-2 border-zinc-500'
            }`}
        >
          {showTarget && trial?.targetSide === 'left' && (
            <span className="text-white text-[clamp(28px,8vw,40px)] font-bold">●</span>
          )}
        </div>

        {/* Center fixation / cue */}
        <div className="flex-shrink-0 w-[clamp(40px,12vw,72px)] text-center">
          <span className="text-white text-[clamp(24px,7vw,40px)] font-bold select-none">
            {centerSymbol}
          </span>
        </div>

        {/* Right box */}
        <div
          className={`flex-shrink-0 w-[clamp(72px,22vw,128px)] h-[clamp(72px,22vw,128px)] rounded-lg flex items-center justify-center transition-colors duration-75
            ${showExoRect && trial?.cueDirection === 'right'
              ? 'border-4 border-red-500'
              : 'border-2 border-zinc-500'
            }`}
        >
          {showTarget && trial?.targetSide === 'right' && (
            <span className="text-white text-[clamp(28px,8vw,40px)] font-bold">●</span>
          )}
        </div>
      </div>

      {/* Feedback message */}
      {phase === 'feedback' && (
        <div className="absolute bottom-32 sm:bottom-24 left-0 right-0 flex justify-center">
          <span className="text-red-400 text-xl font-bold" dir="rtl">{feedbackMsg}</span>
        </div>
      )}

      {/* Mobile response button */}
      {showResponseButton && (
        <div className="absolute bottom-8 left-0 right-0 flex justify-center px-8">
          <button
            onPointerDown={(e) => { e.preventDefault(); handleResponse(); }}
            className="w-full max-w-xs h-16 bg-amber-400 text-zinc-900 font-bold text-xl rounded-2xl
                       shadow-lg shadow-amber-400/30 active:scale-95 transition-transform
                       touch-manipulation select-none"
          >
            לחץ ● Tap
          </button>
        </div>
      )}
    </main>
  );
}
