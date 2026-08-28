import dotenv from 'dotenv';
dotenv.config();

const BACKEND_URL = 'http://localhost:4000';

async function testBatchesAPI() {
  try {
    console.log('🧪 Testing Batches API...\n');
    
    // Test 1: Get all batches
    console.log('1️⃣ Fetching all batches...');
    const response = await fetch(`${BACKEND_URL}/api/batches`, {
      headers: {
        'Authorization': `Bearer ${process.env.JWT_SECRET}` // This won't work without proper auth
      }
    });
    
    console.log('Status:', response.status);
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (data.batches && data.batches.length > 0) {
      console.log(`\n✅ Found ${data.batches.length} batches:`);
      data.batches.forEach((batch, index) => {
        console.log(`   ${index + 1}. ${batch.batch_number} - ${batch.products?.brand} ${batch.products?.model}`);
      });
    } else {
      console.log('\n⚠️ No batches found in database');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testBatchesAPI();
