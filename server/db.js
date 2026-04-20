const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const db = new Database(path.join(__dirname, 'amsam.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Create Tables ──────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT    NOT NULL,
    college_id    TEXT    UNIQUE NOT NULL,
    email         TEXT    UNIQUE NOT NULL,
    password_hash TEXT    NOT NULL,
    photo_path    TEXT    DEFAULT NULL,
    role          TEXT    NOT NULL DEFAULT 'student'
                          CHECK(role IN ('super_admin','sub_admin','student')),
    batch         TEXT    DEFAULT NULL,
    department    TEXT    DEFAULT NULL,
    phone         TEXT    DEFAULT NULL,
    is_paid       INTEGER NOT NULL DEFAULT 0,
    paid_at       DATETIME DEFAULT NULL,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS events (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT NOT NULL,
    description TEXT,
    venue       TEXT,
    event_date  TEXT,
    event_time  TEXT,
    created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS mom (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    title        TEXT NOT NULL,
    meeting_date TEXT,
    attendees    TEXT,
    agenda       TEXT,
    notes        TEXT,
    action_items TEXT,
    created_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// ── Migrate existing DB: add is_paid / paid_at if missing ──────
try { db.exec(`ALTER TABLE users ADD COLUMN is_paid INTEGER NOT NULL DEFAULT 0`); } catch(e) { /* column already exists */ }
try { db.exec(`ALTER TABLE users ADD COLUMN paid_at DATETIME DEFAULT NULL`);       } catch(e) { /* column already exists */ }

// ── Seed Data (runs only once) ─────────────────────────────────
const alreadySeeded = db.prepare("SELECT COUNT(*) as c FROM users").get().c > 0;

if (!alreadySeeded) {
  const h = (p) => bcrypt.hashSync(p, 10);

  const ins = db.prepare(`
    INSERT INTO users (name, college_id, email, password_hash, role, batch, department, phone)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Super Admin
  ins.run('Admin',  'ADMIN001',    'admin@amsam.in',                          h('Admin@123'),    'super_admin', '2018', 'Administration',  '9999999999');
  // Sub Admin
  ins.run('Dr. Meena Pillai', 'SADMIN001',   'subadmin@amsam.in',                       h('SubAdmin@123'), 'sub_admin',   '2019', 'General Medicine', '8888888888');
  // Students
  ins.run('Arjun Sharma',     'MBBS2023001', 'arjun.sharma@aiimsmangalagiri.edu.in',    h('Student@123'),  'student',     '2023', 'MBBS',             '7777777701');
  ins.run('Priya Nair',       'MBBS2023002', 'priya.nair@aiimsmangalagiri.edu.in',      h('Student@123'),  'student',     '2023', 'MBBS',             '7777777702');
  ins.run('Rahul Reddy',      'MBBS2022001', 'rahul.reddy@aiimsmangalagiri.edu.in',     h('Student@123'),  'student',     '2022', 'MBBS',             '7777777703');
  ins.run('Sneha Thomas',     'MBBS2022002', 'sneha.thomas@aiimsmangalagiri.edu.in',    h('Student@123'),  'student',     '2022', 'MBBS',             '7777777704');

  // Events
  const insE = db.prepare(`INSERT INTO events (title, description, venue, event_date, event_time, created_by) VALUES (?,?,?,?,?,?)`);
  insE.run('Annual Medical Symposium 2025',
    'A grand symposium featuring lectures from renowned medical professionals across India. Students will interact with specialists and learn about recent advances in medicine.',
    'Main Auditorium, AIIMS Mangalagiri', '2025-05-15', '09:00 AM', 1);
  insE.run('Blood Donation Camp',
    'AMSAM organizes its annual blood donation camp in collaboration with the hospital blood bank. All students, faculty, and staff are encouraged to participate.',
    'Ground Floor Lobby, AIIMS Mangalagiri', '2025-04-25', '10:00 AM', 1);
  insE.run('CPR & BLS Training Workshop',
    'Hands-on CPR and Basic Life Support training for all MBBS students. Certification will be provided upon successful completion.',
    'Skills Lab, AIIMS Mangalagiri', '2025-05-05', '02:00 PM', 2);

  // MOM
  const insM = db.prepare(`INSERT INTO mom (title, meeting_date, attendees, agenda, notes, action_items, created_by) VALUES (?,?,?,?,?,?,?)`);
  insM.run(
    'Monthly General Body Meeting — April 2025', '2025-04-01',
    JSON.stringify(['Dr. Admin Kumar', 'Dr. Meena Pillai', 'Arjun Sharma', 'Priya Nair', 'Rahul Reddy']),
    'Review of March activities, Planning upcoming events, Budget discussion',
    'The meeting commenced at 5:00 PM. The secretary presented a report on March activities including the sports day and cultural night. Budget for the upcoming symposium was approved unanimously.',
    JSON.stringify(['Finalize speakers for Annual Symposium by April 10', "Submit budget proposal to Dean's office by April 5", 'Create WhatsApp group for event volunteers']),
    1);
  insM.run(
    'Emergency Committee Meeting — March 2025', '2025-03-15',
    JSON.stringify(['Dr. Admin Kumar', 'Dr. Meena Pillai', 'Arjun Sharma']),
    'Blood donation camp logistics, Poster design approval',
    'An emergency meeting was called to finalize logistics for the blood donation camp. Venue confirmed as Ground Floor Lobby. Registration form to be circulated through the college portal.',
    JSON.stringify(['Design registration form for blood donation', 'Coordinate with blood bank by March 20', 'Print and display posters around campus']),
    1);

  console.log('✅ Database seeded with demo data.');
}

module.exports = db;
