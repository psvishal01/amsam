const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

// We want to dynamically select the database.
// If process.env.DB_TYPE === 'sqlite' OR if no mysql DB credentials are set,
// we fall back to SQLite.
const isSqlite =
  process.env.DB_TYPE === 'sqlite' ||
  !process.env.DB_PASSWORD ||
  process.env.DB_PASSWORD === 'your_mysql_password_here' ||
  process.env.DB_PASSWORD.trim() === '';

let pool;
let dbInstance;

if (isSqlite) {
  console.log('📦 Using SQLite Database (local file: server/amsam.db)...');
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(__dirname, 'amsam.db');
  
  dbInstance = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('❌ Failed to open SQLite database:', err.message);
    } else {
      // Enable foreign keys
      dbInstance.run('PRAGMA foreign_keys = ON;');
    }
  });

  // Mock pool interface
  pool = {
    get: (sql, params = []) => {
      return new Promise((resolve, reject) => {
        dbInstance.get(sql, params, (err, row) => {
          if (err) reject(err);
          else resolve(row || null);
        });
      });
    },
    all: (sql, params = []) => {
      return new Promise((resolve, reject) => {
        dbInstance.all(sql, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        });
      });
    },
    run: (sql, params = []) => {
      return new Promise((resolve, reject) => {
        dbInstance.run(sql, params, function (err) {
          if (err) reject(err);
          else resolve({ insertId: this.lastID, affectedRows: this.changes });
        });
      });
    },
    // Mock getConnection for initialization if needed, or we just bypass in initDB
    getConnection: async () => {
      return {
        query: async (sql, params = []) => {
          // If query runs a SELECT, we should return [rows, fields]
          // If query runs an INSERT/UPDATE, we return [result, fields]
          const isSelect = sql.trim().toLowerCase().startsWith('select');
          if (isSelect) {
            const rows = await pool.all(sql, params);
            return [rows, []];
          } else {
            const result = await pool.run(sql, params);
            return [result, []];
          }
        },
        release: () => {}
      };
    }
  };
} else {
  console.log('🛢️ Using MySQL Database...');
  const mysqlPool = mysql.createPool({
    host:     process.env.DB_HOST     || 'localhost',
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  pool = mysqlPool;

  pool.get = async (sql, params = []) => {
    const [rows] = await pool.query(sql, params);
    return rows[0] || null;
  };
  pool.all = async (sql, params = []) => {
    const [rows] = await pool.query(sql, params);
    return rows;
  };
  pool.run = async (sql, params = []) => {
    const [result] = await pool.query(sql, params);
    return { insertId: result.insertId, affectedRows: result.affectedRows };
  };
}

async function initDB() {
  if (isSqlite) {
    try {
      // 1. Create amsam_users table
      await pool.run(`
        CREATE TABLE IF NOT EXISTS amsam_users (
          id            INTEGER PRIMARY KEY AUTOINCREMENT,
          name          TEXT NOT NULL,
          college_id    TEXT UNIQUE NOT NULL,
          email         TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          photo_path    TEXT DEFAULT NULL,
          role          TEXT CHECK(role IN ('super_admin','sub_admin','student','guest','pg_student')) NOT NULL DEFAULT 'student',
          organization  TEXT DEFAULT NULL,
          batch         TEXT DEFAULT NULL,
          department    TEXT DEFAULT NULL,
          phone         TEXT DEFAULT NULL,
          is_paid       INTEGER NOT NULL DEFAULT 0,
          paid_at       TEXT DEFAULT NULL,
          created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 2. Create amsam_events table
      await pool.run(`
        CREATE TABLE IF NOT EXISTS amsam_events (
          id          INTEGER PRIMARY KEY AUTOINCREMENT,
          title       TEXT NOT NULL,
          description TEXT,
          venue       TEXT,
          event_date  TEXT,
          event_time  TEXT,
          fee         INTEGER DEFAULT 0,
          fee_member  INTEGER DEFAULT 0,
          club_fees   TEXT DEFAULT NULL,
          created_by  INTEGER,
          visibility  TEXT NOT NULL DEFAULT 'student',
          created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (created_by) REFERENCES amsam_users(id) ON DELETE SET NULL
        )
      `);

      // 3. Create amsam_documents table
      await pool.run(`
        CREATE TABLE IF NOT EXISTS amsam_documents (
          id          INTEGER PRIMARY KEY AUTOINCREMENT,
          title       TEXT NOT NULL,
          description TEXT,
          category    TEXT CHECK(category IN ('Int','Ext','Adm','Ntc','Agr')) NOT NULL,
          file_path   TEXT NOT NULL,
          created_by  INTEGER,
          created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (created_by) REFERENCES amsam_users(id) ON DELETE SET NULL
        )
      `);

      // 4. Create amsam_registrations table
      await pool.run(`
        CREATE TABLE IF NOT EXISTS amsam_registrations (
          id          INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id     INTEGER,
          event_id    INTEGER,
          qr_code     TEXT UNIQUE NOT NULL,
          is_paid     INTEGER NOT NULL DEFAULT 0,
          is_admitted INTEGER NOT NULL DEFAULT 0,
          created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE (user_id, event_id),
          FOREIGN KEY (user_id)  REFERENCES amsam_users(id)  ON DELETE CASCADE,
          FOREIGN KEY (event_id) REFERENCES amsam_events(id) ON DELETE CASCADE
        )
      `);

      // 5. Create amsam_payment_orders table
      await pool.run(`
        CREATE TABLE IF NOT EXISTS amsam_payment_orders (
          order_id   TEXT PRIMARY KEY,
          user_id    INTEGER NOT NULL,
          event_id   INTEGER NOT NULL,
          status     TEXT DEFAULT 'created',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Seed only if empty
      try { await pool.run("ALTER TABLE amsam_events ADD COLUMN visibility TEXT NOT NULL DEFAULT 'student'"); } catch(e) {}
      // Automatic migration: rebuild amsam_events if it has the legacy CHECK constraint on visibility
      try {
        const row = await pool.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='amsam_events'");
        if (row && row.sql && row.sql.includes('CHECK(visibility')) {
          console.log('🔄 Migrating SQLite amsam_events to remove visibility CHECK constraint...');
          await pool.run('PRAGMA foreign_keys=off;');
          await pool.run('BEGIN TRANSACTION;');
          await pool.run(`
            CREATE TABLE IF NOT EXISTS amsam_events_new (
              id          INTEGER PRIMARY KEY AUTOINCREMENT,
              title       TEXT NOT NULL,
              description TEXT,
              venue       TEXT,
              event_date  TEXT,
              event_time  TEXT,
              fee         INTEGER DEFAULT 0,
              fee_member  INTEGER DEFAULT 0,
              club_fees   TEXT DEFAULT NULL,
              created_by  INTEGER,
              visibility  TEXT NOT NULL DEFAULT 'student',
              created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (created_by) REFERENCES amsam_users(id) ON DELETE SET NULL
            )
          `);
          await pool.run(`INSERT INTO amsam_events_new SELECT id, title, description, venue, event_date, event_time, fee, fee_member, club_fees, created_by, visibility, created_at FROM amsam_events`);
          await pool.run(`DROP TABLE amsam_events`);
          await pool.run(`ALTER TABLE amsam_events_new RENAME TO amsam_events`);
          await pool.run('COMMIT;');
          await pool.run('PRAGMA foreign_keys=on;');
          console.log('✅ SQLite amsam_events migrated successfully!');
        }
      } catch(e) {
        try { await pool.run('ROLLBACK;'); await pool.run('PRAGMA foreign_keys=on;'); } catch(err) {}
        console.error('Migration error:', e.message);
      }
      try { await pool.run("ALTER TABLE amsam_events ADD COLUMN fee_member INTEGER DEFAULT 0"); } catch(e) {}
      try { await pool.run("ALTER TABLE amsam_events ADD COLUMN club_fees TEXT DEFAULT NULL"); } catch(e) {}
      try { await pool.run("ALTER TABLE amsam_users ADD COLUMN clubs TEXT DEFAULT NULL"); } catch(e) {}
      try { await pool.run("ALTER TABLE amsam_users ADD COLUMN membership_valid_till TEXT DEFAULT NULL"); } catch(e) {}

      // Workshops feature
      await pool.run(`
        CREATE TABLE IF NOT EXISTS amsam_workshops (
          id               INTEGER PRIMARY KEY AUTOINCREMENT,
          title            TEXT NOT NULL,
          description      TEXT,
          venue            TEXT,
          workshop_date    TEXT,
          workshop_to_date TEXT,
          workshop_time    TEXT,
          seats_member     INTEGER DEFAULT 0,
          seats_non_member INTEGER DEFAULT 0,
          seats_club       INTEGER DEFAULT 0,
          club_name        TEXT DEFAULT NULL,
          created_by       INTEGER,
          visibility       TEXT NOT NULL DEFAULT 'student',
          created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (created_by) REFERENCES amsam_users(id) ON DELETE SET NULL
        )
      `);
      await pool.run(`
        CREATE TABLE IF NOT EXISTS amsam_workshop_registrations (
          id            INTEGER PRIMARY KEY AUTOINCREMENT,
          workshop_id   INTEGER NOT NULL,
          user_id       INTEGER NOT NULL,
          seat_type     TEXT CHECK(seat_type IN ('member','non_member','club')) NOT NULL,
          registered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE (workshop_id, user_id),
          FOREIGN KEY (workshop_id) REFERENCES amsam_workshops(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id)    REFERENCES amsam_users(id)     ON DELETE CASCADE
        )
      `);
      // Migration: add workshop-specific columns if the table existed before (e.g. as events table)
      try { await pool.run('ALTER TABLE amsam_workshops ADD COLUMN workshop_date TEXT'); } catch(e) {}
      try { await pool.run('ALTER TABLE amsam_workshops ADD COLUMN workshop_to_date TEXT'); } catch(e) {}
      try { await pool.run('ALTER TABLE amsam_workshops ADD COLUMN workshop_time TEXT'); } catch(e) {}
      try { await pool.run('ALTER TABLE amsam_workshops ADD COLUMN seats_member INTEGER DEFAULT 0'); } catch(e) {}
      try { await pool.run('ALTER TABLE amsam_workshops ADD COLUMN seats_non_member INTEGER DEFAULT 0'); } catch(e) {}
      try { await pool.run('ALTER TABLE amsam_workshops ADD COLUMN seats_club INTEGER DEFAULT 0'); } catch(e) {}
      try { await pool.run('ALTER TABLE amsam_workshops ADD COLUMN club_name TEXT DEFAULT NULL'); } catch(e) {}
      try { await pool.run('ALTER TABLE amsam_workshops ADD COLUMN fee_member INTEGER DEFAULT 0'); } catch(e) {}
      try { await pool.run('ALTER TABLE amsam_workshops ADD COLUMN fee_non_member INTEGER DEFAULT 0'); } catch(e) {}
      try { await pool.run('ALTER TABLE amsam_workshops ADD COLUMN fee_club INTEGER DEFAULT 0'); } catch(e) {}
      try { await pool.run('ALTER TABLE amsam_workshops ADD COLUMN club_slots TEXT DEFAULT NULL'); } catch(e) {}
      try { await pool.run("ALTER TABLE amsam_workshops ADD COLUMN visibility TEXT NOT NULL DEFAULT 'student'"); } catch(e) {}
      // Migration: add missing columns to workshop_registrations (may have been created as event registrations)
      try { await pool.run("ALTER TABLE amsam_workshop_registrations ADD COLUMN seat_type TEXT NOT NULL DEFAULT 'non_member'"); } catch(e) {}
      try { await pool.run('ALTER TABLE amsam_workshop_registrations ADD COLUMN registered_at DATETIME DEFAULT CURRENT_TIMESTAMP'); } catch(e) {}

      // Clubs table
      await pool.run(`
        CREATE TABLE IF NOT EXISTS amsam_clubs (
          id         INTEGER PRIMARY KEY AUTOINCREMENT,
          name       TEXT UNIQUE NOT NULL,
          icon       TEXT DEFAULT '🎭',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      try { await pool.run("ALTER TABLE amsam_clubs ADD COLUMN icon TEXT DEFAULT '🎭'"); } catch(e) {}
      // Seed default clubs if none exist
      const clubCount = await pool.get('SELECT COUNT(*) as c FROM amsam_clubs');
      if ((clubCount?.c ?? 0) === 0) {
        for (const name of ['Literature', 'Sports', 'Music', 'Arts', 'Tech']) {
          try { await pool.run('INSERT INTO amsam_clubs (name) VALUES (?)', [name]); } catch(e) {}
        }
      }
      const row = await pool.get('SELECT COUNT(*) as c FROM amsam_users');
      const count = row ? row.c : 0;

      if (count === 0) {
        const h = (p) => bcrypt.hashSync(p, 10);
        const ins = `INSERT INTO amsam_users (name, college_id, email, password_hash, role, batch, department, phone) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

        await pool.run(ins, ['Admin',            'ADMIN001',    'admin@amsam.in',                          h('Admin@123'),    'super_admin', '2018', 'Administration',  '9999999999']);
        await pool.run(ins, ['Dr. Meena Pillai', 'SADMIN001',   'subadmin@amsam.in',                       h('SubAdmin@123'), 'sub_admin',   '2019', 'General Medicine', '8888888888']);
        await pool.run(ins, ['Arjun Sharma',     'MBBS2023001', 'arjun.sharma@aiimsmangalagiri.edu.in',    h('Student@123'),  'student',     '2023', 'MBBS',             '7777777701']);
        await pool.run(ins, ['Priya Nair',       'MBBS2023002', 'priya.nair@aiimsmangalagiri.edu.in',      h('Student@123'),  'student',     '2023', 'MBBS',             '7777777702']);
        await pool.run(ins, ['Rahul Reddy',      'MBBS2022001', 'rahul.reddy@aiimsmangalagiri.edu.in',     h('Student@123'),  'student',     '2022', 'MBBS',             '7777777703']);
        await pool.run(ins, ['Sneha Thomas',     'MBBS2022002', 'sneha.thomas@aiimsmangalagiri.edu.in',    h('Student@123'),  'student',     '2022', 'MBBS',             '7777777704']);

        const admin   = await pool.get('SELECT id FROM amsam_users WHERE college_id = ?', ['ADMIN001']);
        const subadmin = await pool.get('SELECT id FROM amsam_users WHERE college_id = ?', ['SADMIN001']);

        const insE = `INSERT INTO amsam_events (title, description, venue, event_date, event_time, created_by, visibility) VALUES (?,?,?,?,?,?,?)`;
        await pool.run(insE, ['Annual Medical Symposium 2025', 'A grand symposium featuring lectures from renowned medical professionals across India.', 'Main Auditorium, AIIMS Mangalagiri', '2025-05-15', '09:00 AM', admin.id, 'all']);
        await pool.run(insE, ['Blood Donation Camp', 'AMSAM organizes its annual blood donation camp in collaboration with the hospital blood bank.', 'Ground Floor Lobby, AIIMS Mangalagiri', '2025-04-25', '10:00 AM', admin.id, 'student']);
        await pool.run(insE, ['CPR & BLS Training Workshop', 'Hands-on CPR and Basic Life Support training for all MBBS students.', 'Skills Lab, AIIMS Mangalagiri', '2025-05-05', '02:00 PM', subadmin.id, 'student']);

        console.log('✅ AMSAM SQLite database seeded with demo data.');
      }

      console.log('✅ AMSAM SQLite tables ready.');
    } catch (err) {
      console.error('❌ Failed to initialize SQLite database:', err.message);
      throw err;
    }
  } else {
    // MySQL DB Initialization
    const conn = await pool.getConnection();
    try {
      await conn.query(`
        CREATE TABLE IF NOT EXISTS amsam_users (
          id            INT AUTO_INCREMENT PRIMARY KEY,
          name          VARCHAR(255) NOT NULL,
          college_id    VARCHAR(100) UNIQUE NOT NULL,
          email         VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          photo_path    VARCHAR(500) DEFAULT NULL,
          role          ENUM('super_admin','sub_admin','student','guest') NOT NULL DEFAULT 'student',
          organization  VARCHAR(255) DEFAULT NULL,
          batch         VARCHAR(50)  DEFAULT NULL,
          department    VARCHAR(100) DEFAULT NULL,
          phone         VARCHAR(20)  DEFAULT NULL,
          is_paid       TINYINT(1)   NOT NULL DEFAULT 0,
          paid_at       DATETIME     DEFAULT NULL,
          created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await conn.query(`
        CREATE TABLE IF NOT EXISTS amsam_events (
          id          INT AUTO_INCREMENT PRIMARY KEY,
          title       VARCHAR(255) NOT NULL,
          description TEXT,
          venue       VARCHAR(255),
          event_date  VARCHAR(50),
          event_time  VARCHAR(50),
          fee         INT DEFAULT 0,
          fee_member  INT DEFAULT 0,
          club_fees   TEXT DEFAULT NULL,
          created_by  INT,
          visibility  VARCHAR(50) NOT NULL DEFAULT 'student',
          created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (created_by) REFERENCES amsam_users(id) ON DELETE SET NULL
        )
      `);
      await conn.query(`
        CREATE TABLE IF NOT EXISTS amsam_documents (
          id          INT AUTO_INCREMENT PRIMARY KEY,
          title       VARCHAR(255) NOT NULL,
          description TEXT,
          category    ENUM('Int','Ext','Adm','Ntc','Agr') NOT NULL,
          file_path   VARCHAR(500) NOT NULL,
          created_by  INT,
          created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (created_by) REFERENCES amsam_users(id) ON DELETE SET NULL
        )
      `);
      await conn.query(`
        CREATE TABLE IF NOT EXISTS amsam_registrations (
          id          INT AUTO_INCREMENT PRIMARY KEY,
          user_id     INT,
          event_id    INT,
          qr_code     VARCHAR(255) UNIQUE NOT NULL,
          is_paid     TINYINT(1) NOT NULL DEFAULT 0,
          is_admitted TINYINT(1) NOT NULL DEFAULT 0,
          created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY unique_reg (user_id, event_id),
          FOREIGN KEY (user_id)  REFERENCES amsam_users(id)  ON DELETE CASCADE,
          FOREIGN KEY (event_id) REFERENCES amsam_events(id) ON DELETE CASCADE
        )
      `);
      await conn.query(`
        CREATE TABLE IF NOT EXISTS amsam_payment_orders (
          order_id   VARCHAR(100) PRIMARY KEY,
          user_id    INT NOT NULL,
          event_id   INT NOT NULL,
          status     VARCHAR(50) DEFAULT 'created',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Migrate existing installations — add columns/values if missing
      try { await conn.query(`ALTER TABLE amsam_users MODIFY role ENUM('super_admin','sub_admin','student','guest','pg_student') NOT NULL DEFAULT 'student'`); } catch(e) {}
      try { await conn.query(`ALTER TABLE amsam_users ADD COLUMN organization VARCHAR(255) DEFAULT NULL`); } catch(e) {}
      try { await conn.query(`ALTER TABLE amsam_events ADD COLUMN visibility VARCHAR(50) NOT NULL DEFAULT 'student'`); } catch(e) {}
      try { await conn.query(`ALTER TABLE amsam_events ADD COLUMN fee_member INT DEFAULT 0`); } catch(e) {}
      try { await conn.query(`ALTER TABLE amsam_events ADD COLUMN club_fees TEXT DEFAULT NULL`); } catch(e) {}
      try { await conn.query(`ALTER TABLE amsam_users ADD COLUMN clubs VARCHAR(255) DEFAULT NULL`); } catch(e) {}
      try { await conn.query(`ALTER TABLE amsam_users ADD COLUMN membership_valid_till VARCHAR(50) DEFAULT NULL`); } catch(e) {}

      // Workshops feature
      await conn.query(`
        CREATE TABLE IF NOT EXISTS amsam_workshops (
          id               INT AUTO_INCREMENT PRIMARY KEY,
          title            VARCHAR(255) NOT NULL,
          description      TEXT,
          venue            VARCHAR(255),
          workshop_date    VARCHAR(50),
          workshop_to_date VARCHAR(50),
          workshop_time    VARCHAR(50),
          seats_member     INT DEFAULT 0,
          seats_non_member INT DEFAULT 0,
          seats_club       INT DEFAULT 0,
          club_name        VARCHAR(100) DEFAULT NULL,
          created_by       INT,
          visibility       VARCHAR(50) NOT NULL DEFAULT 'student',
          created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (created_by) REFERENCES amsam_users(id) ON DELETE SET NULL
        )
      `);
      await conn.query(`
        CREATE TABLE IF NOT EXISTS amsam_workshop_registrations (
          id            INT AUTO_INCREMENT PRIMARY KEY,
          workshop_id   INT NOT NULL,
          user_id       INT NOT NULL,
          seat_type     ENUM('member','non_member','club') NOT NULL,
          registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY unique_wreg (workshop_id, user_id),
          FOREIGN KEY (workshop_id) REFERENCES amsam_workshops(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id)    REFERENCES amsam_users(id)     ON DELETE CASCADE
        )
      `);
      // MySQL Migrations for workshops (if the table already existed)
      try { await conn.query('ALTER TABLE amsam_workshops ADD COLUMN workshop_date VARCHAR(50)'); } catch(e) {}
      try { await conn.query('ALTER TABLE amsam_workshops ADD COLUMN workshop_to_date VARCHAR(50)'); } catch(e) {}
      try { await conn.query('ALTER TABLE amsam_workshops ADD COLUMN workshop_time VARCHAR(50)'); } catch(e) {}
      try { await conn.query('ALTER TABLE amsam_workshops ADD COLUMN seats_member INT DEFAULT 0'); } catch(e) {}
      try { await conn.query('ALTER TABLE amsam_workshops ADD COLUMN seats_non_member INT DEFAULT 0'); } catch(e) {}
      try { await conn.query('ALTER TABLE amsam_workshops ADD COLUMN seats_club INT DEFAULT 0'); } catch(e) {}
      try { await conn.query('ALTER TABLE amsam_workshops ADD COLUMN club_name VARCHAR(100) DEFAULT NULL'); } catch(e) {}
      try { await conn.query('ALTER TABLE amsam_workshops ADD COLUMN fee_member INT DEFAULT 0'); } catch(e) {}
      try { await conn.query('ALTER TABLE amsam_workshops ADD COLUMN fee_non_member INT DEFAULT 0'); } catch(e) {}
      try { await conn.query('ALTER TABLE amsam_workshops ADD COLUMN fee_club INT DEFAULT 0'); } catch(e) {}
      try { await conn.query('ALTER TABLE amsam_workshops ADD COLUMN club_slots TEXT DEFAULT NULL'); } catch(e) {}
      try { await conn.query("ALTER TABLE amsam_workshops ADD COLUMN visibility VARCHAR(50) NOT NULL DEFAULT 'student'"); } catch(e) {}
      
      try { await conn.query("ALTER TABLE amsam_workshop_registrations ADD COLUMN seat_type ENUM('member','non_member','club') NOT NULL DEFAULT 'non_member'"); } catch(e) {}
      try { await conn.query('ALTER TABLE amsam_workshop_registrations ADD COLUMN registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP'); } catch(e) {}

      // Clubs table
      await conn.query(`
        CREATE TABLE IF NOT EXISTS amsam_clubs (
          id         INT AUTO_INCREMENT PRIMARY KEY,
          name       VARCHAR(100) UNIQUE NOT NULL,
          icon       VARCHAR(20) DEFAULT '🎭',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      try { await conn.query("ALTER TABLE amsam_clubs ADD COLUMN icon VARCHAR(20) DEFAULT '🎭'"); } catch(e) {}
      // Seed default clubs if none exist
      const [[{ clubCount }]] = await conn.query('SELECT COUNT(*) as clubCount FROM amsam_clubs');
      if (clubCount === 0) {
        for (const name of ['Literature', 'Sports', 'Music', 'Arts', 'Tech']) {
          try { await conn.query('INSERT INTO amsam_clubs (name) VALUES (?)', [name]); } catch(e) {}
        }
      }
      // Seed only if empty
      const [[{ c }]] = await conn.query('SELECT COUNT(*) as c FROM amsam_users');
      if (c === 0) {
        const h = (p) => bcrypt.hashSync(p, 10);
        const ins = `INSERT INTO amsam_users (name, college_id, email, password_hash, role, batch, department, phone) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

        await conn.query(ins, ['Admin',            'ADMIN001',    'admin@amsam.in',                          h('Admin@123'),    'super_admin', '2018', 'Administration',  '9999999999']);
        await conn.query(ins, ['Dr. Meena Pillai', 'SADMIN001',   'subadmin@amsam.in',                       h('SubAdmin@123'), 'sub_admin',   '2019', 'General Medicine', '8888888888']);
        await conn.query(ins, ['Arjun Sharma',     'MBBS2023001', 'arjun.sharma@aiimsmangalagiri.edu.in',    h('Student@123'),  'student',     '2023', 'MBBS',             '7777777701']);
        await conn.query(ins, ['Priya Nair',       'MBBS2023002', 'priya.nair@aiimsmangalagiri.edu.in',      h('Student@123'),  'student',     '2023', 'MBBS',             '7777777702']);
        await conn.query(ins, ['Rahul Reddy',      'MBBS2022001', 'rahul.reddy@aiimsmangalagiri.edu.in',     h('Student@123'),  'student',     '2022', 'MBBS',             '7777777703']);
        await conn.query(ins, ['Sneha Thomas',     'MBBS2022002', 'sneha.thomas@aiimsmangalagiri.edu.in',    h('Student@123'),  'student',     '2022', 'MBBS',             '7777777704']);

        const [[admin]]   = await conn.query('SELECT id FROM amsam_users WHERE college_id = ?', ['ADMIN001']);
        const [[subadmin]] = await conn.query('SELECT id FROM amsam_users WHERE college_id = ?', ['SADMIN001']);

        const insE = `INSERT INTO amsam_events (title, description, venue, event_date, event_time, created_by, visibility) VALUES (?,?,?,?,?,?,?)`;
        await conn.query(insE, ['Annual Medical Symposium 2025', 'A grand symposium featuring lectures from renowned medical professionals across India.', 'Main Auditorium, AIIMS Mangalagiri', '2025-05-15', '09:00 AM', admin.id, 'all']);
        await conn.query(insE, ['Blood Donation Camp', 'AMSAM organizes its annual blood donation camp in collaboration with the hospital blood bank.', 'Ground Floor Lobby, AIIMS Mangalagiri', '2025-04-25', '10:00 AM', admin.id, 'student']);
        await conn.query(insE, ['CPR & BLS Training Workshop', 'Hands-on CPR and Basic Life Support training for all MBBS students.', 'Skills Lab, AIIMS Mangalagiri', '2025-05-05', '02:00 PM', subadmin.id, 'student']);

        console.log('✅ AMSAM database seeded with demo data.');
      }

      console.log('✅ AMSAM MySQL tables ready.');
    } finally {
      conn.release();
    }
  }
}

module.exports = pool;
module.exports.initDB = initDB;
