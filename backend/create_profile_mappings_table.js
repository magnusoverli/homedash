import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'data', 'homedash.db');
const Database = sqlite3.verbose().Database;

const db = new Database(dbPath, err => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  } else {
    console.log('Connected to the SQLite database.');
  }
});

console.log('Creating spond_profile_mappings table...');

db.run(
  `CREATE TABLE IF NOT EXISTS spond_profile_mappings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER NOT NULL,
    spond_profile_id TEXT NOT NULL,
    profile_name TEXT,
    profile_type TEXT CHECK(profile_type IN ('self', 'child', 'dependent')),
    parent_user_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (member_id) REFERENCES family_members(id) ON DELETE CASCADE,
    UNIQUE(member_id)
  )`,
  err => {
    if (err) {
      console.error('❌ Error creating spond_profile_mappings table:', err);
      process.exit(1);
    } else {
      console.log('✅ spond_profile_mappings table created successfully');

      // Create index
      db.run(
        `CREATE INDEX IF NOT EXISTS idx_spond_profile_mappings_member 
        ON spond_profile_mappings(member_id)`,
        err => {
          if (err) {
            console.error('❌ Error creating index:', err);
          } else {
            console.log('✅ Index created successfully');
          }

          // Close the database
          db.close(err => {
            if (err) {
              console.error('Error closing database:', err.message);
            } else {
              console.log('Database connection closed.');
            }
          });
        }
      );
    }
  }
);
