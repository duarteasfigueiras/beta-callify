-- Migration: Add alert_settings table for configurable alert rules
-- Run this in Supabase SQL Editor

-- Alert settings table (per company)
CREATE TABLE IF NOT EXISTS alert_settings (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Low score alert settings
  low_score_enabled BOOLEAN DEFAULT TRUE,
  low_score_threshold REAL DEFAULT 5.0,

  -- Risk words alert settings
  risk_words_enabled BOOLEAN DEFAULT TRUE,
  risk_words_list TEXT DEFAULT 'cancelar,cancelamento,reclamacao,reclamar,advogado,processo,tribunal,insatisfeito,insatisfacao,devolver,devolucao,reembolso,nunca mais,pessimo',

  -- Long duration alert settings
  long_duration_enabled BOOLEAN DEFAULT TRUE,
  long_duration_threshold_minutes INTEGER DEFAULT 30,

  -- No next step alert settings
  no_next_step_enabled BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(company_id)
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_alert_settings_company ON alert_settings(company_id);

-- Enable RLS
ALTER TABLE alert_settings ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Allow all for alert_settings" ON alert_settings FOR ALL USING (true) WITH CHECK (true);

-- Insert default settings for existing companies
INSERT INTO alert_settings (company_id)
SELECT id FROM companies
ON CONFLICT (company_id) DO NOTHING;
