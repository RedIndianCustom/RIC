#!/usr/bin/env node

/**
 * ============================================================================
 * Migration 029: Populate Position Codes
 * ============================================================================
 * Run this script to populate missing position_code values for existing
 * inventory units that have complete hierarchical location data.
 * ============================================================================
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pkg from 'pg';
const { Pool } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Terminal colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function runMigration() {
  log('\n════════════════════════════════════════════════════════════════════════════', 'cyan');
  log('  🔄 Migration 029: Populate Position Codes', 'bright');
  log('════════════════════════════════════════════════════════════════════════════\n', 'cyan');

  const client = await pool.connect();
  
  try {
    log('📂 Loading migration file...', 'blue');
    const migrationPath = join(__dirname, 'database', '029_populate_position_codes.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');
    
    log('✅ Migration file loaded\n', 'green');
    log('⚙️  Executing migration...', 'blue');
    
    // Split SQL by statement and execute them one by one to capture RAISE NOTICE
    const statements = migrationSQL.split(';').filter(s => s.trim().length > 0);
    
    for (const statement of statements) {
      const trimmed = statement.trim();
      if (trimmed.length === 0) continue;
      
      try {
        const result = await client.query(trimmed);
        
        // PostgreSQL NOTICE messages are available in result.notices
        if (result.notices && result.notices.length > 0) {
          result.notices.forEach(notice => {
            log(notice.message, 'cyan');
          });
        }
      } catch (stmtError) {
        // Some statements might naturally error (like RAISE statements)
        // Only throw if it's a real SQL error
        if (!stmtError.message.includes('RAISE')) {
          throw stmtError;
        }
      }
    }
    
    log('\n✅ Migration completed successfully!', 'green');
    
  } catch (error) {
    log('\n❌ Migration failed!', 'red');
    log(`Error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration
runMigration().catch(err => {
  log('\n❌ Unexpected error:', 'red');
  console.error(err);
  process.exit(1);
});
