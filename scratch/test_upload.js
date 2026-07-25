import fs from 'fs';
import path from 'path';

const run = async () => {
  try {
    console.log("Logging in to get JWT token...");
    const loginRes = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'superadmin@electrolytesoln.com',
        password: 'Electrolyte2026!'
      })
    });
    
    if (!loginRes.ok) {
      console.error("Login failed:", await loginRes.text());
      return;
    }
    
    const loginData = await loginRes.json();
    const token = loginData.accessToken;
    console.log("Logged in! Token acquired.");

    const filePath = path.join(process.cwd(), '../Info/PCB_Production_Tracking (1).xlsx');
    console.log("Reading test file:", filePath);
    const fileBuffer = fs.readFileSync(filePath);

    console.log("Uploading file to /api/lots/6/upload-excel...");
    const uploadRes = await fetch('http://localhost:3001/api/lots/6/upload-excel', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/octet-stream'
      },
      body: fileBuffer
    });

    console.log("Upload status:", uploadRes.status);
    console.log("Upload response:", await uploadRes.json());
  } catch (err) {
    console.error("Error during test upload:", err);
  }
};

run();
