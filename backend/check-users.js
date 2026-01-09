const sqlite3 = require('sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'callify.db');
const db = new sqlite3.Database(dbPath);

db.all('SELECT * FROM users', [], (err, rows) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Users:');
    rows.forEach(row => {
      console.log(`  User ${row.id}: company_id=${row.company_id}, username=${row.username}, role=${row.role}`);
    });
  }
  db.close();
});
