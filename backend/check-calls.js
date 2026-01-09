const sqlite3 = require('sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'callify.db');
console.log('DB Path:', dbPath);
const db = new sqlite3.Database(dbPath);

db.all('SELECT * FROM calls LIMIT 5', [], (err, rows) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Calls found:', rows.length);
    rows.forEach(row => {
      console.log(`  Call ${row.id}: company_id=${row.company_id}, agent_id=${row.agent_id}, phone=${row.phone_number}, date=${row.call_date}`);
    });
  }
  db.close();
});
