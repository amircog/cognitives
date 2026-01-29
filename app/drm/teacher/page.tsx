'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { GraduationCap, RefreshCw, BarChart3 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { DRMResult } from '@/types/drm';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';

interface AggregateStats {
  hitRate: number;
  criticalLureRate: number;
  relatedFARate: number;
  unrelatedFARate: number;
  totalParticipants: number;
  totalResponses: number;
  serialPositionData: Array<{ position: number; recallRate: number; count: number }>;
}

export default function DRMTeacherDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<AggregateStats | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('drm_results')
        .select('*')
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;

      if (!data || data.length === 0) {
        setError('No data available yet. Waiting for participants to complete the experiment.');
        setLoading(false);
        return;
      }

      // Calculate aggregate statistics
      const uniqueSessions = new Set(data.map((r: DRMResult) => r.session_id));

      const studiedItems = data.filter((r: DRMResult) => r.item_type === 'studied');
      const criticalLures = data.filter((r: DRMResult) => r.item_type === 'critical_lure');
      const relatedDistractors = data.filter((r: DRMResult) => r.item_type === 'related_distractor');
      const unrelatedDistractors = data.filter((r: DRMResult) => r.item_type === 'unrelated_distractor');

      const hitRate = studiedItems.length > 0
        ? (studiedItems.filter((r: DRMResult) => r.response === 'old').length / studiedItems.length) * 100
        : 0;

      const criticalLureRate = criticalLures.length > 0
        ? (criticalLures.filter((r: DRMResult) => r.response === 'old').length / criticalLures.length) * 100
        : 0;

      const relatedFARate = relatedDistractors.length > 0
        ? (relatedDistractors.filter((r: DRMResult) => r.response === 'old').length / relatedDistractors.length) * 100
        : 0;

      const unrelatedFARate = unrelatedDistractors.length > 0
        ? (unrelatedDistractors.filter((r: DRMResult) => r.response === 'old').length / unrelatedDistractors.length) * 100
        : 0;

      // Calculate serial position curve (for studied items only)
      const serialPositionData: Array<{ position: number; recallRate: number; count: number }> = [];
      for (let position = 1; position <= 15; position++) {
        const itemsAtPosition = studiedItems.filter(
          (r: DRMResult) => r.serial_position === position
        );
        const recalled = itemsAtPosition.filter((r: DRMResult) => r.response === 'old').length;
        const recallRate = itemsAtPosition.length > 0
          ? (recalled / itemsAtPosition.length) * 100
          : 0;

        serialPositionData.push({
          position,
          recallRate,
          count: itemsAtPosition.length
        });
      }

      setStats({
        hitRate,
        criticalLureRate,
        relatedFARate,
        unrelatedFARate,
        totalParticipants: uniqueSessions.size,
        totalResponses: data.length,
        serialPositionData
      });
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="inline-block mb-4"
          >
            <RefreshCw className="w-8 h-8 text-purple-400" />
          </motion.div>
          <p className="text-muted">Loading data...</p>
        </div>
      </main>
    );
  }

  const chartData = stats ? [
    {
      name: 'Hits (Studied)',
      rate: stats.hitRate.toFixed(1),
      fill: '#34d399'
    },
    {
      name: 'Critical Lures',
      rate: stats.criticalLureRate.toFixed(1),
      fill: '#f43f5e'
    },
    {
      name: 'Related FA',
      rate: stats.relatedFARate.toFixed(1),
      fill: '#fbbf24'
    },
    {
      name: 'Unrelated FA',
      rate: stats.unrelatedFARate.toFixed(1),
      fill: '#71717a'
    }
  ] : [];

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <GraduationCap className="w-10 h-10 text-purple-400" />
            <div>
              <h1 className="text-4xl font-bold tracking-tight">Teacher Dashboard</h1>
              <p className="text-muted mt-1">DRM False Memory Results</p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 bg-purple-400 text-zinc-900
                       font-semibold rounded-lg hover:bg-purple-300 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Data
          </motion.button>
        </div>

        {/* Stats Cards */}
        {!error && stats && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center gap-3 mb-2">
                  <BarChart3 className="w-5 h-5 text-purple-400" />
                  <h3 className="text-sm font-medium text-muted">Total Participants</h3>
                </div>
                <p className="text-3xl font-bold">{stats.totalParticipants}</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center gap-3 mb-2">
                  <BarChart3 className="w-5 h-5 text-blue-400" />
                  <h3 className="text-sm font-medium text-muted">Total Responses</h3>
                </div>
                <p className="text-3xl font-bold">{stats.totalResponses}</p>
              </div>
            </div>

            {/* Main Chart */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-2xl font-bold mb-2">Recognition Rates by Item Type</h2>
              <p className="text-muted mb-6">
                Percentage of "OLD" responses for each item type. Critical lures show the false memory effect.
              </p>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart
                  data={chartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis
                    dataKey="name"
                    stroke="#a1a1aa"
                    tick={{ fill: '#a1a1aa' }}
                    angle={-15}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis
                    stroke="#a1a1aa"
                    tick={{ fill: '#a1a1aa' }}
                    domain={[0, 100]}
                    label={{ value: '"OLD" Response Rate (%)', angle: -90, position: 'insideLeft', fill: '#a1a1aa' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18181b',
                      border: '1px solid #27272a',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: '#fafafa' }}
                    itemStyle={{ color: '#fafafa' }}
                  />
                  <Bar dataKey="rate" radius={[8, 8, 0, 0]} maxBarSize={100}>
                    {chartData.map((entry, index) => (
                      <Bar key={`bar-${index}`} dataKey="rate" fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Serial Position Curve */}
            <div className="bg-card border border-border rounded-xl p-6 mt-8">
              <h2 className="text-2xl font-bold mb-2">Serial Position Curve</h2>
              <p className="text-muted mb-6">
                Recall rate by position in the original study list (1-15). Shows primacy (early items) and recency (late items) effects.
              </p>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart
                  data={stats.serialPositionData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis
                    dataKey="position"
                    stroke="#a1a1aa"
                    tick={{ fill: '#a1a1aa' }}
                    label={{ value: 'Serial Position', position: 'insideBottom', offset: -5, fill: '#a1a1aa' }}
                  />
                  <YAxis
                    stroke="#a1a1aa"
                    tick={{ fill: '#a1a1aa' }}
                    domain={[0, 100]}
                    label={{ value: 'Recall Rate (%)', angle: -90, position: 'insideLeft', fill: '#a1a1aa' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18181b',
                      border: '1px solid #27272a',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: '#fafafa' }}
                    itemStyle={{ color: '#fafafa' }}
                    formatter={(value: number, name: string) => {
                      if (name === 'recallRate') return [`${value.toFixed(1)}%`, 'Recall Rate'];
                      return [value, name];
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="recallRate"
                    stroke="#a855f7"
                    strokeWidth={3}
                    dot={{ fill: '#a855f7', r: 5 }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-card border border-yellow-500/50 rounded-xl p-8 mb-8 text-center">
            <p className="text-yellow-400 mb-4">{error}</p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={fetchData}
              className="px-4 py-2 bg-purple-400 text-zinc-900 font-semibold rounded-lg
                         hover:bg-purple-300 transition-colors"
            >
              Retry
            </motion.button>
          </div>
        )}
      </div>
    </main>
  );
}
