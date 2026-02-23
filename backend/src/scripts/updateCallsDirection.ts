import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('ERROR: SUPABASE_URL and SUPABASE_ANON_KEY environment variables are required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateCallsDirection() {
  console.log('Updating all calls to direction: outbound...');

  const { data, error } = await supabase
    .from('calls')
    .update({ direction: 'outbound' })
    .neq('direction', 'outbound'); // Only update calls that aren't already outbound

  if (error) {
    console.error('Error updating calls:', error);
    process.exit(1);
  }

  // Get count of all calls
  const { count } = await supabase
    .from('calls')
    .select('*', { count: 'exact', head: true });

  console.log(`✅ Successfully updated all calls to direction: outbound`);
  console.log(`Total calls in database: ${count}`);
}

updateCallsDirection();
