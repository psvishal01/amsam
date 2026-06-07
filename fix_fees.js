const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database(path.join('server', 'amsam.db'));

// Show what we have
db.all("SELECT id, title, fee, fee_member FROM amsam_events", (err, rows) => {
  if (err) { console.error(err); db.close(); return; }
  console.log('Before fix:', JSON.stringify(rows, null, 2));
  
  // Fix: any event where fee > 0 but fee_member is 0 or NULL, 
  // we just ensure fee_member is 0 (admin must re-save via UI to set the real value)
  // But also ensure fee_member is never NULL
  db.run('UPDATE amsam_events SET fee_member = COALESCE(fee_member, 0)', function(err2) {
    if (err2) console.error(err2);
    else console.log('\nNULLs coalesced, rows:', this.changes);
    
    db.all("SELECT id, title, fee, fee_member FROM amsam_events", (err3, rows2) => {
      console.log('After fix:', JSON.stringify(rows2, null, 2));
      db.close();
    });
  });
});
