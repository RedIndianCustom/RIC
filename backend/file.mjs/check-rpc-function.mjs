import 'dotenv/config';
import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

try {
  await client.connect();
  console.log('✅ Connected to database');
  
  // Check if RPC function exists
  const result = await client.query(`
    SELECT 
      routine_name, 
      routine_type,
      data_type
    FROM information_schema.routines 
    WHERE routine_schema = 'public' 
    AND routine_name = 'create_inventory_barcodes'
  `);
  
  if (result.rows.length > 0) {
    console.log('\n✅ RPC Function EXISTS:');
    console.log(JSON.stringify(result.rows, null, 2));
  } else {
    console.log('\n❌ RPC Function NOT FOUND!');
    console.log('Need to run: backend/database/015_transaction_safe_barcode_rpc.sql');
  }
  
  // Check barcode_sequence
  const seqResult = await client.query(`
    SELECT sequence_name 
    FROM information_schema.sequences 
    WHERE sequence_schema = 'public' 
    AND sequence_name = 'barcode_sequence'
  `);
  
  if (seqResult.rows.length > 0) {
    console.log('\n✅ Barcode Sequence EXISTS');
  } else {
    console.log('\n❌ Barcode Sequence NOT FOUND!');
  }
  
} catch (err) {
  console.error('❌ Error:', err.message);
} finally {
  await client.end();
}
