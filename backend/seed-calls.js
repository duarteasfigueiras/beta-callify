const sqlite3 = require('sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'callify.db');
const db = new sqlite3.Database(dbPath);

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

async function main() {
  try {
    // Check if calls exist
    const existingCount = await get('SELECT COUNT(*) as count FROM calls');
    console.log('Existing calls:', existingCount.count);

    if (existingCount.count > 0) {
      console.log('Calls already exist, clearing them first...');
      await run('DELETE FROM calls');
    }

    // Get company and agent
    const company = await get('SELECT id FROM companies LIMIT 1');
    const agent = await get('SELECT id FROM users WHERE role = ?', ['agent']);

    if (!company || !agent) {
      console.log('No company or agent found');
      process.exit(1);
    }

    console.log('Company ID:', company.id);
    console.log('Agent ID:', agent.id);

    // Sample calls
    const sampleCalls = [
      { phone: '+351912345678', score: 8.5, days_ago: 0, duration: 245 },
      { phone: '+351923456789', score: 7.2, days_ago: 1, duration: 180 },
      { phone: '+351934567890', score: 9.1, days_ago: 2, duration: 320 },
      { phone: '+351945678901', score: 6.5, days_ago: 3, duration: 150 },
      { phone: '+351956789012', score: 4.8, days_ago: 5, duration: 420 },
      { phone: '+351967890123', score: 8.0, days_ago: 7, duration: 200 },
      { phone: '+351978901234', score: 7.8, days_ago: 10, duration: 275 },
      { phone: '+351989012345', score: 9.5, days_ago: 14, duration: 190 },
      { phone: '+351990123456', score: 5.2, days_ago: 21, duration: 380 },
      { phone: '+351901234567', score: 8.8, days_ago: 30, duration: 210 },
      { phone: '+351912345111', score: 7.0, days_ago: 45, duration: 165 },
      { phone: '+351923456222', score: 6.0, days_ago: 60, duration: 300 },
    ];

    for (const call of sampleCalls) {
      const callDate = new Date();
      callDate.setDate(callDate.getDate() - call.days_ago);
      const callDateStr = callDate.toISOString();

      await run(
        `INSERT INTO calls (company_id, agent_id, phone_number, duration_seconds, final_score, call_date, summary, direction)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          company.id,
          agent.id,
          call.phone,
          call.duration,
          call.score,
          callDateStr,
          `Sample call from ${call.days_ago} days ago with score ${call.score}`,
          'inbound'
        ]
      );
    }

    console.log('Sample calls created:', sampleCalls.length);
    db.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
