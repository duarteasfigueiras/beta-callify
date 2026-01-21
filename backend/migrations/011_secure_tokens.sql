-- Migration: Add secure token storage for password resets and invitations
-- This replaces the insecure base64 tokens with cryptographically secure hashed tokens

-- Table for password reset tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  token_hash VARCHAR(64) NOT NULL UNIQUE,  -- SHA-256 hash of the token
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_hash ON password_reset_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON password_reset_tokens(user_id);

-- Clean up expired tokens periodically (can be called by a cron job)
-- DELETE FROM password_reset_tokens WHERE expires_at < NOW() OR used = TRUE;

-- Update invitations table to use secure tokens
ALTER TABLE invitations
ADD COLUMN IF NOT EXISTS token_hash VARCHAR(64);

-- Create index for token_hash lookups
CREATE INDEX IF NOT EXISTS idx_invitations_token_hash ON invitations(token_hash);

-- Comments
COMMENT ON TABLE password_reset_tokens IS 'Stores hashed password reset tokens for secure one-time use';
COMMENT ON COLUMN password_reset_tokens.token_hash IS 'SHA-256 hash of the reset token (never store plain tokens)';
COMMENT ON COLUMN invitations.token_hash IS 'SHA-256 hash of invitation token for secure validation';
