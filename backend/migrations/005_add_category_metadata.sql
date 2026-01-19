-- Migration: Add category_metadata table for dynamic categories
-- Description: Store category metadata including colors for dynamic category management
-- Date: 2026-01-17
--
-- Execute this SQL in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/mjtmjkfigrnhlcayoedb/sql/new

-- Create category_metadata table
CREATE TABLE IF NOT EXISTS category_metadata (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    key VARCHAR(100) NOT NULL,
    name VARCHAR(100) NOT NULL,
    color_id VARCHAR(20) NOT NULL DEFAULT 'blue',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, key)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_category_metadata_company ON category_metadata(company_id);
CREATE INDEX IF NOT EXISTS idx_category_metadata_key ON category_metadata(company_id, key);

-- Remove the old constraint that limited categories to fixed values
ALTER TABLE criteria DROP CONSTRAINT IF EXISTS criteria_category_check;

-- Update the category column to allow longer values for dynamic categories
ALTER TABLE criteria ALTER COLUMN category TYPE VARCHAR(100);

-- Enable Row Level Security
ALTER TABLE category_metadata ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to read their company's categories
CREATE POLICY "Users can view their company categories" ON category_metadata
    FOR SELECT USING (true);

-- Create policy for authenticated users to insert categories for their company
CREATE POLICY "Users can insert categories" ON category_metadata
    FOR INSERT WITH CHECK (true);

-- Create policy for authenticated users to update their company's categories
CREATE POLICY "Users can update categories" ON category_metadata
    FOR UPDATE USING (true);

-- Create policy for authenticated users to delete their company's categories
CREATE POLICY "Users can delete categories" ON category_metadata
    FOR DELETE USING (true);
