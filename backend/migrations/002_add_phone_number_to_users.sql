-- Migration: Add phone_number field to users table
-- Description: Allow users to have a phone number for call association
-- Date: 2026-01-16

-- Add phone_number column to users table
-- This enables automatic association of incoming calls to users
ALTER TABLE users
ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20);

-- Create index for faster lookup by phone number
CREATE INDEX IF NOT EXISTS idx_users_phone_number ON users(phone_number);

-- Create unique index per company to prevent duplicate numbers within same company
-- Note: Different companies can have the same phone number
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_company_phone_number
ON users(company_id, phone_number)
WHERE phone_number IS NOT NULL;
