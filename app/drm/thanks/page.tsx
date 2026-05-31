'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';
import { getSupabase } from '@/lib/supabase';
import { DRMResult } from '@/types/drm';

const KEY = 'drm';

interface PersonalStats {
  hitRate: number;
  criticalLureRate: number;
  foilFARate: number;
  totalItems: number;
}

export default function DRMThanksPage() {
  const [lang, setLang] = useState<'he' | 'en'>('he');
  const [stats, setStats] = useState<PersonalStats | null>(null);

  useEffect(() => {
    const l = sessionStorage.getItem(`${KEY}_language`) as 'he' | 'en' | null;
    if (l) setLang(l);

    const sid = sessionStorage.getItem(`${KEY}_session_id`);
    if (!sid) return;

    const fetchStats = async () => {
      try {
        const supabase = getSupabase();
        if (!supabase) return;

        const { data, error } = await supabase
          .from('drm_results')
          .select('*')
          .eq('session_id', sid);

        if (error || !data || data.length === 0) return;

        const results = data as DRMResult[];
        const studied = results.filter(r => r.item_type === 'studied');
        const lures = results.filter(r => r.item_type === 'critical_lure');
        const foils = results.filter(r => r.item_type === 'unrelated_foil');

        setStats({
          hitRate: studied.length > 0
            ? (studied.filter(r => r.response === 'old').length / studied.length) * 100 : 0,
          criticalLureRate: lures.length > 0
            ? (lures.filter(r => r.response === 'old').length / lures.length) * 100 : 0,
          foilFARate: foils.length > 0
            ? (foils.filter(r => r.response === 'old').length / foils.length) * 100 : 0,
          totalItems: results.length,
        });
      } catch (err) {
        console.error('Error fetching stats:', err);
      }
    };

    fetchStats();
  }, []);

  const he = lang === 'he';

  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-2xl"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="flex justify-center mb-6"
        >
          <CheckCircle className="w-24 h-24 text-emerald-400" />
        </motion.div>

        <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
          {he ? 'תודה!' : 'Thank you!'}
        </h1>

        <div className="bg-card border border-border rounded-xl p-6 mb-6" dir={he ? 'rtl' : 'ltr'}>
          <p className="text-lg mb-4">
            {he ? 'סיימת את ניסוי הזיכרון!' : 'You have completed the memory experiment!'}
          </p>

          {stats && (
            <div className="mt-4 space-y-3 text-left" dir="ltr">
              <div className="flex justify-between items-center p-3 bg-zinc-800/50 rounded-lg">
                <span className="text-muted">{he ? 'זיהוי נכון (מילים שהוצגו)' : 'Hits (studied words)'}</span>
                <span className="text-emerald-400 font-bold">{stats.hitRate.toFixed(0)}%</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-zinc-800/50 rounded-lg">
                <span className="text-muted">{he ? 'זיכרון שווא (פיתיונות קריטיים)' : 'False alarms (critical lures)'}</span>
                <span className="text-red-400 font-bold">{stats.criticalLureRate.toFixed(0)}%</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-zinc-800/50 rounded-lg">
                <span className="text-muted">{he ? 'התרעות שווא (מילים לא קשורות)' : 'False alarms (unrelated foils)'}</span>
                <span className="text-gray-400 font-bold">{stats.foilFARate.toFixed(0)}%</span>
              </div>
            </div>
          )}

          <p className="text-muted mt-4">
            {he
              ? 'התוצאות נשמרו במערכת.'
              : 'Your results have been saved.'}
          </p>
        </div>

        <p className="text-sm text-muted">
          {he ? 'ניתן כעת לסגור את החלון' : 'You may now close this window'}
        </p>
      </motion.div>
    </main>
  );
}
