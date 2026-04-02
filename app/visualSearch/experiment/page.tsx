'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { VisualSearchTrial, VisualSearchResult } from '@/types/visual-search';
import { generatePracticeTrials, generateMainTrials } from '@/lib/visual-search/experiment';
import { getSupabase } from '@/lib/supabase';

type Stage =
  | 'loading'
  | 'fixation'
  | 'blank'
  | 'search'
  | 'feedback'
  | 'iti'
  | 'practice_break'
  | 'complete';

const ITEM_COLOR: Record<string, string> = {
  red: '#ef4444',
  blue: '#3b82f6',
};

const DISPLAY_CENTER = 300; // 600×600 coordinate space

export default function VisualSearchExperimentPage() {
  const router = useRouter();

  // UI state
  const [stage, setStage] = useState<Stage>('loading');
  const [currentTrial, setCurrentTrial] = useState<VisualSearchTrial | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [blockProgress, setBlockProgress] = useState(0);
  const [totalMainTrials, setTotalMainTrials] = useState(128);
  const [displayScale, setDisplayScale] = useState(1);

  // Refs
  const stageRef = useRef<Stage>('loading');
  const trialIndexRef = useRef(0);
  const currentTrialRef = useRef<VisualSearchTrial | null>(null);
  const startTimeRef = useRef(0);
  const resultsRef = useRef<VisualSearchResult[]>([]);
  const trialsRef = useRef<VisualSearchTrial[]>([]);
  const mainTrialsRef = useRef<VisualSearchTrial[]>([]);
  const sessionIdRef = useRef('');
  const participantNameRef = useRef('');
  const targetColorRef = useRef<'red' | 'blue'>('red');
  const isPracticeRef = useRef(true);
  const mainTrialCountRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const setStageSync = useCallback((s: Stage) => {
    stageRef.current = s;
    setStage(s);
  }, []);

  // Responsive scaling
  useEffect(() => {
    const updateScale = () => {
      const w = containerRef.current?.clientWidth ?? window.innerWidth;
      const h = window.innerHeight;
      const available = Math.min(w * 0.95, h * 0.6, 520);
      setDisplayScale(available / 600);
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  // ── Save result ──────────────────────────────────────────────────────────
  const saveResult = useCallback(
    (trial: VisualSearchTrial, response: string, correct: boolean, rt: number) => {
      const targetItem = trial.items.find(item => item.isTarget);
      const targetDist = targetItem
        ? Math.round(Math.sqrt((targetItem.x - DISPLAY_CENTER) ** 2 + (targetItem.y - DISPLAY_CENTER) ** 2))
        : null;

      const result: VisualSearchResult = {
        session_id: sessionIdRef.current,
        participant_name: participantNameRef.current,
        trial_number: trial.id,
        target_set_size: trial.targetSetSize,
        distractor_set_size: trial.distractorSetSize,
        target_present: trial.targetPresent,
        target_color: trial.targetColor,
        response,
        correct,
        rt_ms: rt,
        target_distance_from_center: targetDist,
        is_practice: trial.isPractice,
      };
      resultsRef.current.push(result);

      const supabase = getSupabase();
      if (supabase) {
        supabase.from('visual_search_results').insert(result).then(({ error }) => {
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
        setStageSync('practice_break');
        return;
      } else {
        setStageSync('complete');
        return;
      }
    }

    trialIndexRef.current = nextIndex;
    const trial = trials[nextIndex];
    currentTrialRef.current = trial;
    setCurrentTrial(trial);

    if (!isPracticeRef.current) {
      mainTrialCountRef.current += 1;
      setBlockProgress(mainTrialCountRef.current);
    }

    // Fixation 500ms → blank 200ms → search (5000ms timeout)
    setStageSync('fixation');
    timeoutRef.current = setTimeout(() => {
      if (stageRef.current !== 'fixation') return;
      setStageSync('blank');
      timeoutRef.current = setTimeout(() => {
        if (stageRef.current !== 'blank') return;
        startTimeRef.current = performance.now();
        setStageSync('search');
        timeoutRef.current = setTimeout(() => {
          if (stageRef.current !== 'search') return;
          saveResult(trial, 'timeout', false, 5000);
          setFeedbackMsg('!זמן אזל');
          setStageSync('feedback');
          timeoutRef.current = setTimeout(() => {
            if (stageRef.current !== 'feedback') return;
            setStageSync('iti');
            timeoutRef.current = setTimeout(() => {
              if (stageRef.current !== 'iti') return;
              advanceTrial();
            }, 500);
          }, 500);
        }, 5000);
      }, 200);
    }, 500);
  }, [saveResult, setStageSync]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Unified response handler ─────────────────────────────────────────────
  const handleResponse = useCallback((response: 'present' | 'absent') => {
    if (stageRef.current !== 'search') return;
    const trial = currentTrialRef.current;
    if (!trial) return;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    const rt = Math.round(performance.now() - startTimeRef.current);
    const correct =
      (response === 'present' && trial.targetPresent) ||
      (response === 'absent' && !trial.targetPresent);

    saveResult(trial, response, correct, rt);

    if (!correct) {
      setFeedbackMsg('!תשובה שגויה');
      setStageSync('feedback');
      timeoutRef.current = setTimeout(() => {
        if (stageRef.current !== 'feedback') return;
        setStageSync('iti');
        timeoutRef.current = setTimeout(() => {
          if (stageRef.current !== 'iti') return;
          advanceTrial();
        }, 500);
      }, 500);
    } else {
      setStageSync('iti');
      timeoutRef.current = setTimeout(() => {
        if (stageRef.current !== 'iti') return;
        advanceTrial();
      }, 500);
    }
  }, [advanceTrial, saveResult, setStageSync]);

  // ── Keyboard handler ─────────────────────────────────────────────────────
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyL') { e.preventDefault(); handleResponse('present'); }
      else if (e.code === 'KeyA') { e.preventDefault(); handleResponse('absent'); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleResponse]);

  // ── Initialise ───────────────────────────────────────────────────────────
  useEffect(() => {
    const sid = sessionStorage.getItem('vs_session_id') ?? '';
    const name = sessionStorage.getItem('vs_participant_name') ?? '';
    if (!sid) {
      router.push('/visualSearch');
      return;
    }
    sessionIdRef.current = sid;
    participantNameRef.current = name;

    // Assign/read target color counterbalancing
    let tc = sessionStorage.getItem('vs_target_color') as 'red' | 'blue' | null;
    if (!tc) {
      tc = Math.random() < 0.5 ? 'red' : 'blue';
      sessionStorage.setItem('vs_target_color', tc);
    }
    targetColorRef.current = tc;

    const practiceTrials = generatePracticeTrials(tc);
    const mainTrials = generateMainTrials(tc);
    mainTrialsRef.current = mainTrials;
    setTotalMainTrials(mainTrials.length);

    trialsRef.current = practiceTrials;
    isPracticeRef.current = true;
    trialIndexRef.current = -1;

    advanceTrial();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Complete ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (stage === 'complete') {
      sessionStorage.setItem('visual_search_results', JSON.stringify(resultsRef.current));
      router.push('/visualSearch/thanks');
    }
  }, [stage, router]);

  // ── Start main trials ────────────────────────────────────────────────────
  const startMainTrials = useCallback(() => {
    trialsRef.current = mainTrialsRef.current;
    isPracticeRef.current = false;
    trialIndexRef.current = -1;
    mainTrialCountRef.current = 0;
    setBlockProgress(0);
    advanceTrial();
  }, [advanceTrial]);

  // ── Render ───────────────────────────────────────────────────────────────
  const progressPct = totalMainTrials > 0 ? (blockProgress / totalMainTrials) * 100 : 0;
  const trial = currentTrial;

  if (stage === 'loading') {
    return (
      <main className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <p className="text-white text-xl">טוען...</p>
      </main>
    );
  }

  if (stage === 'practice_break') {
    const tc = targetColorRef.current;
    return (
      <main className="min-h-screen bg-zinc-900 flex flex-col items-center justify-center gap-8 p-8">
        <div className="text-center" dir="rtl">
          <p className="text-4xl mb-4">✓</p>
          <h2 className="text-3xl font-bold text-rose-400 mb-3">!תרגול הסתיים</h2>
          <p className="text-white text-lg mb-2">כעת יתחיל הניסוי האמיתי.</p>
          <p className="text-zinc-400 text-sm mb-3">128 ניסיונות</p>
          <p className="text-zinc-300 text-sm">
            היעד שלך:{' '}
            <span style={{ color: ITEM_COLOR[tc], fontWeight: 'bold', fontFamily: 'monospace', fontSize: 18 }}>T</span>
            {' '}({tc === 'red' ? 'T אדומה' : 'T כחולה'})
          </p>
        </div>
        <button
          onClick={startMainTrials}
          className="px-10 py-4 bg-rose-500 hover:bg-rose-400 text-white font-bold text-xl rounded-xl transition-colors touch-manipulation"
        >
          התחל
        </button>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-900 flex flex-col items-center justify-center select-none overflow-hidden">
      {/* Progress bar */}
      {!isPracticeRef.current && (
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-zinc-700">
          <div
            className="h-full bg-rose-500 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      )}

      {/* Practice label */}
      {isPracticeRef.current && (
        <div className="absolute top-3 left-0 right-0 flex justify-center">
          <span className="text-xs text-rose-400 bg-zinc-800 px-3 py-1 rounded-full border border-rose-400/30">
            תרגול
          </span>
        </div>
      )}

      {/* Main experiment area */}
      <div ref={containerRef} className="flex flex-col items-center justify-center w-full px-2">
        {/* Fixation */}
        {stage === 'fixation' && (
          <span className="text-white text-4xl font-bold select-none">+</span>
        )}

        {/* Blank / ITI */}
        {(stage === 'blank' || stage === 'iti') && (
          <span className="text-transparent select-none">.</span>
        )}

        {/* Search display – scaled for mobile */}
        {stage === 'search' && trial && (
          <div
            style={{
              width: 600 * displayScale,
              height: 600 * displayScale,
              position: 'relative',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: 600,
                height: 600,
                transform: `scale(${displayScale})`,
                transformOrigin: 'top left',
              }}
            >
              {trial.items.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    position: 'absolute',
                    left: item.x - 20,
                    top: item.y - 20,
                    width: 40,
                    height: 40,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transform: `rotate(${item.rotation}deg)`,
                  }}
                >
                  <span
                    style={{
                      color: ITEM_COLOR[item.color],
                      fontSize: 38,
                      fontFamily: 'monospace',
                      fontWeight: 'bold',
                      lineHeight: 1,
                      userSelect: 'none',
                    }}
                  >
                    {item.letter}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Feedback */}
        {stage === 'feedback' && (
          <span className="text-red-400 text-2xl font-bold" dir="rtl">{feedbackMsg}</span>
        )}
      </div>

      {/* Response buttons (always shown at bottom) */}
      <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-4 px-6">
        <button
          onPointerDown={(e) => { e.preventDefault(); handleResponse('present'); }}
          className="flex-1 max-w-[160px] h-14 bg-emerald-500 text-white font-bold text-base rounded-xl
                     shadow-lg active:scale-95 transition-transform touch-manipulation select-none"
        >
          <span className="block text-lg leading-tight">נמצא</span>
          <span className="block text-xs opacity-70">L</span>
        </button>
        <button
          onPointerDown={(e) => { e.preventDefault(); handleResponse('absent'); }}
          className="flex-1 max-w-[160px] h-14 bg-rose-500 text-white font-bold text-base rounded-xl
                     shadow-lg active:scale-95 transition-transform touch-manipulation select-none"
        >
          <span className="block text-lg leading-tight">לא נמצא</span>
          <span className="block text-xs opacity-70">A</span>
        </button>
      </div>
    </main>
  );
}
