import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://mjtmjkfigrnhlcayoedb.supabase.co';

// Use service_role key for backend operations (bypasses RLS)
// Falls back to anon key if service_role is not configured
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qdG1qa2ZpZ3JuaGxjYXlvZWRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3MjQ1MDQsImV4cCI6MjA4MzMwMDUwNH0.vJf0L-2EccYwdqbS8hW-rQOQp_pZ80n-Yx6OFYnJ_vw';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Helper function to handle Supabase errors
export function handleSupabaseError(error: any): never {
  console.error('Supabase error:', error);
  throw new Error(error.message || 'Database error');
}
