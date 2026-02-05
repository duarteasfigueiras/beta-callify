import { createClient } from '@supabase/supabase-js';

// SECURITY: Require environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('ERROR: SUPABASE_URL and SUPABASE_ANON_KEY environment variables are required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteAllTestData(): Promise<void> {
  console.log('===========================================');
  console.log('  CALLIFY - Delete All Test Data');
  console.log('===========================================\n');

  try {
    // Delete all alerts first (foreign key to calls)
    console.log('Deleting all alerts...');
    const { error: alertError } = await supabase.from('alerts').delete().gte('id', 0);
    if (alertError) console.error('Error deleting alerts:', alertError.message);
    else console.log('  Alerts deleted.');

    // Delete all call feedback (foreign key to calls)
    console.log('Deleting all call feedback...');
    const { error: feedbackError } = await supabase.from('call_feedback').delete().gte('id', 0);
    if (feedbackError) console.error('Error deleting feedback:', feedbackError.message);
    else console.log('  Feedback deleted.');

    // Delete all call criterion results (foreign key to calls)
    console.log('Deleting all call criterion results...');
    const { error: criteriaError } = await supabase.from('call_criteria_results').delete().gte('id', 0);
    if (criteriaError) console.error('Error deleting criteria results:', criteriaError.message);
    else console.log('  Criteria results deleted.');

    // Delete all calls
    console.log('Deleting all calls...');
    const { error: callsError } = await supabase.from('calls').delete().gte('id', 0);
    if (callsError) console.error('Error deleting calls:', callsError.message);
    else console.log('  Calls deleted.');

    // Delete test agents (ID > 2, keeping original admin)
    console.log('Deleting test agents (keeping admin)...');
    const { error: usersError } = await supabase.from('users').delete().gt('id', 2);
    if (usersError) console.error('Error deleting users:', usersError.message);
    else console.log('  Test agents deleted.');

    // Count remaining records
    const { count: callCount } = await supabase.from('calls').select('*', { count: 'exact', head: true });
    const { count: userCount } = await supabase.from('users').select('*', { count: 'exact', head: true });
    const { count: alertCount } = await supabase.from('alerts').select('*', { count: 'exact', head: true });

    console.log('\n===========================================');
    console.log('  Deletion completed!');
    console.log('===========================================');
    console.log(`  Remaining calls: ${callCount}`);
    console.log(`  Remaining users: ${userCount}`);
    console.log(`  Remaining alerts: ${alertCount}`);
    console.log('');

  } catch (error) {
    console.error('Fatal error:', error);
  }
}

deleteAllTestData();
