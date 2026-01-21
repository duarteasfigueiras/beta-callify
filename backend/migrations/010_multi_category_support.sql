-- Migration: Add multi-category support for users
-- Users can now have multiple categories (e.g., "Vendas" + "Suporte")
-- AI will detect which category is being exercised when user has multiple

-- Add categories array field to users (keeps custom_role_name for backwards compatibility)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS categories TEXT[] DEFAULT '{}';

-- Migrate existing custom_role_name to categories array
UPDATE users
SET categories = ARRAY[custom_role_name]
WHERE custom_role_name IS NOT NULL
  AND custom_role_name != ''
  AND (categories IS NULL OR categories = '{}');

-- Add detected_category field to calls
-- This stores which category the AI detected for this specific call
ALTER TABLE calls
ADD COLUMN IF NOT EXISTS detected_category VARCHAR(100);

-- Add index for filtering calls by detected category
CREATE INDEX IF NOT EXISTS idx_calls_detected_category ON calls(detected_category);

-- Comment explaining the fields
COMMENT ON COLUMN users.categories IS 'Array of categories this user can work in (e.g., ["Vendas", "Suporte"])';
COMMENT ON COLUMN calls.detected_category IS 'Category detected by AI for this call (only set when user has multiple categories)';
