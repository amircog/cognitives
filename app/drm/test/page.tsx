'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { getTestItems } from '@/lib/drm/word-lists';
import { TestItem, TestResponse, DRMResult } from '@/types/drm';
import { getSupabase } from '@/lib/supabase';

const KEY = 'drm';

const CONFIDENCE_LABELS_HE = ['בטוחה שחדש', 'כנראה חדש', 'כנראה ישן', 'בטוחה שישן'];
const CONFIDENCE_LABELS_EN = ['Sure new', 'Probably new', 'Probably old', 'Sure old'];

export default function DRMTestPage() {
  const router = useRouter();
  const [lang, setLang] = useState<'he' | 'en'>('he');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [participantName, setParticipantName] = useState<string | null>(null);
  const [testItems, setTestItems] = useState<TestItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<TestResponse[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [awaitingConfidence, setAwaitingConfidence] = useState(false);
  const [currentResponse, setCurrentResponse] = useState<'old' | 'new' | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    const sid = sessionStorage.getItem(`${KEY}_session_id`);
    const name = sessionStorage.getItem(`${KEY}_participant_name`);
    const l = sessionStorage.getItem(`${KEY}_language`) as 'he' | 'en' | null;
    if (!sid) { router.push('/drm'); return; }
    setSessionId(sid);
    setParticipantName(name);
    if (l) setLang(l);

    const items = getTestItems();
    setTestItems(items);
    startTimeRef.current = Date.now();
  }, [router]);

  const handleResponse = (response: 'old' | 'new') => {
    if (currentIndex >= testItems.length || awaitingConfidence) return;
    setCurrentResponse(response);
    setAwaitingConfidence(true);
  };

  const handleConfidence = async (confidence: 1 | 2 | 3 | 4) => {
    if (!currentResponse || currentIndex >= testItems.length) return;

    const reactionTime = Date.now() - startTimeRef.current;
    const currentItem = testItems[currentIndex];

    const isCorrect =
      (currentItem.itemType === 'studied' && currentResponse === 'old') ||
      (currentItem.itemType !== 'studied' && currentResponse === 'new');

    const testResponse: TestResponse = {
      word: currentItem.word,
      itemType: currentItem.itemType,
      listTheme: currentItem.listTheme,
      response: currentResponse,
      isCorrect,
      reactionTimeMs: reactionTime,
      serialPosition: currentItem.serialPosition,
      confidence,
    };

    const newResponses = [...responses, testResponse];
    setResponses(newResponses);
    setAwaitingConfidence(false);
    setCurrentResponse(null);

    if (currentIndex + 1 >= testItems.length) {
      await saveResponses(newResponses);
    } else {
      setCurrentIndex(currentIndex + 1);
      startTimeRef.current = Date.now();
    }
  };

  const saveResponses = async (allResponses: TestResponse[]) => {
    if (!sessionId) return;
    setIsSaving(true);

    try {
      const supabase = getSupabase();
      if (!supabase) { router.push('/drm/thanks'); return; }

      const results: DRMResult[] = allResponses.map((resp) => ({
        session_id: sessionId,
        participant_name: participantName || undefined,
        word: resp.word,
        item_type: resp.itemType,
        list_theme: resp.listTheme,
        response: resp.response,
        is_correct: resp.isCorrect,
        reaction_time_ms: resp.reactionTimeMs,
        serial_position: resp.serialPosition,
        confidence: resp.confidence,
      }));

      const batchSize = 50;
      for (let i = 0; i < results.length; i += batchSize) {
        const batch = results.slice(i, i + batchSize);
        const { error } = await supabase.from('drm_results').insert(batch);
        if (error) {
          console.error('Error saving results:', error);
          alert(lang === 'he'
            ? `שגיאה בשמירת התוצאות: ${error.message}`
            : `Error saving results: ${error.message}`);
          setIsSaving(false);
          return;
        }
      }

      router.push('/drm/thanks');
    } catch (err) {
      console.error('Error:', err);
      setIsSaving(false);
    }
  };

  const he = lang === 'he';

  if (!sessionId || testItems.length === 0) return null;

  const currentItem = testItems[currentIndex];
  const progress = ((currentIndex + 1) / testItems.length) * 100;
  const confLabels = he ? CONFIDENCE_LABELS_HE : CONFIDENCE_LABELS_EN;

  return (
    <main style={{ height: '100dvh' }} className="flex flex-col p-8">
      <div className="flex-shrink-0 mb-4">
        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-emerald-500"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
        <p className="text-xs text-muted mt-1 text-center">
          {currentIndex + 1} / {testItems.length}
        </p>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-2xl w-full">
          {!awaitingConfidence ? (
            <>
              <p className="text-lg text-muted mb-4" dir={he ? 'rtl' : 'ltr'}>
                {he ? 'האם המילה הזאת הוצגה באחת הרשימות?' : 'Was this word presented in one of the lists?'}
              </p>

              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-5xl md:text-7xl font-bold text-emerald-400 my-12"
                style={{ fontFamily: 'monospace' }}
              >
                {currentItem.word}
              </motion.div>

              <div className="flex gap-4 justify-center" dir={he ? 'rtl' : 'ltr'}>
                <button
                  onClick={() => handleResponse('old')}
                  disabled={isSaving}
                  className="px-12 py-6 bg-emerald-400 text-zinc-900 font-bold text-xl rounded-xl
                             shadow-lg hover:bg-emerald-300 transition-colors disabled:opacity-50 touch-manipulation"
                >
                  {he ? 'כן, ראיתי' : 'Yes (OLD)'}
                </button>
                <button
                  onClick={() => handleResponse('new')}
                  disabled={isSaving}
                  className="px-12 py-6 bg-zinc-700 text-foreground font-bold text-xl rounded-xl
                             shadow-lg hover:bg-zinc-600 transition-colors disabled:opacity-50 touch-manipulation"
                >
                  {he ? 'לא, לא ראיתי' : 'No (NEW)'}
                </button>
              </div>
            </>
          ) : (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="my-8">
              <p className="text-2xl font-bold text-emerald-400 mb-6" dir={he ? 'rtl' : 'ltr'}>
                {he ? 'עד כמה את בטוחה בתשובה?' : 'How confident are you?'}
              </p>
              <div className="flex gap-3 justify-center flex-wrap">
                {([1, 2, 3, 4] as const).map((conf) => (
                  <button
                    key={conf}
                    onClick={() => handleConfidence(conf)}
                    className="flex flex-col items-center gap-1 px-4 py-3 bg-emerald-400 text-zinc-900
                               font-bold rounded-xl shadow-lg hover:bg-emerald-300 transition-colors
                               touch-manipulation min-w-[80px]"
                  >
                    <span className="text-2xl">{conf}</span>
                    <span className="text-[10px] font-normal leading-tight">{confLabels[conf - 1]}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {isSaving && (
            <p className="text-muted mt-8">{he ? 'שומרת תוצאות...' : 'Saving results...'}</p>
          )}
        </div>
      </div>
    </main>
  );
}
