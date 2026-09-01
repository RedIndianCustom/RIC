/**
 * Test script to verify /api/receiving/pending-approvals endpoint
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const API_URL = 'http://localhost:4000/api';

async function testPendingApprovals() {
  console.log('🧪 Testing /api/receiving/pending-approvals endpoint...\n');

  try {
    // First, we need to authenticate as a manager
    // Using a test manager account (you'll need to replace with actual credentials)
    console.log('1️⃣ Authenticating as manager...');
    
    const loginResponse = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'manager@redindian.com', // Replace with actual manager email
        password: 'password123' // Replace with actual password
      })
    });

    if (!loginResponse.ok) {
      console.error('❌ Login failed:', loginResponse.status);
      const errorText = await loginResponse.text();
      console.error('Error:', errorText);
      return;
    }

    const loginData = await loginResponse.json();
    console.log('✅ Logged in as:', loginData.user?.email);
    
    const token = loginData.token;
    if (!token) {
      console.error('❌ No token received');
      return;
    }

    console.log('\n2️⃣ Fetching pending approvals...');

    // Now test the pending approvals endpoint
    const response = await fetch(`${API_URL}/receiving/pending-approvals`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error('❌ Request failed:', response.status);
      const errorText = await loginResponse.text();
      console.error('Error:', errorText);
      return;
    }

    const data = await response.json();
    
    console.log('\n✅ Response received:');
    console.log('─────────────────────────────────────────────');
    console.log('Success:', data.success);
    console.log('Count:', data.count);
    console.log('Records:', data.data?.length || 0);
    
    if (data.data && data.data.length > 0) {
      console.log('\n📋 Pending Reports:');
      data.data.forEach((report, idx) => {
        console.log(`\n  ${idx + 1}. Report #${report.report_number}`);
        console.log(`     Shipment: ${report.shipment_number}`);
        console.log(`     Submitted: ${report.submitted_at}`);
        console.log(`     By: ${report.submitted_by_name}`);
        console.log(`     Discrepancy: ${report.total_discrepancy}`);
        console.log(`     Status: ${report.status}`);
      });
    } else {
      console.log('\n📭 No pending approvals found');
    }

    console.log('\n─────────────────────────────────────────────');
    console.log('✅ Test completed successfully!');

  } catch (error) {
    console.error('\n❌ Test failed with exception:', error.message);
    console.error(error);
  }
}

// Run the test
testPendingApprovals();
