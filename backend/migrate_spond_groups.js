#!/usr/bin/env node

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database connection
const dbPath = path.join(__dirname, 'data', 'homedash.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error opening database:', err.message);
    process.exit(1);
  }
  console.log('🔗 Connected to SQLite database');
});

const runQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ lastID: this.lastID, changes: this.changes });
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

async function migrateSpondGroups() {
  try {
    console.log('🔄 Starting spond_groups table migration...');
    
    // 1. Backup existing data
    console.log('📋 Backing up existing spond_groups data...');
    const existingData = await getAll('SELECT * FROM spond_groups');
    console.log(`✅ Found ${existingData.length} existing group records`);
    
    // 2. Drop existing table
    console.log('🗑️ Dropping existing spond_groups table...');
    await runQuery('DROP TABLE IF EXISTS spond_groups');
    
    // 3. Create new table with composite primary key
    console.log('🔨 Creating new spond_groups table with composite primary key...');
    await runQuery(`
      CREATE TABLE spond_groups (
        id TEXT NOT NULL,
        member_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        image_url TEXT,
        is_active BOOLEAN DEFAULT FALSE,
        last_synced_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id, member_id),
        FOREIGN KEY (member_id) REFERENCES family_members (id) ON DELETE CASCADE
      )
    `);
    
    // 4. Restore data
    if (existingData.length > 0) {
      console.log('📥 Restoring backed up data...');
      for (const row of existingData) {
        try {
          await runQuery(`
            INSERT INTO spond_groups (
              id, member_id, name, description, image_url, is_active, 
              last_synced_at, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            row.id, row.member_id, row.name, row.description, row.image_url,
            row.is_active, row.last_synced_at, row.created_at, row.updated_at
          ]);
        } catch (insertError) {
          console.warn(`⚠️ Could not restore record for group ${row.id}, member ${row.member_id}:`, insertError.message);
        }
      }
      console.log('✅ Data restoration completed');
    }
    
    // 5. Recreate indexes
    console.log('🔍 Creating indexes...');
    await runQuery(`
      CREATE INDEX IF NOT EXISTS idx_spond_groups_member 
      ON spond_groups(member_id)
    `);
    
    await runQuery(`
      CREATE INDEX IF NOT EXISTS idx_spond_groups_active 
      ON spond_groups(member_id, is_active)
    `);
    
    console.log('✅ Migration completed successfully!');
    console.log(`📊 Final record count: ${(await getAll('SELECT COUNT(*) as count FROM spond_groups'))[0].count}`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run migration
migrateSpondGroups()
  .then(() => {
    console.log('🎉 Migration script completed successfully');
    db.close();
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration script failed:', error);
    db.close();
    process.exit(1);
  });
