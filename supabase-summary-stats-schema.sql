-- Summary Statistics / Ensemble Perception – Supabase Schema
-- Run this in the Supabase SQL editor before the first live session.

CREATE TABLE IF NOT EXISTS summary_stats_results (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id       UUID NOT NULL,
  participant_name TEXT,
  trial_type       TEXT NOT NULL CHECK (trial_type IN ('ensemble', 'recognition')),
  trial_number     INT  NOT NULL,
  stimulus_type    TEXT NOT NULL CHECK (stimulus_type IN ('circles', 'line-lengths', 'line-orientations')),

  -- Ensemble-only fields (NULL for recognition rows)
  stat_type        TEXT   CHECK (stat_type IN ('mean', 'max', 'min')),
  n_items          INT,
  true_value       FLOAT,
  response_value   FLOAT,
  signed_error     FLOAT,
  absolute_error   FLOAT,
  is_practice      BOOLEAN,

  -- Recognition-only fields (NULL for ensemble rows)
  probe_value      FLOAT,
  probe_is_target  BOOLEAN,
  response_yes     BOOLEAN,
  is_correct       BOOLEAN,

  -- Common
  reaction_time_ms FLOAT NOT NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE summary_stats_results ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (participants recording their data)
CREATE POLICY "Allow anon inserts on summary_stats_results"
  ON summary_stats_results
  FOR INSERT
  WITH CHECK (true);

-- Allow anonymous reads (results and teacher dashboard)
CREATE POLICY "Allow anon reads on summary_stats_results"
  ON summary_stats_results
  FOR SELECT
  USING (true);

-- Index for fast session lookups
CREATE INDEX IF NOT EXISTS idx_summary_stats_session
  ON summary_stats_results (session_id);
