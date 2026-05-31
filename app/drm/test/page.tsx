'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { getTestItems } from '@/lib/drm/word-lists';
import { TestItem, TestResponse, DRMResult } from '@/types/drm';
import { getSupabase } from '@/lib/supabase';

const KEY = 'drm';

const LABELS_HE = ['בטוחה שלא', 'חושבת שלא', 'חושבת שכן', 'בטוחה שכן'] as const;
const LABELS_EN = ['Sure no', 'Think no', 'Think yes', 'Sure yes'] as const;

export default function DRMTestPage() {
  const router = useRouter();
  const [lang, setLang] = useState<'he' | 'en'>('he');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [participantName, setParticipantName] = useState<string | null>(null);
  const [testItems, setTestItems] = useState<TestItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<TestResponse[]>([]);
  const [isSaving, setIsSaving] = useState(false);
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

  const handleResponse = async (rating: 1 | 2 | 3 | 4) => {
    if (currentIndex >= testItems.length) return;

    const reactionTime = Date.now() - startTimeRef.current;
    const currentItem = testItems[currentIndex];
    const response: 'old' | 'new' = rating >= 3 ? 'old' : 'new';

    const isCorrect =
      (currentItem.itemType === 'studied' && response === 'old') ||
      (currentItem.itemType !== 'studied' && response === 'new');

    const testResponse: TestResponse = {
      word: currentItem.word,
      itemType: currentItem.itemType,
      listTheme: currentItem.listTheme,
      response,
      isCorrect,
      reactionTimeMs: reactionTime,
      serialPosition: currentItem.serialPosition,
      confidence: rating,
    };

    const newResponses = [...responses, testResponse];
    setResponses(newResponses);

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
  const labels = he ? LABELS_HE : LABELS_EN;
  const colors = [
    'bg-zinc-700 hover:bg-zinc-600 text-foreground',
    'bg-zinc-600 hover:bg-zinc-500 text-foreground',
    'bg-emerald-600 hover:bg-emerald-500 text-white',
    'bg-emerald-400 hover:bg-emerald-300 text-zinc-900',
  ];

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
          <p className="text-lg text-muted mb-4" dir={he ? 'rtl' : 'ltr'}>
            {he ? 'האם המילה הזאת הופיעה באחת הרשימות?' : 'Did this word appear in one of the lists?'}
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

          <div className="flex gap-3 justify-center flex-wrap" dir={he ? 'rtl' : 'ltr'}>
            {([1, 2, 3, 4] as const).map((rating) => (
              <button
                key={rating}
                onClick={() => handleResponse(rating)}
                disabled={isSaving}
                className={`px-6 py-4 font-bold text-base rounded-xl shadow-lg transition-colors
                           disabled:opacity-50 touch-manipulation min-w-[120px] ${colors[rating - 1]}`}
              >
                {labels[rating - 1]}
              </button>
            ))}
          </div>

          {isSaving && (
            <p className="text-muted mt-8">{he ? 'שומרת תוצאות...' : 'Saving results...'}</p>
          )}
        </div>
      </div>
    </main>
  );
}
