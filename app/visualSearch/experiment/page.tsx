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

const ITEM_COLOR: Record<string, string> = { red: '#ef4444', blue: '#3b82f6' };
const DISPLAY_CENTER = 300;

const TX = {
  he: {
    loading: 'טוען...',
    practiceLabel: 'תרגול',
    practiceEnd: '!תרגול הסתיים',
    practiceEndBody: 'כעת יתחיל הניסוי האמיתי.',
    trials: '128 ניסיונות',
    target: 'היעד:',
    redT: 'T אדומה',
    blueT: 'T כחולה',
    startMain: 'התחל',
    wrong: '!תשובה שגויה',
    timeout: '!זמן אזל',
    present: 'נמצא ✓',
    absent: 'לא נמצא ✗',
  },
  en: {
    loading: 'Loading...',
    practiceLabel: 'Practice',
    practiceEnd: 'Practice Complete!',
    practiceEndBody: 'The main experiment is about to begin.',
    trials: '128 trials',
    target: 'Target:',
    redT: 'Red T',
    blueT: 'Blue T',
    startMain: 'Start',
    wrong: 'Incorrect!',
    timeout: "Time's up!",
    present: 'Present ✓',
    absent: 'Absent ✗',
  },
} as const;

export default function VisualSearchExperimentPage() {
  const router = useRouter();

  // UI state
  const [stage, setStage] = useState<Stage>('loading');
  const [currentTrial, setCurrentTrial] = useState<VisualSearchTrial | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [blockProgress, setBlockProgress] = useState(0);
  const [totalMainTrials, setTotalMainTrials] = useState(128);
  const [isPracticeUI, setIsPracticeUI] = useState(true);
  const [lang, setLang] = useState<'he' | 'en'>('he');
  // displayScale: start at 0.8 to avoid initial overflow flash on mobile
  const [displayScale, setDisplayScale] = useState(0.8);

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
  const displayContainerRef = useRef<HTMLDivElement>(null);

  const setStageSync = useCallback((s: Stage) => {
    stageRef.current = s;
    setStage(s);
  }, []);

  // ── Compute display scale based on available area ────────────────────────
  // ResizeObserver fires on initial observation AND on any layout change
  // (orientation, address-bar hide/show, etc.) — more reliable than window resize.
  useEffect(() => {
    const containerEl = displayContainerRef.current;
    if (!containerEl) return;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width === 0 || height === 0) return;
      const available = Math.min(width * 0.98, height * 0.98, 500);
      setDisplayScale(available / 600);
    });
    observer.observe(containerEl);
    return () => observer.disconnect();
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
      if (isPracticeRef.current) { setStageSync('practice_break'); return; }
      else { setStageSync('complete'); return; }
    }

    trialIndexRef.current = nextIndex;
    const trial = trials[nextIndex];
    currentTrialRef.current = trial;
    setCurrentTrial(trial);

    if (!isPracticeRef.current) {
      mainTrialCountRef.current += 1;
      setBlockProgress(mainTrialCountRef.current);
    }

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
          if (isPracticeRef.current) {
            setFeedbackMsg(TX[lang].timeout);
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
        }, 5000);
      }, 200);
    }, 500);
  }, [saveResult, setStageSync]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Response handler ─────────────────────────────────────────────────────
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

    if (!correct && isPracticeRef.current) {
      setFeedbackMsg(TX[lang].wrong);
      setStageSync('feedback');
      timeoutRef.current = setTimeout(() => {
        if (stageRef.current !== 'feedback') return;
        setStageSync('iti');
        timeoutRef.current = setTimeout(() => { if (stageRef.current !== 'iti') return; advanceTrial(); }, 500);
      }, 500);
    } else {
      setStageSync('iti');
      timeoutRef.current = setTimeout(() => { if (stageRef.current !== 'iti') return; advanceTrial(); }, 500);
    }
  }, [advanceTrial, lang, saveResult, setStageSync]);

  // ── Initialise ───────────────────────────────────────────────────────────
  useEffect(() => {
    const sid = sessionStorage.getItem('vs_session_id') ?? '';
    const name = sessionStorage.getItem('vs_participant_name') ?? '';
    if (!sid) { router.push('/visualSearch'); return; }
    const savedLang = sessionStorage.getItem('vs_language') as 'he' | 'en' | null;
    if (savedLang) setLang(savedLang);
    sessionIdRef.current = sid;
    participantNameRef.current = name;

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
    setIsPracticeUI(false);
    trialIndexRef.current = -1;
    mainTrialCountRef.current = 0;
    setBlockProgress(0);
    advanceTrial();
  }, [advanceTrial]);

  const progressPct = totalMainTrials > 0 ? (blockProgress / totalMainTrials) * 100 : 0;
  const trial = currentTrial;

  const tx = TX[lang];

  // ── Loading ──────────────────────────────────────────────────────────────
  if (stage === 'loading') {
    return (
      <main className="bg-[#0f172a] flex items-center justify-center" style={{ height: '100dvh' }}>
        <p className="text-white text-xl">{tx.loading}</p>
      </main>
    );
  }

  // ── Practice break ───────────────────────────────────────────────────────
  if (stage === 'practice_break') {
    const tc = targetColorRef.current;
    return (
      <main className="bg-[#0f172a] flex flex-col items-center justify-center gap-4 p-6" style={{ height: '100dvh' }}>
        <div className="text-center" dir={lang === 'he' ? 'rtl' : 'ltr'}>
          <p className="text-3xl mb-3">✓</p>
          <h2 className="text-2xl font-bold text-rose-400 mb-2">{tx.practiceEnd}</h2>
          <p className="text-white text-base mb-1">{tx.practiceEndBody}</p>
          <p className="text-zinc-400 text-sm mb-2">{tx.trials}</p>
          <p className="text-zinc-300 text-sm">
            {tx.target}{' '}
            <span style={{ color: ITEM_COLOR[tc], fontWeight: 'bold', fontFamily: 'monospace', fontSize: 18 }}>T</span>
            {' '}({tc === 'red' ? tx.redT : tx.blueT})
          </p>
        </div>
        <button
          onClick={startMainTrials}
          className="px-10 py-3 bg-rose-500 hover:bg-rose-400 text-white font-bold text-lg rounded-xl transition-colors touch-manipulation"
        >
          {tx.startMain}
        </button>
      </main>
    );
  }

  // ── Main experiment layout ───────────────────────────────────────────────
  return (
    <main className="bg-[#0f172a] flex flex-col select-none" style={{ height: '100dvh', touchAction: 'manipulation' }}>

      {/* Top bar: progress / practice label */}
      <div className="flex-shrink-0" style={{ height: 24 }}>
        {!isPracticeUI && (
          <div className="h-1.5 bg-zinc-700">
            <div className="h-full bg-rose-500 transition-all duration-300" style={{ width: `${progressPct}%` }} />
          </div>
        )}
        {isPracticeUI && (
          <div className="flex justify-center pt-1">
            <span className="text-xs text-rose-400 bg-zinc-800 px-3 py-0.5 rounded-full border border-rose-400/30">
              {tx.practiceLabel}
            </span>
          </div>
        )}
      </div>

      {/* Centre: display area — flex-1 so it fills remaining space */}
      <div
        ref={displayContainerRef}
        className="flex-1 flex items-center justify-center overflow-hidden"
      >
        {/* Fixation */}
        {stage === 'fixation' && (
          <span className="text-white text-4xl font-bold">+</span>
        )}

        {/* Blank or ITI */}
        {(stage === 'blank' || stage === 'iti') && (
          <span className="opacity-0">.</span>
        )}

        {/* Search display — scaled to fit */}
        {stage === 'search' && trial && (
          <div
            style={{
              width: 600 * displayScale,
              height: 600 * displayScale,
              position: 'relative',
              flexShrink: 0,
            }}
          >
            {/* Inner 600×600 coordinate space, scaled via transform */}
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

      {/* Bottom: response buttons — always visible */}
      <div className="flex-shrink-0 flex justify-center gap-4 px-6 pb-6 pt-3">
        <button
          onPointerDown={(e) => { e.preventDefault(); handleResponse('present'); }}
          className="flex-1 max-w-[170px] bg-emerald-600 text-white font-bold rounded-2xl
                     shadow-lg active:scale-95 transition-transform touch-manipulation select-none
                     flex items-center justify-center"
          style={{ height: 64 }}
        >
          {tx.present}
        </button>
        <button
          onPointerDown={(e) => { e.preventDefault(); handleResponse('absent'); }}
          className="flex-1 max-w-[170px] bg-rose-600 text-white font-bold rounded-2xl
                     shadow-lg active:scale-95 transition-transform touch-manipulation select-none
                     flex items-center justify-center"
          style={{ height: 64 }}
        >
          {tx.absent}
        </button>
      </div>
    </main>
  );
}
