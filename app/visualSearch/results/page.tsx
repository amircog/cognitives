'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Search, Clock, CheckCircle } from 'lucide-react';
import { VisualSearchResult } from '@/types/visual-search';

interface SetSizeStat {
  setSize: number;
  featureRT: number | null;
  conjunctionRT: number | null;
}

interface Stats {
  featureRT: number;
  conjunctionRT: number;
  featureAccuracy: number;
  conjunctionAccuracy: number;
  featureSlope: number;
  conjunctionSlope: number;
  setSizeData: SetSizeStat[];
}

/** Simple linear regression: returns slope (ms per item). */
function linearSlope(points: Array<{ x: number; y: number }>): number {
  if (points.length < 2) return 0;
  const n = points.length;
  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0);
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return 0;
  return (n * sumXY - sumX * sumY) / denom;
}

function computeStats(results: VisualSearchResult[]): Stats {
  const main = results.filter((r) => !r.is_practice);

  // Feature block correct target-present hits
  const featureHits = main.filter(
    (r) => r.block === 'feature' && r.target_present && r.correct,
  );
  const conjunctionHits = main.filter(
    (r) => r.block === 'conjunction' && r.target_present && r.correct,
  );

  const mean = (arr: VisualSearchResult[]) =>
    arr.length > 0 ? Math.round(arr.reduce((s, r) => s + r.rt_ms, 0) / arr.length) : 0;

  const featureRT = mean(featureHits);
  const conjunctionRT = mean(conjunctionHits);

  // Accuracy
  const featureMain = main.filter((r) => r.block === 'feature');
  const conjunctionMain = main.filter((r) => r.block === 'conjunction');
  const acc = (arr: VisualSearchResult[]) =>
    arr.length > 0 ? Math.round((arr.filter((r) => r.correct).length / arr.length) * 100) : 0;

  const featureAccuracy = acc(featureMain);
  const conjunctionAccuracy = acc(conjunctionMain);

  // RT × Set Size (correct target-present only)
  const setSizes = [8, 16, 24] as const;
  const setSizeData: SetSizeStat[] = setSizes.map((sz) => {
    const fHits = featureHits.filter((r) => r.set_size === sz);
    const cHits = conjunctionHits.filter((r) => r.set_size === sz);
    return {
      setSize: sz,
      featureRT: fHits.length > 0 ? mean(fHits) : null,
      conjunctionRT: cHits.length > 0 ? mean(cHits) : null,
    };
  });

  // Slopes
  const featurePoints = setSizeData
    .filter((d) => d.featureRT != null)
    .map((d) => ({ x: d.setSize, y: d.featureRT! }));
  const conjunctionPoints = setSizeData
    .filter((d) => d.conjunctionRT != null)
    .map((d) => ({ x: d.setSize, y: d.conjunctionRT! }));

  const featureSlope = Math.round(linearSlope(featurePoints) * 10) / 10;
  const conjunctionSlope = Math.round(linearSlope(conjunctionPoints) * 10) / 10;

  return {
    featureRT,
    conjunctionRT,
    featureAccuracy,
    conjunctionAccuracy,
    featureSlope,
    conjunctionSlope,
    setSizeData,
  };
}

export default function VisualSearchResultsPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem('visual_search_results');
    if (!raw) {
      router.push('/visualSearch');
      return;
    }
    try {
      const results: VisualSearchResult[] = JSON.parse(raw);
      setStats(computeStats(results));
    } catch {
      router.push('/visualSearch');
    }
  }, [router]);

  if (!stats) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-muted">טוען תוצאות...</p>
      </main>
    );
  }

  const chartData = stats.setSizeData.map((d) => ({
    setSize: d.setSize,
    Feature: d.featureRT,
    Conjunction: d.conjunctionRT,
  }));

  const featureInterpretation = stats.featureSlope < 15
    ? 'קו שיפוע שטוח לחיפוש תכונה מצביע על חיפוש מקבילי – הT האדומה "קפצת" מיד לעין!'
    : 'שיפוע מסוים נצפה בחיפוש תכונה – ייתכן שהיה קשה להבדיל.';

  const conjunctionInterpretation = stats.conjunctionSlope > 20
    ? `שיפוע תלול של ${stats.conjunctionSlope} מ"ש/פריט בחיפוש צירוף מצביע על חיפוש טורי – המוח בדק פריט אחר פריט.`
    : `שיפוע נמוך יחסית של ${stats.conjunctionSlope} מ"ש/פריט – הניסוי מצביע על יעילות חיפוש גבוהה.`;

  return (
    <main className="min-h-screen flex flex-col items-center py-8 px-4 md:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-4xl"
      >
        <div className="flex items-center justify-center gap-3 mb-2">
          <Search className="w-8 h-8 text-rose-400" />
          <h1 className="text-4xl md:text-5xl font-bold text-center">התוצאות שלך</h1>
        </div>
        <p className="text-muted text-center mb-8">ניסוי חיפוש חזותי – אינטגרציית תכונות</p>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 text-muted text-sm mb-1">
              <Clock className="w-4 h-4 text-blue-400" />
              <span>Feature RT</span>
            </div>
            <div className="text-2xl font-bold text-blue-400">{stats.featureRT}ms</div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 text-muted text-sm mb-1">
              <Clock className="w-4 h-4 text-rose-400" />
              <span>Conjunction RT</span>
            </div>
            <div className="text-2xl font-bold text-rose-400">{stats.conjunctionRT}ms</div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 text-muted text-sm mb-1">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>Feature Acc.</span>
            </div>
            <div className="text-2xl font-bold text-emerald-400">{stats.featureAccuracy}%</div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 text-muted text-sm mb-1">
              <CheckCircle className="w-4 h-4 text-orange-400" />
              <span>Conjunction Acc.</span>
            </div>
            <div className="text-2xl font-bold text-orange-400">{stats.conjunctionAccuracy}%</div>
          </div>
        </div>

        {/* RT × Set Size chart */}
        <div className="bg-card border border-border rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-1">זמן תגובה לפי גודל המערך</h2>
          <p className="text-sm text-muted mb-4">ניסיונות נכונים – יעד נוכח בלבד</p>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData} margin={{ left: 10, bottom: 20, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
              <XAxis
                dataKey="setSize"
                tick={{ fill: '#a1a1aa' }}
                label={{ value: 'גודל מערך', position: 'insideBottom', offset: -10, style: { fill: '#a1a1aa', fontSize: 12 } }}
              />
              <YAxis
                tick={{ fill: '#a1a1aa' }}
                label={{ value: 'RT (ms)', angle: -90, position: 'insideLeft', style: { fill: '#a1a1aa', fontSize: 12 } }}
              />
              <Tooltip
                contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8 }}
                formatter={(v: any) => [`${v}ms`] as any}
              />
              <Legend wrapperStyle={{ color: '#a1a1aa', paddingTop: 8 }} />
              <Line
                type="monotone"
                dataKey="Feature"
                stroke="#3b82f6"
                strokeWidth={2.5}
                dot={{ r: 5, fill: '#3b82f6' }}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="Conjunction"
                stroke="#fb7185"
                strokeWidth={2.5}
                dot={{ r: 5, fill: '#fb7185' }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Slope analysis */}
        <div className="bg-card border border-border rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-3">ניתוח שיפוע</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted mb-1">Feature Slope</p>
              <p className="text-xl font-bold text-blue-400">{stats.featureSlope} ms/item</p>
            </div>
            <div>
              <p className="text-sm text-muted mb-1">Conjunction Slope</p>
              <p className="text-xl font-bold text-rose-400">{stats.conjunctionSlope} ms/item</p>
            </div>
          </div>
        </div>

        {/* Interpretation */}
        <div className="bg-card border border-rose-400/20 rounded-xl p-6 mb-8 space-y-3">
          <h2 className="text-lg font-semibold">פירוש</h2>
          <p className="text-muted text-sm leading-relaxed" dir="rtl">{featureInterpretation}</p>
          <p className="text-muted text-sm leading-relaxed" dir="rtl">{conjunctionInterpretation}</p>
          <p className="text-muted text-sm leading-relaxed" dir="rtl">
            לפי תיאוריית האינטגרציית תכונות של טריסמן, חיפוש תכונה (צבע בלבד) מתרחש
            בצורה מקבילה ומהירה, בעוד שחיפוש צירוף (צבע + אות) דורש קשב ממוקד ועיבוד טורי.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap justify-center gap-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-card border border-border rounded-xl font-medium
                       transition-colors hover:bg-border"
          >
            חזרה לדף הבית
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push('/visualSearch/teacher')}
            className="px-6 py-3 bg-rose-500 text-white rounded-xl font-medium
                       transition-colors hover:bg-rose-400"
          >
            Teacher Dashboard
          </motion.button>
        </div>
      </motion.div>
    </main>
  );
}
