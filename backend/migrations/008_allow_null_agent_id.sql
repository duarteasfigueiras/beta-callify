-- Migration: Allow NULL agent_id in calls table
-- This allows calls to be created without an assigned agent
-- (shows as "Utilizador não definido" in the UI)

-- First drop the constraint if it exists
ALTER TABLE calls DROP CONSTRAINT IF EXISTS calls_agent_id_fkey;

-- Change the column to allow NULL
ALTER TABLE calls ALTER COLUMN agent_id DROP NOT NULL;

-- Re-add the foreign key constraint (without NOT NULL)
ALTER TABLE calls ADD CONSTRAINT calls_agent_id_fkey
  FOREIGN KEY (agent_id) REFERENCES users(id) ON DELETE SET NULL;

-- Add comment for documentation
COMMENT ON COLUMN calls.agent_id IS 'Agent who handled the call. NULL means undefined user (phone number not matched to any agent)';
