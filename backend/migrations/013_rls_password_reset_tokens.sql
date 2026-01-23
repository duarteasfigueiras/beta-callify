-- Migration: Add RLS to password_reset_tokens table
-- Description: Enable Row Level Security on password_reset_tokens
-- Date: 2026-01-22
--
-- Execute this SQL in Supabase SQL Editor

-- Enable RLS on password_reset_tokens
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Create permissive policies (backend handles auth)
CREATE POLICY "password_reset_tokens_select_policy" ON password_reset_tokens
    FOR SELECT
    USING (true);

CREATE POLICY "password_reset_tokens_insert_policy" ON password_reset_tokens
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "password_reset_tokens_update_policy" ON password_reset_tokens
    FOR UPDATE
    USING (true);

CREATE POLICY "password_reset_tokens_delete_policy" ON password_reset_tokens
    FOR DELETE
    USING (true);

-- Verification query (run separately):
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
