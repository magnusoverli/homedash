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

console.log('Migrating spond_groups table to add profile columns...');

// Add profile_id column
db.run(
  `ALTER TABLE spond_groups ADD COLUMN profile_id TEXT`,
  err => {
    if (err) {
      if (err.message.includes('duplicate column name')) {
        console.log('✓ profile_id column already exists');
      } else {
        console.error('❌ Error adding profile_id column:', err);
      }
    } else {
      console.log('✅ Added profile_id column');
    }

    // Add profile_name column
    db.run(
      `ALTER TABLE spond_groups ADD COLUMN profile_name TEXT`,
      err => {
        if (err) {
          if (err.message.includes('duplicate column name')) {
            console.log('✓ profile_name column already exists');
          } else {
            console.error('❌ Error adding profile_name column:', err);
          }
        } else {
          console.log('✅ Added profile_name column');
        }

        // Clear existing group selections since we're changing the logic
        console.log('Clearing existing group selections (is_active = FALSE)...');
        db.run(
          `UPDATE spond_groups SET is_active = FALSE`,
          err => {
            if (err) {
              console.error('❌ Error clearing group selections:', err);
            } else {
              console.log('✅ Cleared existing group selections');
            }

            // Close the database
            db.close(err => {
              if (err) {
                console.error('Error closing database:', err.message);
              } else {
                console.log('Database connection closed.');
                console.log('Migration completed successfully!');
              }
            });
          }
        );
      }
    );
  }
);
