'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { getAllStudyWords } from '@/lib/drm/word-lists';
import { StudyTrial } from '@/types/drm';

const WORD_DISPLAY_TIME = 2000; // 2 seconds per word
const INTER_WORD_INTERVAL = 500; // 500ms blank between words

export default function DRMStudyPage() {
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [words, setWords] = useState<StudyTrial[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showWord, setShowWord] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const storedSessionId = sessionStorage.getItem('drm_session_id');
    if (!storedSessionId) {
      router.push('/drm');
      return;
    }
    setSessionId(storedSessionId);

    // Get and shuffle words
    const studyWords = getAllStudyWords();
    setWords(studyWords);

    // Start presentation after a brief delay
    setTimeout(() => {
      setShowWord(true);
    }, 1000);
  }, [router]);

  useEffect(() => {
    if (words.length === 0 || currentIndex >= words.length) return;

    if (showWord) {
      // Show current word for WORD_DISPLAY_TIME
      timeoutRef.current = setTimeout(() => {
        setShowWord(false);
      }, WORD_DISPLAY_TIME);
    } else {
      // Inter-word interval
      timeoutRef.current = setTimeout(() => {
        const nextIndex = currentIndex + 1;
        if (nextIndex >= words.length) {
          setIsComplete(true);
        } else {
          setCurrentIndex(nextIndex);
          setShowWord(true);
        }
      }, INTER_WORD_INTERVAL);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [showWord, currentIndex, words.length]);

  const handleContinue = () => {
    router.push('/drm/test');
  };

  if (!sessionId) return null;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      {!isComplete ? (
        <div className="text-center max-w-2xl w-full">
          {/* Progress bar */}
          <div className="mb-8">
            <div className="h-2 bg-border rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-400 transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / words.length) * 100}%` }}
              />
            </div>
            <p className="text-sm text-muted mt-2">
              {currentIndex + 1} / {words.length}
            </p>
          </div>

          {/* Word display */}
          <div className="min-h-[300px] flex items-center justify-center">
            <AnimatePresence mode="wait">
              {showWord && words[currentIndex] && (
                <motion.div
                  key={currentIndex}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.3 }}
                  className="text-6xl md:text-8xl font-bold text-purple-400"
                >
                  {words[currentIndex].word}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <p className="text-muted mt-8" dir="rtl">
            נסה לזכור את המילים...
          </p>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-2xl"
        >
          <h2 className="text-3xl font-bold mb-6">שלב הלמידה הסתיים!</h2>

          <div className="bg-card border border-border rounded-xl p-6 mb-8" dir="rtl">
            <p className="text-lg text-right mb-4">
              כעת תעבור לשלב הבדיקה.
            </p>
            <p className="text-muted text-right">
              תראה מילים ותצטרך להחליט האם ראית אותן בשלב הלמידה או לא.
            </p>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleContinue}
            className="px-8 py-4 bg-purple-400 text-zinc-900 font-bold text-lg rounded-xl
                       shadow-lg shadow-purple-400/20 transition-colors hover:bg-purple-300"
          >
            המשך לבדיקה
          </motion.button>
        </motion.div>
      )}
    </main>
  );
}
