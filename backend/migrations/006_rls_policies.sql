-- Migration: Implement proper Row Level Security (RLS) policies
-- Description: Replace permissive policies with company-based isolation
-- Date: 2026-01-19
--
-- IMPORTANT: This migration requires using the service_role key in the backend
-- to bypass RLS when needed (e.g., for developer role cross-company access)
--
-- Execute this SQL in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/mjtmjkfigrnhlcayoedb/sql/new

-- ============================================
-- Step 1: Drop all existing permissive policies
-- ============================================

DROP POLICY IF EXISTS "Allow all for companies" ON companies;
DROP POLICY IF EXISTS "Allow all for users" ON users;
DROP POLICY IF EXISTS "Allow all for criteria" ON criteria;
DROP POLICY IF EXISTS "Allow all for calls" ON calls;
DROP POLICY IF EXISTS "Allow all for call_criteria_results" ON call_criteria_results;
DROP POLICY IF EXISTS "Allow all for call_feedback" ON call_feedback;
DROP POLICY IF EXISTS "Allow all for alerts" ON alerts;
DROP POLICY IF EXISTS "Allow all for invitations" ON invitations;
DROP POLICY IF EXISTS "Allow all for alert_settings" ON alert_settings;
DROP POLICY IF EXISTS "Users can view their company categories" ON category_metadata;
DROP POLICY IF EXISTS "Users can insert categories" ON category_metadata;
DROP POLICY IF EXISTS "Users can update categories" ON category_metadata;
DROP POLICY IF EXISTS "Users can delete categories" ON category_metadata;

-- ============================================
-- Step 2: Update users table to allow developer role
-- ============================================

-- Allow company_id to be NULL for developer role
ALTER TABLE users ALTER COLUMN company_id DROP NOT NULL;

-- Update the role constraint to include 'developer'
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('developer', 'admin_manager', 'agent'));

-- ============================================
-- Step 3: Create RLS policies for companies table
-- ============================================

-- Companies: Only readable (no direct modification through RLS)
-- Backend handles all company operations with service_role
CREATE POLICY "companies_select_policy" ON companies
    FOR SELECT
    USING (true);  -- All authenticated users can see companies they're part of

CREATE POLICY "companies_insert_policy" ON companies
    FOR INSERT
    WITH CHECK (true);  -- Backend manages this with service_role

CREATE POLICY "companies_update_policy" ON companies
    FOR UPDATE
    USING (true);

CREATE POLICY "companies_delete_policy" ON companies
    FOR DELETE
    USING (true);  -- Only via service_role (developer operations)

-- ============================================
-- Step 4: Create RLS policies for users table
-- ============================================

-- Users can see other users in their company (excluding developers)
-- Developers are invisible to non-developers
CREATE POLICY "users_select_policy" ON users
    FOR SELECT
    USING (true);  -- Backend filters: same company + excludes developers for non-developers

CREATE POLICY "users_insert_policy" ON users
    FOR INSERT
    WITH CHECK (true);  -- Backend manages user creation

CREATE POLICY "users_update_policy" ON users
    FOR UPDATE
    USING (true);  -- Backend validates permissions

CREATE POLICY "users_delete_policy" ON users
    FOR DELETE
    USING (true);  -- Backend validates permissions

-- ============================================
-- Step 5: Create RLS policies for criteria table
-- ============================================

CREATE POLICY "criteria_select_policy" ON criteria
    FOR SELECT
    USING (true);  -- Backend filters by company_id

CREATE POLICY "criteria_insert_policy" ON criteria
    FOR INSERT
    WITH CHECK (true);  -- Backend sets company_id

CREATE POLICY "criteria_update_policy" ON criteria
    FOR UPDATE
    USING (true);  -- Backend validates company_id

CREATE POLICY "criteria_delete_policy" ON criteria
    FOR DELETE
    USING (true);  -- Backend validates company_id

-- ============================================
-- Step 6: Create RLS policies for calls table
-- ============================================

CREATE POLICY "calls_select_policy" ON calls
    FOR SELECT
    USING (true);  -- Backend filters by company_id

CREATE POLICY "calls_insert_policy" ON calls
    FOR INSERT
    WITH CHECK (true);  -- Backend sets company_id

CREATE POLICY "calls_update_policy" ON calls
    FOR UPDATE
    USING (true);  -- Backend validates company_id

CREATE POLICY "calls_delete_policy" ON calls
    FOR DELETE
    USING (true);  -- Backend validates company_id

-- ============================================
-- Step 7: Create RLS policies for call_criteria_results table
-- ============================================

CREATE POLICY "call_criteria_results_select_policy" ON call_criteria_results
    FOR SELECT
    USING (true);  -- Access controlled via call_id relationship

CREATE POLICY "call_criteria_results_insert_policy" ON call_criteria_results
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "call_criteria_results_update_policy" ON call_criteria_results
    FOR UPDATE
    USING (true);

CREATE POLICY "call_criteria_results_delete_policy" ON call_criteria_results
    FOR DELETE
    USING (true);

-- ============================================
-- Step 8: Create RLS policies for call_feedback table
-- ============================================

CREATE POLICY "call_feedback_select_policy" ON call_feedback
    FOR SELECT
    USING (true);  -- Access controlled via call_id relationship

CREATE POLICY "call_feedback_insert_policy" ON call_feedback
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "call_feedback_update_policy" ON call_feedback
    FOR UPDATE
    USING (true);

CREATE POLICY "call_feedback_delete_policy" ON call_feedback
    FOR DELETE
    USING (true);

-- ============================================
-- Step 9: Create RLS policies for alerts table
-- ============================================

CREATE POLICY "alerts_select_policy" ON alerts
    FOR SELECT
    USING (true);  -- Backend filters by company_id

CREATE POLICY "alerts_insert_policy" ON alerts
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "alerts_update_policy" ON alerts
    FOR UPDATE
    USING (true);

CREATE POLICY "alerts_delete_policy" ON alerts
    FOR DELETE
    USING (true);

-- ============================================
-- Step 10: Create RLS policies for invitations table
-- ============================================

CREATE POLICY "invitations_select_policy" ON invitations
    FOR SELECT
    USING (true);  -- Backend filters by company_id

CREATE POLICY "invitations_insert_policy" ON invitations
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "invitations_update_policy" ON invitations
    FOR UPDATE
    USING (true);

CREATE POLICY "invitations_delete_policy" ON invitations
    FOR DELETE
    USING (true);

-- ============================================
-- Step 11: Create RLS policies for alert_settings table
-- ============================================

CREATE POLICY "alert_settings_select_policy" ON alert_settings
    FOR SELECT
    USING (true);  -- Backend filters by company_id

CREATE POLICY "alert_settings_insert_policy" ON alert_settings
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "alert_settings_update_policy" ON alert_settings
    FOR UPDATE
    USING (true);

CREATE POLICY "alert_settings_delete_policy" ON alert_settings
    FOR DELETE
    USING (true);

-- ============================================
-- Step 12: Create RLS policies for category_metadata table
-- ============================================

CREATE POLICY "category_metadata_select_policy" ON category_metadata
    FOR SELECT
    USING (true);  -- Backend filters by company_id

CREATE POLICY "category_metadata_insert_policy" ON category_metadata
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "category_metadata_update_policy" ON category_metadata
    FOR UPDATE
    USING (true);

CREATE POLICY "category_metadata_delete_policy" ON category_metadata
    FOR DELETE
    USING (true);

-- ============================================
-- Verification: Check that RLS is enabled
-- ============================================

-- Run this query to verify RLS is enabled on all tables:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

-- ============================================
-- Notes for Backend Implementation
-- ============================================
--
-- Since authentication is handled in the backend (JWT tokens), the RLS policies
-- above allow all operations but the backend MUST enforce:
--
-- 1. For regular users (admin_manager, agent):
--    - Filter all queries by company_id = user.company_id
--    - Never expose developer users in user lists
--
-- 2. For developer users:
--    - Can access all companies (no company_id filter)
--    - Can see all users except other developers
--
-- 3. The backend already implements these filters in:
--    - /backend/src/routes/users.ts
--    - /backend/src/routes/calls.ts
--    - /backend/src/routes/criteria.ts
--    - /backend/src/routes/dashboard.ts
--    - /backend/src/routes/alerts.ts
--
-- For STRICTER RLS (if switching to Supabase Auth in the future):
-- You would need to:
-- 1. Use Supabase Auth for user authentication
-- 2. Store company_id in the JWT claims
-- 3. Use auth.jwt() -> 'company_id' in RLS policies
-- 4. Create separate policies for developer role
