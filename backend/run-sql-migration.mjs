/**
 * Execute SQL Migration via Direct PostgreSQL Connection
 * Usage: node run-sql-migration.mjs <path-to-sql-file>
 */

import pkg from 'pg';
const { Client } = pkg;
import { readFileSync } from 'fs';
import { resolve } from 'path';
import dotenv from 'dotenv';

dotenv.config();

async function executeMigration(filePath) {
  const client = new Client({
    connectionString: `postgresql://postgres.hbsynkxaadnximuytbor:${process.env.SUPABASE_DB_PASSWORD}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected!\n');
    
    console.log('📄 Reading SQL file:', filePath);
    const sqlContent = readFileSync(filePath, 'utf8');
    console.log('📊 File size:', (sqlContent.length / 1024).toFixed(2), 'KB\n');
    
    console.log('🚀 Executing migration...');
    const result = await client.query(sqlContent);
    
    console.log('✅ Migration executed successfully!');
    if (result.rows && result.rows.length > 0) {
      console.log('   Rows affected:', result.rowCount);
      console.log('   Sample result:', JSON.stringify(result.rows[0], null, 2));
    } else {
      console.log('   No rows returned');
    }
    
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    if (err.position) {
      const lines = readFileSync(filePath, 'utf8').split('\n');
      const errorLine = Math.floor(err.position / 80); // Approximate
      console.error('   Around line:', errorLine);
      console.error('   Context:', lines.slice(Math.max(0, errorLine - 2), errorLine + 3).join('\n'));
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Get file path from command line
const filePath = process.argv[2];

if (!filePath) {
  console.error('❌ Usage: node run-sql-migration.mjs <path-to-sql-file>');
  console.error('   Example: node run-sql-migration.mjs database/036_inventory_advanced_features.sql');
  process.exit(1);
}

const resolvedPath = resolve(filePath);
console.log('🔧 Executing SQL migration...\n');
console.log('File:', resolvedPath);
console.log('='.repeat(60) + '\n');
executeMigration(resolvedPath);
