-- Migration: Add category field to criteria table
-- Description: Allow criteria to be assigned to specific user categories
-- Date: 2026-01-16

-- Add category column to criteria table
-- Valid values: 'comercial', 'suporte', 'tecnico', 'supervisor', 'all'
-- Default is 'all' which means the criterion applies to all user categories

ALTER TABLE criteria
ADD COLUMN IF NOT EXISTS category VARCHAR(20) DEFAULT 'all';

-- Add constraint to ensure valid category values
ALTER TABLE criteria
ADD CONSTRAINT criteria_category_check
CHECK (category IN ('comercial', 'suporte', 'tecnico', 'supervisor', 'all'));

-- Update existing criteria to have 'all' as their category (in case the default didn't apply)
UPDATE criteria SET category = 'all' WHERE category IS NULL;

-- Create index for faster filtering by category
CREATE INDEX IF NOT EXISTS idx_criteria_category ON criteria(category);
CREATE INDEX IF NOT EXISTS idx_criteria_company_category ON criteria(company_id, category);
