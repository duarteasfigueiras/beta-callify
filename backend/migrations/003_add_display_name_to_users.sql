-- Migration: Add display_name field to users table
-- Description: Allow users to have a display name for call association
-- Date: 2026-01-16

-- Add display_name column to users table
-- This enables users to set their real name for call transcription matching
ALTER TABLE users
ADD COLUMN IF NOT EXISTS display_name VARCHAR(100);

-- Create index for faster lookup by display name
CREATE INDEX IF NOT EXISTS idx_users_display_name ON users(display_name);
