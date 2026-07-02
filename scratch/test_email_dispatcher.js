import fs from 'fs';
import path from 'path';

const API_URL = 'http://localhost:3001';

async function testEmailDispatch() {
  console.log("=== Discrepancy Email Dispatcher Integration Test ===");

  // 1. Authenticate as Superadmin
  console.log("Authenticating as Superadmin...");
  const loginRes = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'superadmin@electrolytesoln.com',
      password: 'Electrolyte2026!'
    })
  });

  if (!loginRes.ok) {
    console.error("Login failed:", await loginRes.text());
    process.exit(1);
  }

  const { accessToken } = await loginRes.json();
  console.log("Authentication successful! Token obtained.");

  // 2. Fetch Lots to find one for testing
  console.log("Fetching lots...");
  const lotsRes = await fetch(`${API_URL}/api/stock`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });

  if (!lotsRes.ok) {
    console.error("Failed to fetch lots:", await lotsRes.text());
    process.exit(1);
  }

  const lots = await lotsRes.json();
  console.log(`Fetched ${lots.length} lots successfully.`);

  // Let's find a lot with a discrepancy, or create one for testing
  let testLot = lots.find(l => l.qty_sent !== l.received_qty);
  if (!testLot) {
    console.log("No lot with discrepancy found in database. Using first lot as fallback.");
    testLot = lots[0];
  }

  if (!testLot) {
    console.error("No lots available to test email dispatch.");
    process.exit(1);
  }

  console.log(`Testing with Lot ${testLot.lot_no} (${testLot.client_name}), Sent: ${testLot.qty_sent}, Received: ${testLot.received_qty}`);

  // 3. Trigger Email Dispatch API to YOUR OWN EMAIL ADDRESS!
  console.log("Triggering discrepancy email dispatch to srutibaliga@gmail.com...");
  const dispatchPayload = {
    lot_id: testLot.id,
    recipient_email: 'srutibaliga@gmail.com', // Sending to yourself!
    recipient_name: 'Sruti Baliga',
    challan_no: testLot.batch_no || 'CH-TEST-99',
    qty_sent: testLot.qty_sent,
    received_qty: testLot.received_qty,
    cc_emails: '',
    subject: `[Live SMTP Test] Discrepancy Lot ${testLot.lot_no} (${testLot.client_name}) - PCB Difference Alert`,
    custom_remarks: 'This is a live SMTP email verification sent via Node.js transporter from your Gmail account.'
  };

  const dispatchRes = await fetch(`${API_URL}/api/admin/email/dispatch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify(dispatchPayload)
  });

  if (!dispatchRes.ok) {
    console.error("Email dispatch failed:", await dispatchRes.text());
    process.exit(1);
  }

  const result = await dispatchRes.json();
  console.log("API Response:", result);

  if (result.success && result.file_path) {
    console.log(`\n[SUCCESS] Simulated email successfully generated!`);
    console.log(`File saved at: ${result.file_path}`);
    
    // Check if the generated HTML file exists
    if (fs.existsSync(result.file_path)) {
      console.log(`File verification: Verified HTML output exists at target path.`);
      const content = fs.readFileSync(result.file_path, 'utf8');
      console.log(`HTML size: ${content.length} characters.`);
    } else {
      console.error(`File verification failed! Output file does not exist.`);
    }

    // Verify transaction logs
    console.log("\nFetching stock audit log trail to verify insertion of transaction log...");
    const auditRes = await fetch(`${API_URL}/api/stock/transactions/${testLot.id}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (auditRes.ok) {
      const audits = await auditRes.json();
      const emailAudit = audits.find(a => a.transaction_type === 'Email Dispatch');
      if (emailAudit) {
        console.log(`[SUCCESS] Verified that 'Email Dispatch' transaction is logged in audit trail:`);
        console.log(`- Remarks: ${emailAudit.remarks}`);
        console.log(`- Actor: ${emailAudit.actor_name}`);
      } else {
        console.warn(`[WARNING] 'Email Dispatch' transaction was not found in audit logs. Audits found:`, audits);
      }
    } else {
      console.error("Failed to fetch audit log trail:", await auditRes.text());
    }

  } else {
    console.error("API response indicated failure:", result);
  }
}

testEmailDispatch().catch(err => console.error("Unhandled test error:", err));
