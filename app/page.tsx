'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';
import { Beaker, Keyboard } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();

  const handleStart = () => {
    const sessionId = uuidv4();
    sessionStorage.setItem('stroop_session_id', sessionId);
    router.push('/experiment');
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-2xl"
      >
        <div className="flex items-center justify-center gap-3 mb-6">
          <Beaker className="w-10 h-10 text-emerald-400" />
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
            Stroop Lab
          </h1>
        </div>

        <p className="text-xl text-muted mb-8">
          A cognitive psychology experiment measuring the interference between
          word meaning and color perception.
        </p>

        <div className="bg-card border border-border rounded-xl p-6 mb-8 text-left">
          <h2 className="text-lg font-semibold mb-4">Instructions</h2>
          <ol className="space-y-3 text-muted">
            <li className="flex gap-3">
              <span className="text-emerald-400 font-bold">1.</span>
              <span>
                You will see words displayed in different font colors (Red, Green, or Yellow).
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-emerald-400 font-bold">2.</span>
              <span>
                Identify the <strong className="text-foreground">font color</strong>,
                not the word meaning. Ignore what the word says!
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-emerald-400 font-bold">3.</span>
              <span>
                The experiment starts with <strong className="text-foreground">5 practice trials</strong>,
                then continues with 36 experimental trials.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-emerald-400 font-bold">4.</span>
              <span>
                Respond as quickly and accurately as possible using the buttons (R, G, Y)
                or keyboard shortcuts.
              </span>
            </li>
          </ol>

          <div className="flex items-center gap-2 mt-6 pt-4 border-t border-border text-sm text-muted">
            <Keyboard className="w-4 h-4" />
            <span>
              Keyboard shortcuts: <kbd className="px-1.5 py-0.5 bg-background rounded text-foreground">R</kbd> Red,{' '}
              <kbd className="px-1.5 py-0.5 bg-background rounded text-foreground">G</kbd> Green,{' '}
              <kbd className="px-1.5 py-0.5 bg-background rounded text-foreground">Y</kbd> Yellow
            </span>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleStart}
          className="px-8 py-4 bg-emerald-400 text-zinc-900 font-bold text-lg rounded-xl
                     shadow-lg shadow-emerald-400/20 transition-colors hover:bg-emerald-300"
        >
          Start Experiment
        </motion.button>

        <p className="mt-6 text-sm text-muted">
          5 practice + 36 trials • Takes about 3-4 minutes
        </p>
      </motion.div>
    </main>
  );
}
