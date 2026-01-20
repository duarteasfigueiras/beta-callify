-- Migration: Add AI coaching fields to calls table
-- These fields support the AI coaching features

-- Add new columns for AI coaching data
ALTER TABLE calls ADD COLUMN IF NOT EXISTS phrases_to_avoid TEXT;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS recommended_phrases TEXT;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS response_improvement_example TEXT;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS top_performer_comparison TEXT;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS skill_scores TEXT;

-- Add comments for documentation
COMMENT ON COLUMN calls.phrases_to_avoid IS 'JSON array of phrases the agent should avoid';
COMMENT ON COLUMN calls.recommended_phrases IS 'JSON array of recommended phrases';
COMMENT ON COLUMN calls.response_improvement_example IS 'JSON object with before/after example';
COMMENT ON COLUMN calls.top_performer_comparison IS 'JSON object comparing to top performer';
COMMENT ON COLUMN calls.skill_scores IS 'JSON object with skill breakdown (escuta_ativa, clareza, objecoes, fecho, empatia)';
