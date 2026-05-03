// server/database.js
// SQLite database setup and connection for BBMS Express server

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'bbms.db');

// Create database connection
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('[DB] Error opening database:', err.message);
  } else {
    console.log('[DB] Connected to SQLite database at', DB_PATH);
    initTables();
  }
});

// Initialize database tables
function initTables() {
  // Donors table
  db.run(`
    CREATE TABLE IF NOT EXISTS donors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      donor_number TEXT UNIQUE NOT NULL,
      national_id TEXT UNIQUE NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      date_of_birth TEXT NOT NULL,
      gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
      blood_type TEXT NOT NULL CHECK (blood_type IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
      phone TEXT NOT NULL,
      email TEXT,
      address TEXT NOT NULL,
      city TEXT NOT NULL,
      emergency_contact_name TEXT,
      emergency_contact_phone TEXT,
      last_donation_date TEXT,
      total_donations INTEGER DEFAULT 0,
      is_eligible INTEGER DEFAULT 1,
      notes TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      version INTEGER DEFAULT 1
    )
  `, (err) => {
    if (err) {
      console.error('[DB] Error creating donors table:', err.message);
    } else {
      console.log('[DB] Donors table ready');
    }
  });

  // Visits table
  db.run(`
    CREATE TABLE IF NOT EXISTS visits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      visit_number TEXT UNIQUE NOT NULL,
      visit_date TEXT NOT NULL,
      visit_type TEXT NOT NULL CHECK (visit_type IN ('donation', 'checkup', 'deferral')),
      donor_id INTEGER NOT NULL,
      weight REAL,
      blood_pressure_systolic INTEGER,
      blood_pressure_diastolic INTEGER,
      pulse INTEGER,
      temperature REAL,
      hemoglobin REAL,
      blood_bag_number TEXT,
      blood_volume INTEGER DEFAULT 0,
      status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'deferred', 'rejected')),
      deferral_reason TEXT,
      deferral_until TEXT,
      registered_by TEXT,
      screened_by TEXT,
      collected_by TEXT,
      notes TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      version INTEGER DEFAULT 1,
      FOREIGN KEY (donor_id) REFERENCES donors(id) ON DELETE CASCADE
    )
  `, (err) => {
    if (err) {
      console.error('[DB] Error creating visits table:', err.message);
    } else {
      console.log('[DB] Visits table ready');
    }
  });
}

// Helper function to run SQL with promises
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id: this.lastID, changes: this.changes });
      }
    });
  });
}

// Helper function to get single row
function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

// Helper function to get all rows
function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

module.exports = {
  db,
  run,
  get,
  all,
};
