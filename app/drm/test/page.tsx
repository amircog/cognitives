'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { getTestItems } from '@/lib/drm/word-lists';
import { TestItem, TestResponse, DRMResult } from '@/types/drm';
import { supabase } from '@/lib/supabase';

export default function DRMTestPage() {
  const router = useRouter();
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
    const storedSessionId = sessionStorage.getItem('drm_session_id');
    const storedName = sessionStorage.getItem('drm_participant_name');
    if (!storedSessionId) {
      router.push('/drm');
      return;
    }
    setSessionId(storedSessionId);
    setParticipantName(storedName);

    const items = getTestItems();
    setTestItems(items);
    startTimeRef.current = Date.now();
  }, [router]);

  const handleResponse = (response: 'old' | 'new') => {
    if (currentIndex >= testItems.length || awaitingConfidence) return;

    // Store the response and wait for confidence rating
    setCurrentResponse(response);
    setAwaitingConfidence(true);
  };

  const handleConfidence = async (confidence: 1 | 2 | 3 | 4) => {
    if (!currentResponse || currentIndex >= testItems.length) return;

    const reactionTime = Date.now() - startTimeRef.current;
    const currentItem = testItems[currentIndex];

    // Determine if response is correct
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
      confidence
    };

    const newResponses = [...responses, testResponse];
    setResponses(newResponses);

    // Reset state
    setAwaitingConfidence(false);
    setCurrentResponse(null);

    // Move to next item or finish
    if (currentIndex + 1 >= testItems.length) {
      // Save all responses to database
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
        confidence: resp.confidence
      }));

      const { error } = await supabase.from('drm_results').insert(results);

      if (error) {
        console.error('Error saving results:', error);
        alert('שגיאה בשמירת התוצאות. אנא נסה שוב.');
        setIsSaving(false);
        return;
      }

      // Navigate to results/thanks page
      router.push('/drm/thanks');
    } catch (err) {
      console.error('Error:', err);
      alert('שגיאה בשמירת התוצאות.');
      setIsSaving(false);
    }
  };

  if (!sessionId || testItems.length === 0) return null;

  const currentItem = testItems[currentIndex];
  const progress = ((currentIndex + 1) / testItems.length) * 100;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="text-center max-w-2xl w-full">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="h-2 bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-400 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-muted mt-2">
            {currentIndex + 1} / {testItems.length}
          </p>
        </div>

        {/* Question */}
        <div className="mb-8">
          {!awaitingConfidence ? (
            <>
              <p className="text-lg text-muted mb-4" dir="rtl">
                האם ראית את המילה הזאת בשלב הלמידה?
              </p>

              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-5xl md:text-7xl font-bold text-purple-400 my-12"
              >
                {currentItem.word}
              </motion.div>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="my-12"
            >
              <p className="text-2xl font-bold text-purple-400 mb-4" dir="rtl">
                עד כמה אתה בטוח בתשובה שלך?
              </p>
              <p className="text-muted mb-8" dir="rtl">
                1 = בכלל לא בטוח | 4 = מאוד בטוח
              </p>
            </motion.div>
          )}
        </div>

        {/* Response buttons */}
        {!awaitingConfidence ? (
          <div className="flex gap-4 justify-center" dir="rtl">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleResponse('old')}
              disabled={isSaving}
              className="px-12 py-6 bg-purple-400 text-zinc-900 font-bold text-xl rounded-xl
                         shadow-lg hover:bg-purple-300 transition-colors disabled:opacity-50"
            >
              כן, ראיתי
              <br />
              <span className="text-sm font-normal">(OLD)</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleResponse('new')}
              disabled={isSaving}
              className="px-12 py-6 bg-zinc-700 text-foreground font-bold text-xl rounded-xl
                         shadow-lg hover:bg-zinc-600 transition-colors disabled:opacity-50"
            >
              לא, לא ראיתי
              <br />
              <span className="text-sm font-normal">(NEW)</span>
            </motion.button>
          </div>
        ) : (
          <div className="flex gap-3 justify-center">
            {[1, 2, 3, 4].map((conf) => (
              <motion.button
                key={conf}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleConfidence(conf as 1 | 2 | 3 | 4)}
                className="w-16 h-16 bg-purple-400 text-zinc-900 font-bold text-2xl rounded-xl
                           shadow-lg hover:bg-purple-300 transition-colors"
              >
                {conf}
              </motion.button>
            ))}
          </div>
        )}

        {isSaving && (
          <p className="text-muted mt-8">שומר תוצאות...</p>
        )}
      </div>
    </main>
  );
}
