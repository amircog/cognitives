'use client';

import { useEffect, useState, FormEvent } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Beaker, Brain, BrainCog, BarChart2, FlaskConical, Shapes } from 'lucide-react';

const PW_HASH = '5f63c8759a4968d6e814db98e85f7658554882b44213d85f3a3b15480f47e69f';

async function sha256(str: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export default function HomePage() {
  const router = useRouter();

  // ── Password gate ──────────────────────────────────────────────────────────
  const [authed, setAuthed]   = useState(false);
  const [pwInput, setPwInput] = useState('');
  const [pwError, setPwError] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem('ss_home_authed') === '1') setAuthed(true);
  }, []);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    const hash = await sha256(pwInput);
    if (hash === PW_HASH) {
      sessionStorage.setItem('ss_home_authed', '1');
      setAuthed(true);
    } else {
      setPwError(true);
      setPwInput('');
    }
  };

  if (!authed) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-xl p-10 w-full max-w-sm flex flex-col items-center gap-6"
        >
          <FlaskConical className="w-10 h-10 text-emerald-400" />
          <div className="text-center">
            <h1 className="text-2xl font-bold">תהליכים קוגניטיביים</h1>
            <p className="text-muted text-sm mt-1">Cognitive Processes</p>
          </div>
          <form onSubmit={handleLogin} className="w-full flex flex-col gap-3">
            <input
              type="password"
              value={pwInput}
              onChange={e => { setPwInput(e.target.value); setPwError(false); }}
              placeholder="Password"
              autoFocus
              className={`w-full px-4 py-3 rounded-lg border bg-zinc-800 text-white outline-none transition-colors
                ${pwError ? 'border-red-500' : 'border-border focus:border-emerald-400'}`}
            />
            {pwError && <p className="text-red-400 text-sm text-center">Incorrect password</p>}
            <button type="submit"
              className="w-full py-3 bg-emerald-400 hover:bg-emerald-300 text-zinc-900 font-bold rounded-lg transition-colors">
              Enter
            </button>
          </form>
        </motion.div>
      </main>
    );
  }

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
    {
      id: 'bouba-kiki',
      title: 'Bouba-Kiki Effect',
      description: 'Discover cross-modal sound symbolism',
      descriptionHe: 'גלה סימבוליזם צלילי חוצה-מודאלי',
      icon: Shapes,
      color: 'indigo',
      available: true,
    },
    {
      id: 'mentalRep',
      title: 'Mental Representation',
      description: 'Explore mental scanning and mental rotation',
      descriptionHe: 'חקרו סריקה מנטלית וסיבוב מנטלי',
      icon: BrainCog,
      color: 'cyan',
      available: true,
    },
    {
      id: 'summaryStats',
      title: 'Ensemble Perception',
      description: 'Can you read the statistics of a crowd?',
      descriptionHe: 'האם ניתן לקרוא את הסטטיסטיקות של קהל?',
      icon: BarChart2,
      color: 'orange',
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
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
                {experiment.id === 'bouba-kiki' && <experiment.icon className="w-16 h-16 text-indigo-400" />}
                {experiment.id === 'mentalRep' && <experiment.icon className="w-16 h-16 text-cyan-400" />}
                {experiment.id === 'summaryStats' && <experiment.icon className="w-16 h-16 text-orange-400" />}
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
