'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { VisualSearchTrial, VisualSearchResult, SearchType } from '@/types/visual-search';
import {
  generatePracticeTrials,
  generateBlockTrials,
  getBlockOrder,
} from '@/lib/visual-search/experiment';
import { getSupabase } from '@/lib/supabase';

type Stage =
  | 'loading'
  | 'fixation'
  | 'blank'
  | 'search'
  | 'feedback'
  | 'iti'
  | 'practice_break'
  | 'block_break'
  | 'complete';

const ITEM_COLOR: Record<string, string> = {
  red: '#ef4444',
  blue: '#3b82f6',
};

export default function VisualSearchExperimentPage() {
  const router = useRouter();

  // UI state
  const [stage, setStage] = useState<Stage>('loading');
  const [currentTrial, setCurrentTrial] = useState<VisualSearchTrial | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [blockProgress, setBlockProgress] = useState(0);
  const [totalBlockTrials, setTotalBlockTrials] = useState(60);
  const [stageLabel, setStageLabel] = useState('');

  // Refs to avoid stale closures
  const stageRef = useRef<Stage>('loading');
  const trialIndexRef = useRef(0);
  const currentTrialRef = useRef<VisualSearchTrial | null>(null);
  const startTimeRef = useRef(0);
  const resultsRef = useRef<VisualSearchResult[]>([]);
  const trialsRef = useRef<VisualSearchTrial[]>([]);
  const sessionIdRef = useRef('');
  const participantNameRef = useRef('');
  const blockOrderRef = useRef<['feature', 'conjunction'] | ['conjunction', 'feature']>(['feature', 'conjunction']);
  const currentBlockIndexRef = useRef(0); // 0 = block1, 1 = block2
  const block1TrialsRef = useRef<VisualSearchTrial[]>([]);
  const block2TrialsRef = useRef<VisualSearchTrial[]>([]);
  const blockTrialCountRef = useRef(0);
  const isPracticeRef = useRef(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setStageSync = useCallback((s: Stage) => {
    stageRef.current = s;
    setStage(s);
  }, []);

  // ── Save result ──────────────────────────────────────────────────────────
  const saveResult = useCallback(
    (
      trial: VisualSearchTrial,
      response: string,
      correct: boolean,
      rt: number,
      blockName: string,
    ) => {
      const result: VisualSearchResult = {
        session_id: sessionIdRef.current,
        participant_name: participantNameRef.current,
        trial_number: trial.id,
        block: blockName,
        set_size: trial.setSize,
        target_present: trial.targetPresent,
        response,
        correct,
        rt_ms: rt,
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
      }
      // End of a block
      if (currentBlockIndexRef.current === 0) {
        // First block done → block break
        setStageSync('block_break');
        return;
      } else {
        // Second block done → complete
        setStageSync('complete');
        return;
      }
    }

    trialIndexRef.current = nextIndex;
    const trial = trials[nextIndex];
    currentTrialRef.current = trial;
    setCurrentTrial(trial);

    if (!isPracticeRef.current) {
      blockTrialCountRef.current += 1;
      setBlockProgress(blockTrialCountRef.current);
    }

    // Fixation 500ms
    setStageSync('fixation');
    timeoutRef.current = setTimeout(() => {
      if (stageRef.current !== 'fixation') return;
      // Blank 200ms
      setStageSync('blank');
      timeoutRef.current = setTimeout(() => {
        if (stageRef.current !== 'blank') return;
        // Search
        startTimeRef.current = performance.now();
        setStageSync('search');
        // Timeout 5000ms
        timeoutRef.current = setTimeout(() => {
          if (stageRef.current !== 'search') return;
          // Timeout = incorrect
          const blockName = isPracticeRef.current
            ? 'practice'
            : blockOrderRef.current[currentBlockIndexRef.current];
          saveResult(trial, 'timeout', false, 5000, blockName);
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

  // ── Keyboard handler ─────────────────────────────────────────────────────
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (stageRef.current !== 'search') return;
      const trial = currentTrialRef.current;
      if (!trial) return;

      let response: string | null = null;
      if (e.code === 'KeyL') response = 'present';
      else if (e.code === 'KeyA') response = 'absent';
      else return;

      e.preventDefault();

      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      const rt = Math.round(performance.now() - startTimeRef.current);
      const correct =
        (response === 'present' && trial.targetPresent) ||
        (response === 'absent' && !trial.targetPresent);

      const blockName = isPracticeRef.current
        ? 'practice'
        : blockOrderRef.current[currentBlockIndexRef.current];

      saveResult(trial, response, correct, rt, blockName);

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
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [advanceTrial, saveResult, setStageSync]);

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

    const blockOrder = getBlockOrder();
    blockOrderRef.current = blockOrder;
    sessionStorage.setItem('visual_search_block_order', JSON.stringify(blockOrder));

    const b1 = generateBlockTrials(blockOrder[0]);
    const b2 = generateBlockTrials(blockOrder[1]);
    block1TrialsRef.current = b1;
    block2TrialsRef.current = b2;

    const practiceTrials = generatePracticeTrials();
    trialsRef.current = practiceTrials;
    isPracticeRef.current = true;
    trialIndexRef.current = -1;
    setTotalBlockTrials(60);

    const blockLabel =
      blockOrder[0] === 'feature' ? 'מערכת 1: חיפוש תכונה' : 'מערכת 1: חיפוש צירוף';
    setStageLabel(blockLabel);

    advanceTrial();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Complete ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (stage === 'complete') {
      sessionStorage.setItem('visual_search_results', JSON.stringify(resultsRef.current));
      router.push('/visualSearch/thanks');
    }
  }, [stage, router]);

  // ── Start main trials after practice break ───────────────────────────────
  const startBlock = useCallback(
    (blockIndex: number) => {
      currentBlockIndexRef.current = blockIndex;
      trialsRef.current = blockIndex === 0 ? block1TrialsRef.current : block2TrialsRef.current;
      isPracticeRef.current = false;
      trialIndexRef.current = -1;
      blockTrialCountRef.current = 0;
      setBlockProgress(0);
      setTotalBlockTrials(60);

      const blockOrder = blockOrderRef.current;
      const blockType: SearchType = blockOrder[blockIndex];
      const label =
        blockType === 'feature'
          ? `מערכת ${blockIndex + 1}: חיפוש תכונה`
          : `מערכת ${blockIndex + 1}: חיפוש צירוף`;
      setStageLabel(label);

      advanceTrial();
    },
    [advanceTrial],
  );

  // ── Render helpers ───────────────────────────────────────────────────────
  const progressPct = totalBlockTrials > 0 ? (blockProgress / totalBlockTrials) * 100 : 0;

  if (stage === 'loading') {
    return (
      <main className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <p className="text-white text-xl">טוען...</p>
      </main>
    );
  }

  if (stage === 'practice_break') {
    return (
      <main className="min-h-screen bg-zinc-900 flex flex-col items-center justify-center gap-8 p-8">
        <div className="text-center" dir="rtl">
          <p className="text-4xl mb-4">✓</p>
          <h2 className="text-3xl font-bold text-rose-400 mb-3">!תרגול הסתיים</h2>
          <p className="text-white text-lg mb-2">כעת יתחיל הניסוי האמיתי.</p>
          <p className="text-zinc-400 text-sm">120 ניסיונות, בשתי מערכות</p>
        </div>
        <button
          onClick={() => startBlock(0)}
          className="px-10 py-4 bg-rose-500 hover:bg-rose-400 text-white font-bold text-xl rounded-xl transition-colors"
        >
          התחל
        </button>
      </main>
    );
  }

  if (stage === 'block_break') {
    return (
      <main className="min-h-screen bg-zinc-900 flex flex-col items-center justify-center gap-8 p-8">
        <div className="text-center" dir="rtl">
          <p className="text-4xl mb-4">⏸</p>
          <h2 className="text-3xl font-bold text-rose-400 mb-3">!הפסקה</h2>
          <p className="text-white text-lg mb-2">אתם באמצע הניסוי. קחו הפסקה קצרה.</p>
          <p className="text-zinc-400 text-sm">מערכת שנייה תתחיל כשתהיו מוכנים.</p>
        </div>
        <button
          onClick={() => startBlock(1)}
          className="px-10 py-4 bg-rose-500 hover:bg-rose-400 text-white font-bold text-xl rounded-xl transition-colors"
        >
          המשך למערכת השנייה
        </button>
      </main>
    );
  }

  const trial = currentTrial;

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

      {/* Top label */}
      <div className="absolute top-3 left-0 right-0 flex justify-center gap-4">
        {isPracticeRef.current ? (
          <span className="text-xs text-rose-400 bg-zinc-800 px-3 py-1 rounded-full border border-rose-400/30">
            תרגול
          </span>
        ) : (
          <span className="text-xs text-zinc-400 bg-zinc-800 px-3 py-1 rounded-full">
            {stageLabel}
          </span>
        )}
      </div>

      {/* Fixation */}
      {stage === 'fixation' && (
        <span className="text-white text-4xl font-bold select-none">+</span>
      )}

      {/* Blank */}
      {stage === 'blank' && <span className="text-transparent select-none">.</span>}

      {/* Search display */}
      {stage === 'search' && trial && (
        <div
          className="relative"
          style={{ width: 600, height: 600, flexShrink: 0 }}
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
      )}

      {/* ITI */}
      {(stage === 'iti') && <span className="text-transparent select-none">.</span>}

      {/* Feedback */}
      {stage === 'feedback' && (
        <div className="flex flex-col items-center gap-4">
          <span className="text-red-400 text-2xl font-bold" dir="rtl">{feedbackMsg}</span>
        </div>
      )}

      {/* Key reminder at bottom */}
      {stage === 'search' && (
        <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-8 text-sm text-zinc-500">
          <span>
            <kbd className="px-2 py-0.5 bg-zinc-800 rounded text-zinc-300 font-mono">L</kbd>{' '}
            נמצא
          </span>
          <span>
            <kbd className="px-2 py-0.5 bg-zinc-800 rounded text-zinc-300 font-mono">A</kbd>{' '}
            לא נמצא
          </span>
        </div>
      )}
    </main>
  );
}
