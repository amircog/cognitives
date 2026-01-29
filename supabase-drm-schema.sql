-- DRM Experiment Database Schema
-- Run this in your Supabase SQL Editor to create the DRM results table

-- Create the drm_results table
CREATE TABLE drm_results (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid NOT NULL,
  participant_name text,
  word text NOT NULL,
  item_type text NOT NULL CHECK (item_type IN ('studied', 'critical_lure', 'related_distractor', 'unrelated_distractor')),
  list_theme text NOT NULL,
  response text NOT NULL CHECK (response IN ('old', 'new')),
  is_correct boolean NOT NULL,
  reaction_time_ms float8 NOT NULL,
  serial_position integer CHECK (serial_position >= 1 AND serial_position <= 15),
  confidence integer CHECK (confidence >= 1 AND confidence <= 5),
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_drm_session_id ON drm_results(session_id);
CREATE INDEX idx_drm_item_type ON drm_results(item_type);
CREATE INDEX idx_drm_created_at ON drm_results(created_at);

-- Enable Row Level Security
ALTER TABLE drm_results ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (for participants)
CREATE POLICY "Allow anonymous inserts" ON drm_results
  FOR INSERT TO anon WITH CHECK (true);

-- Allow anonymous selects (for viewing results)
CREATE POLICY "Allow anonymous selects" ON drm_results
  FOR SELECT TO anon USING (true);

-- Allow anonymous deletes (for clearing session results)
CREATE POLICY "Allow anonymous deletes" ON drm_results
  FOR DELETE TO anon USING (true);
