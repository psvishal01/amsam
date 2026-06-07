const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database(path.join('server', 'amsam.db'));

db.serialize(() => {
  // Check all students and their paid status
  db.all("SELECT id, name, college_id, role, is_paid FROM amsam_users WHERE role IN ('student','sub_admin')", (err, rows) => {
    if (err) console.error(err.message);
    else console.log('STUDENTS:\n', JSON.stringify(rows, null, 2));
  });

  // Check all events and their fees
  db.all("SELECT id, title, fee, fee_member FROM amsam_events", (err, rows) => {
    if (err) console.error(err.message);
    else console.log('\nEVENTS:\n', JSON.stringify(rows, null, 2));
    db.close();
  });
});
