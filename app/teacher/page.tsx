'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { GraduationCap, RefreshCw, BarChart3 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { TrialResult } from '@/types';
import { getLanguageGroup, LANGUAGE_GROUPS, type LanguageGroup } from '@/lib/language-groups';
import { LanguageGroupBarChart } from '@/components/charts/language-group-bar-chart';
import { IndividualScatterChart } from '@/components/charts/individual-scatter-chart';
import { TeacherSpeedAccuracyChart } from '@/components/charts/teacher-speed-accuracy-chart';

interface AggregateData {
  languageGroup: LanguageGroup;
  congruentMean: number;
  congruentSEM: number;
  incongruentMean: number;
  incongruentSEM: number;
  congruentCount: number;
  incongruentCount: number;
}

interface SubjectData {
  sessionId: string;
  congruentMean: number;
  incongruentMean: number;
  accuracy: number;
  languageGroup: LanguageGroup;
}

export default function TeacherDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allResults, setAllResults] = useState<TrialResult[]>([]);
  const [aggregateData, setAggregateData] = useState<AggregateData[]>([]);
  const [subjectData, setSubjectData] = useState<SubjectData[]>([]);
  const [totalSessions, setTotalSessions] = useState(0);
  const [totalTrials, setTotalTrials] = useState(0);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('stroop_results')
        .select('*')
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;

      if (!data || data.length === 0) {
        setError('No data available yet. Waiting for participants to complete the experiment.');
        setLoading(false);
        return;
      }

      setAllResults(data);
      setTotalTrials(data.length);

      // Get unique sessions
      const uniqueSessions = new Set(data.map((r: TrialResult) => r.session_id));
      setTotalSessions(uniqueSessions.size);

      // Calculate aggregate data per language group
      const aggregates: AggregateData[] = LANGUAGE_GROUPS.map((group) => {
        const groupResults = data.filter((r: TrialResult) => getLanguageGroup(r.word_text) === group);

        const congruentResults = groupResults.filter((r) => r.is_congruent && r.is_correct);
        const incongruentResults = groupResults.filter((r) => !r.is_congruent && r.is_correct);

        const congruentMean =
          congruentResults.length > 0
            ? congruentResults.reduce((sum, r) => sum + r.reaction_time_ms, 0) / congruentResults.length
            : 0;

        const incongruentMean =
          incongruentResults.length > 0
            ? incongruentResults.reduce((sum, r) => sum + r.reaction_time_ms, 0) / incongruentResults.length
            : 0;

        // Calculate SEM (Standard Error of the Mean)
        const calculateSEM = (results: TrialResult[], mean: number) => {
          if (results.length <= 1) return 0;
          const variance =
            results.reduce((sum, r) => sum + Math.pow(r.reaction_time_ms - mean, 2), 0) / results.length;
          const sd = Math.sqrt(variance);
          return sd / Math.sqrt(results.length);
        };

        const congruentSEM = calculateSEM(congruentResults, congruentMean);
        const incongruentSEM = calculateSEM(incongruentResults, incongruentMean);

        return {
          languageGroup: group,
          congruentMean,
          congruentSEM,
          incongruentMean,
          incongruentSEM,
          congruentCount: congruentResults.length,
          incongruentCount: incongruentResults.length,
        };
      });

      setAggregateData(aggregates);

      // Calculate per-subject data for scatter plot
      const subjects: SubjectData[] = [];
      uniqueSessions.forEach((sessionId) => {
        const sessionResults = data.filter((r: TrialResult) => r.session_id === sessionId);

        // Calculate per language group for this subject
        LANGUAGE_GROUPS.forEach((group) => {
          const groupResults = sessionResults.filter((r: TrialResult) => getLanguageGroup(r.word_text) === group);

          if (groupResults.length === 0) return;

          const congruentResults = groupResults.filter((r) => r.is_congruent);
          const incongruentResults = groupResults.filter((r) => !r.is_congruent);

          const congruentMean =
            congruentResults.length > 0
              ? congruentResults.reduce((sum, r) => sum + r.reaction_time_ms, 0) / congruentResults.length
              : 0;

          const incongruentMean =
            incongruentResults.length > 0
              ? incongruentResults.reduce((sum, r) => sum + r.reaction_time_ms, 0) / incongruentResults.length
              : 0;

          const correctCount = groupResults.filter((r) => r.is_correct).length;
          const accuracy = groupResults.length > 0 ? (correctCount / groupResults.length) * 100 : 0;

          subjects.push({
            sessionId,
            congruentMean,
            incongruentMean,
            accuracy,
            languageGroup: group,
          });
        });
      });

      setSubjectData(subjects);
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
            <RefreshCw className="w-8 h-8 text-emerald-400" />
          </motion.div>
          <p className="text-muted">Loading data...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <GraduationCap className="w-10 h-10 text-emerald-400" />
            <div>
              <h1 className="text-4xl font-bold tracking-tight">Teacher Dashboard</h1>
              <p className="text-muted mt-1">Aggregate Stroop Effect Results</p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-400 text-zinc-900
                       font-semibold rounded-lg hover:bg-emerald-300 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Data
          </motion.button>
        </div>

        {/* Stats Cards */}
        {!error && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <BarChart3 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-medium text-muted">Total Participants</h3>
              </div>
              <p className="text-3xl font-bold">{totalSessions}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <BarChart3 className="w-5 h-5 text-blue-400" />
                <h3 className="text-sm font-medium text-muted">Total Trials</h3>
              </div>
              <p className="text-3xl font-bold">{totalTrials}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <BarChart3 className="w-5 h-5 text-purple-400" />
                <h3 className="text-sm font-medium text-muted">Data Points</h3>
              </div>
              <p className="text-3xl font-bold">{allResults.length}</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-card border border-yellow-500/50 rounded-xl p-8 mb-8 text-center">
            <p className="text-yellow-400 mb-4">{error}</p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={fetchData}
              className="px-4 py-2 bg-emerald-400 text-zinc-900 font-semibold rounded-lg
                         hover:bg-emerald-300 transition-colors"
            >
              Retry
            </motion.button>
          </div>
        )}

        {/* Charts */}
        {!error && aggregateData.length > 0 && (
          <div className="space-y-8">
            {/* Bar Chart with SEM */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-2xl font-bold mb-2">Reaction Time by Language Group</h2>
              <p className="text-muted mb-6">
                Mean reaction times with Standard Error of Mean (SEM) error bars.
                Compares congruent vs incongruent trials across language groups.
              </p>
              <LanguageGroupBarChart data={aggregateData} />
            </div>

            {/* Individual Scatter Plot */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-2xl font-bold mb-2">Individual Subject Averages</h2>
              <p className="text-muted mb-6">
                Each point represents one participant's average reaction time for congruent vs incongruent trials
                within each language group.
              </p>
              <IndividualScatterChart data={subjectData} />
            </div>

            {/* Speed-Accuracy Tradeoff */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-2xl font-bold mb-2">Speed-Accuracy Tradeoff</h2>
              <p className="text-muted mb-6">
                Relationship between reaction time and accuracy for each participant across language groups.
                Points higher and to the left indicate faster and more accurate performance.
              </p>
              <TeacherSpeedAccuracyChart data={subjectData} />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
