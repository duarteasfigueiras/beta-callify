import { createClient } from '@supabase/supabase-js';

// SECURITY: Require environment variables - never use hardcoded defaults
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('SUPABASE_URL environment variable is required');
}

if (!supabaseKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY environment variable is required');
}

// SECURITY: Warn if using ANON_KEY in production (should use SERVICE_ROLE_KEY)
if (process.env.NODE_ENV === 'production' && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('[Supabase] WARNING: Using ANON_KEY in production. Set SUPABASE_SERVICE_ROLE_KEY for full database access.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Helper function to handle Supabase errors
export function handleSupabaseError(error: any): never {
  console.error('Supabase error:', error);
  throw new Error(error.message || 'Database error');
}
