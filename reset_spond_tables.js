#!/usr/bin/env node

/* eslint-env node */
/* global process */
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'data', 'homedash.db');

console.log('🗑️  Resetting Spond tables...');

const Database = sqlite3.verbose().Database;
const db = new Database(dbPath, err => {
  if (err) {
    console.error('❌ Error opening database:', err.message);
    process.exit(1);
  } else {
    console.log('✅ Connected to database');
  }
});

const resetTables = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Drop Spond tables in correct order (respecting foreign keys)
      console.log('🗑️  Dropping spond_sync_log table...');
      db.run('DROP TABLE IF EXISTS spond_sync_log', err => {
        if (err) {
          console.error('❌ Error dropping spond_sync_log:', err);
          return reject(err);
        }

        console.log('🗑️  Dropping spond_activities table...');
        db.run('DROP TABLE IF EXISTS spond_activities', err => {
          if (err) {
            console.error('❌ Error dropping spond_activities:', err);
            return reject(err);
          }

          console.log('🗑️  Dropping spond_groups table...');
          db.run('DROP TABLE IF EXISTS spond_groups', err => {
            if (err) {
              console.error('❌ Error dropping spond_groups:', err);
              return reject(err);
            }

            console.log('✅ All Spond tables dropped successfully');

            // Recreate tables
            console.log('🔨 Recreating spond_groups table...');
            db.run(
              `
              CREATE TABLE spond_groups (
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
                  console.error('❌ Error creating spond_groups:', err);
                  return reject(err);
                }

                console.log('🔨 Recreating spond_activities table...');
                db.run(
                  `
                CREATE TABLE spond_activities (
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
                      console.error('❌ Error creating spond_activities:', err);
                      return reject(err);
                    }

                    console.log('🔨 Recreating spond_sync_log table...');
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
                          console.error(
                            '❌ Error creating spond_sync_log:',
                            err
                          );
                          return reject(err);
                        }

                        console.log(
                          '✅ All Spond tables recreated successfully'
                        );
                        resolve();
                      }
                    );
                  }
                );
              }
            );
          });
        });
      });
    });
  });
};

resetTables()
  .then(() => {
    console.log('🎉 Spond table reset completed successfully!');
    db.close();
  })
  .catch(err => {
    console.error('❌ Failed to reset Spond tables:', err);
    db.close();
    process.exit(1);
  });
