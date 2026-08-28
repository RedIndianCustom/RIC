import 'dotenv/config';
import { readFileSync } from 'fs';
import { supabaseAdmin } from './src/config/supabase.js';

async function applyFix() {
  console.log('🔧 Applying warehouse location code fix...\n');
  
  // Define the updates as an array
  const updates = [
    { old: 'WH1-R1-RK1', new: 'WH1-R01-RK01' },
    { old: 'WH1-R2-RK2', new: 'WH1-R02-RK02' },
    { old: 'WH1-R3-RK3', new: 'WH1-R03-RK03' },
    { old: 'WH1-R4-RK4', new: 'WH1-R04-RK04' },
    { old: 'WH1-R5-RK5', new: 'WH1-R05-RK05' },
    { old: 'WH1-R6-RK6', new: 'WH1-R06-RK06' },
    { old: 'WH1-R7-RK7', new: 'WH1-R07-RK07' }
  ];
  
  for (const update of updates) {
    try {
      const { data, error } = await supabaseAdmin
        .from('warehouse_locations')
        .update({ code: update.new })
        .eq('code', update.old)
        .select();
      
      if (error) {
        console.error(`❌ Error updating ${update.old}:`, error);
      } else if (data && data.length > 0) {
        console.log(`✅ Updated: ${update.old} → ${update.new}`);
      } else {
        console.log(`⚠️ No rows updated for ${update.old} (may not exist)`);
      }
    } catch (err) {
      console.error(`❌ Error updating ${update.old}:`, err);
    }
  }
  
  console.log('\n✅ Fix applied! Now checking...\n');
  
  // Verify the fix
  const { data: locations, error } = await supabaseAdmin
    .from('warehouse_locations')
    .select('code')
    .or('code.like.WH1%,code.like.WH2%')
    .order('code');
  
  if (error) {
    console.error('❌ Error checking:', error);
  } else {
    console.log('📦 Warehouse locations:');
    locations.forEach(loc => {
      console.log(`   ${loc.code}`);
    });
  }
  
  process.exit(0);
}

applyFix();
