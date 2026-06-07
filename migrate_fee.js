const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database(path.join('server', 'amsam.db'));

db.serialize(() => {
  db.run('ALTER TABLE amsam_events ADD COLUMN fee_member INTEGER DEFAULT 0', (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('ALTER error:', err.message);
    } else {
      console.log('fee_member column OK');
    }
  });

  db.run('UPDATE amsam_events SET fee_member = 0 WHERE fee_member IS NULL', function (err) {
    if (err) console.error('UPDATE error:', err.message);
    else console.log('NULLs fixed, rows updated:', this.changes);
  });

  db.all('SELECT id, title, fee, fee_member FROM amsam_events', (err, rows) => {
    if (err) console.error(err.message);
    else console.log('Current events:', JSON.stringify(rows, null, 2));
    db.close();
  });
});
