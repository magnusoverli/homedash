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

      // Create Spond tables sequentially to ensure proper order
      const createSpondTables = () => {
        return new Promise((tableResolve, tableReject) => {
          // Spond Groups Table
          db.run(
            `
            CREATE TABLE IF NOT EXISTS spond_groups (
              id TEXT PRIMARY KEY,
              member_id INTEGER NOT NULL,
              name TEXT NOT NULL,
              description TEXT,
              image_url TEXT,
              is_active BOOLEAN DEFAULT FALSE,
              last_synced_at DATETIME,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (member_id) REFERENCES family_members (id) ON DELETE CASCADE
            )
          `,
            err => {
              if (err) {
                console.error('Error creating spond_groups table:', err);
                return tableReject(err);
              }
              console.log('✅ spond_groups table created');

              // Spond Activities Table
              db.run(
                `
                CREATE TABLE IF NOT EXISTS spond_activities (
                  id TEXT PRIMARY KEY,
                  group_id TEXT NOT NULL,
                  member_id INTEGER NOT NULL,
                  title TEXT NOT NULL,
                  description TEXT,
                  start_timestamp DATETIME NOT NULL,
                  end_timestamp DATETIME NOT NULL,
                  location_name TEXT,
                  location_address TEXT,
                  location_latitude REAL,
                  location_longitude REAL,
                  activity_type TEXT,
                  is_cancelled BOOLEAN DEFAULT FALSE,
                  max_accepted INTEGER,
                  auto_accept BOOLEAN DEFAULT FALSE,
                  response_status TEXT,
                  response_comment TEXT,
                  organizer_name TEXT,
                  raw_data TEXT,
                  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                  FOREIGN KEY (group_id) REFERENCES spond_groups (id) ON DELETE CASCADE,
                  FOREIGN KEY (member_id) REFERENCES family_members (id) ON DELETE CASCADE
                )
              `,
                err => {
                  if (err) {
                    console.error('Error creating spond_activities table:', err);
                    return tableReject(err);
                  }
                  console.log('✅ spond_activities table created');

                  // Spond Sync Log Table - drop and recreate to ensure clean schema
                  db.run('DROP TABLE IF EXISTS spond_sync_log', (dropErr) => {
                    if (dropErr) {
                      console.error('❌ Error dropping spond_sync_log table:', dropErr);
                      return tableReject(dropErr);
                    }
                    
                    console.log('🗑️ spond_sync_log table dropped (if existed)');
                    
                    // Create new table with correct schema
                    db.run(
                      `
                      CREATE TABLE spond_sync_log (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        member_id INTEGER NOT NULL,
                        group_id TEXT,
                        sync_type TEXT NOT NULL,
                        status TEXT NOT NULL,
                        activities_synced INTEGER DEFAULT 0,
                        error_message TEXT,
                        sync_duration_ms INTEGER,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (member_id) REFERENCES family_members (id) ON DELETE CASCADE
                      )
                    `,
                      err => {
                        if (err) {
                          console.error('Error creating spond_sync_log table:', err);
                          return tableReject(err);
                        }
                        console.log('✅ spond_sync_log table created');
                        tableResolve();
                      }
                    );
                  });
                }
              );
            }
          );
        });
      };

      db.run(`
        CREATE INDEX IF NOT EXISTS idx_homework_due_date 
        ON homework(due_date)
      `);

      // Create all Spond-related indexes after tables are created
      const createSpondIndexes = () => {
        return new Promise((indexResolve, indexReject) => {
          db.run(`
            CREATE INDEX IF NOT EXISTS idx_spond_groups_member 
            ON spond_groups(member_id)
          `, (err) => {
            if (err) {
              console.error('Error creating idx_spond_groups_member:', err);
              return indexReject(err);
            }

            db.run(`
              CREATE INDEX IF NOT EXISTS idx_spond_groups_active 
              ON spond_groups(member_id, is_active)
            `, (err) => {
              if (err) {
                console.error('Error creating idx_spond_groups_active:', err);
                return indexReject(err);
              }

              db.run(`
                CREATE INDEX IF NOT EXISTS idx_spond_activities_member_time 
                ON spond_activities(member_id, start_timestamp)
              `, (err) => {
                if (err) {
                  console.error('Error creating idx_spond_activities_member_time:', err);
                  return indexReject(err);
                }

                db.run(`
                  CREATE INDEX IF NOT EXISTS idx_spond_activities_group 
                  ON spond_activities(group_id)
                `, (err) => {
                  if (err) {
                    console.error('Error creating idx_spond_activities_group:', err);
                    return indexReject(err);
                  }

                  db.run(`
                    CREATE INDEX IF NOT EXISTS idx_spond_sync_log_member 
                    ON spond_sync_log(member_id)
                  `, (err) => {
                    if (err) {
                      console.error('Error creating idx_spond_sync_log_member:', err);
                      return indexReject(err);
                    }
                    
                    console.log('All Spond indexes created successfully');
                    indexResolve();
                  });
                });
              });
            });
          });
        });
      };

      // Create Spond tables first, then indexes
      createSpondTables()
        .then(() => {
          console.log('✅ All Spond tables created, now creating indexes...');
          return createSpondIndexes();
        })
        .then(() => {
          console.log('Database initialized successfully');
          resolve();
        })
        .catch((err) => {
          console.error('Error creating Spond tables or indexes:', err);
          return reject(err);
        });
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
