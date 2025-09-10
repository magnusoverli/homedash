import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbDir = path.join(__dirname, 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'homedash.db');

const Database = sqlite3.verbose().Database;
const db = new Database(dbPath, err => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    // Enable foreign key constraints
    db.run('PRAGMA foreign_keys = ON', (pragmaErr) => {
      if (pragmaErr) {
        console.error('Error enabling foreign keys:', pragmaErr.message);
      } else {
        console.log('Foreign key constraints enabled');
      }
    });
  }
});

const initDatabase = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(
        `
        CREATE TABLE IF NOT EXISTS family_members (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          color TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `,
        err => {
          if (err) {
            console.error('Error creating family_members table:', err);
            return reject(err);
          }
        }
      );

      db.run(
        `
        CREATE TABLE IF NOT EXISTS activities (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          member_id INTEGER NOT NULL,
          title TEXT NOT NULL,
          date TEXT NOT NULL,
          start_time TEXT NOT NULL,
          end_time TEXT NOT NULL,
          description TEXT,
          activity_type TEXT DEFAULT 'manual',
          recurrence_type TEXT DEFAULT 'none',
          recurrence_end_date TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (member_id) REFERENCES family_members (id) ON DELETE CASCADE
        )
      `,
        err => {
          if (err) {
            console.error('Error creating activities table:', err);
            return reject(err);
          }
        }
      );

      // Add new columns to existing activities table if they don't exist
      db.run(
        `ALTER TABLE activities ADD COLUMN activity_type TEXT DEFAULT 'manual'`,
        err => {
          // Ignore error if column already exists
          if (err && !err.message.includes('duplicate column name')) {
            console.error('Error adding activity_type column:', err);
          }
        }
      );

      db.run(
        `ALTER TABLE activities ADD COLUMN recurrence_type TEXT DEFAULT 'none'`,
        err => {
          // Ignore error if column already exists
          if (err && !err.message.includes('duplicate column name')) {
            console.error('Error adding recurrence_type column:', err);
          }
        }
      );

      db.run(
        `ALTER TABLE activities ADD COLUMN recurrence_end_date TEXT`,
        err => {
          // Ignore error if column already exists
          if (err && !err.message.includes('duplicate column name')) {
            console.error('Error adding recurrence_end_date column:', err);
          }
        }
      );

      db.run(
        `ALTER TABLE activities ADD COLUMN notes TEXT`,
        err => {
          // Ignore error if column already exists
          if (err && !err.message.includes('duplicate column name')) {
            console.error('Error adding notes column:', err);
          }
        }
      );

      db.run(
        `
        CREATE TABLE IF NOT EXISTS homework (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          member_id INTEGER NOT NULL,
          subject TEXT NOT NULL,
          assignment TEXT NOT NULL,
          due_date TEXT,
          completed BOOLEAN DEFAULT FALSE,
          extracted_from_image TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (member_id) REFERENCES family_members (id) ON DELETE CASCADE
        )
      `,
        err => {
          if (err) {
            console.error('Error creating homework table:', err);
            return reject(err);
          }
        }
      );

      db.run(
        `
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `,
        err => {
          if (err) {
            console.error('Error creating settings table:', err);
            return reject(err);
          }
        }
      );

      db.run(`
        CREATE INDEX IF NOT EXISTS idx_activities_member_date 
        ON activities(member_id, date)
      `);

      db.run(`
        CREATE INDEX IF NOT EXISTS idx_activities_date 
        ON activities(date)
      `);

      db.run(`
        CREATE INDEX IF NOT EXISTS idx_homework_member 
        ON homework(member_id)
      `);

      db.run(
        `
        CREATE INDEX IF NOT EXISTS idx_homework_due_date 
        ON homework(due_date)
      `,
        err => {
          if (err) {
            console.error('Error creating indexes:', err);
            return reject(err);
          }
          
          console.log('Database initialized successfully');
          resolve();
        }
      );
    });
  });
};

const runQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id: this.lastID, changes: this.changes });
      }
    });
  });
};

const getAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

const getOne = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

export { db, initDatabase, runQuery, getAll, getOne };
