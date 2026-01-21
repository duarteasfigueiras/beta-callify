-- Migration: Add contact reasons, objections and history comparison fields to calls table
-- These fields support the new AI evaluation format

-- Add new columns for contact reasons and objections (AI-generated)
ALTER TABLE calls ADD COLUMN IF NOT EXISTS contact_reasons TEXT;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS objections TEXT;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS history_comparison TEXT;

-- Add comments for documentation
COMMENT ON COLUMN calls.contact_reasons IS 'JSON array of reasons why the customer contacted (motivos_contacto)';
COMMENT ON COLUMN calls.objections IS 'JSON array of objections/concerns raised by the customer (objecoes)';
COMMENT ON COLUMN calls.history_comparison IS 'JSON object comparing this call to agent previous calls (comparacao_historico)';
