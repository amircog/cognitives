'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Beaker, Brain, FlaskConical } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();

  const experiments = [
    {
      id: 'stroop',
      title: 'Stroop Effect',
      description: 'Explore selective attention and cognitive interference',
      descriptionHe: 'חקרו קשב סלקטיבי והפרעות קוגניטיביות',
      icon: Brain,
      color: 'emerald',
      available: true,
    },
    {
      id: 'drm',
      title: 'False Memory (DRM)',
      description: 'Experience how memory can create false recollections',
      descriptionHe: 'חוו איך הזיכרון יוצר זיכרונות שווא',
      icon: Beaker,
      color: 'purple',
      available: true,
    },
  ];

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-4xl"
      >
        <div className="flex items-center justify-center gap-3 mb-6">
          <FlaskConical className="w-12 h-12 text-emerald-400" />
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
            תהליכים קוגניטיביים
          </h1>
        </div>

        <p className="text-xl text-muted mb-12">
          ניסויי כיתה • Cognitive Processes Course Experiments
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {experiments.map((experiment) => (
            <motion.div
              key={experiment.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                if (experiment.available) {
                  router.push(`/${experiment.id}`);
                }
              }}
              className={`
                bg-card border border-border rounded-xl p-8 cursor-pointer
                transition-all hover:border-emerald-400/50
                ${!experiment.available ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <div className="flex items-center justify-center mb-4">
                {experiment.id === 'stroop' && <experiment.icon className="w-16 h-16 text-emerald-400" />}
                {experiment.id === 'drm' && <experiment.icon className="w-16 h-16 text-purple-400" />}
              </div>

              <h2 className="text-2xl font-bold mb-2">{experiment.title}</h2>
              <p className="text-muted text-sm mb-2">{experiment.description}</p>
              <p className="text-muted text-sm" dir="rtl">{experiment.descriptionHe}</p>

              {!experiment.available && (
                <p className="text-yellow-400 text-sm mt-4">Coming Soon</p>
              )}
            </motion.div>
          ))}
        </div>

        <p className="mt-12 text-sm text-muted">
          Select an experiment to begin
        </p>
      </motion.div>
    </main>
  );
}
