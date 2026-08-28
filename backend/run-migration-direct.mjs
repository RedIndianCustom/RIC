#!/usr/bin/env node

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

// Parse connection string from SUPABASE_URL
const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Extract database connection details
// Supabase URL format: https://xxxxx.supabase.co
// We need to construct PostgreSQL connection string
const projectRef = supabaseUrl.replace('https://', '').replace('.supabase.co', '');

console.log('🚀 Direct PostgreSQL Migration Runner\n');
console.log('📝 Instructions:');
console.log('   1. Go to your Supabase Dashboard');
console.log('   2. Click "Project Settings" (gear icon)');
console.log('   3. Click "Database" in sidebar');
console.log('   4. Copy the "Connection string" (URI format)');
console.log('   5. OR use SQL Editor to run the migration manually\n');

console.log('📄 Migration File:');
console.log('   backend/database/030_add_all_product_sizes.sql\n');

console.log('🎯 How to run manually in Supabase SQL Editor:');
console.log('   1. Open Supabase Dashboard → SQL Editor');
console.log('   2. Click "New Query"');
console.log('   3. Copy ALL contents from: backend/database/030_add_all_product_sizes.sql');
console.log('   4. Paste into SQL Editor');
console.log('   5. Click "Run" button\n');

console.log('✅ This will add all 81 products with imperial sizes!');
console.log('   - Classic Sawtooth: 17 sizes');
console.log('   - Enduro Trail: 14 sizes');
console.log('   - Street Dual Sport: 11 sizes');
console.log('   - Dual Sport XT: 10 sizes');
console.log('   - Armor XT: 5 sizes');
console.log('   - Armor ADV: 9 sizes');
console.log('   - ARMOR ST: 13 sizes');
console.log('   - ARMOR ST-X: 2 sizes\n');

// Read and display the SQL file
const sqlFile = join(__dirname, 'database', '030_add_all_product_sizes.sql');
const sql = readFileSync(sqlFile, 'utf-8');

console.log(`📊 File size: ${sql.length} characters`);
console.log(`📦 First 500 characters:\n`);
console.log('─'.repeat(70));
console.log(sql.substring(0, 500));
console.log('...');
console.log('─'.repeat(70));
console.log('\n💡 Copy the full file from: backend/database/030_add_all_product_sizes.sql');
