import pg from 'pg';

const superuserString = 'postgresql://localhost:5432/electrolyte_db';
const rlsString = 'postgresql://electrolyte_app:ElectrolyteSecret2026!@localhost:5432/electrolyte_db';

const superuserPool = new pg.Pool({ connectionString: superuserString });
const rlsPool = new pg.Pool({ connectionString: rlsString });

async function verifyRLS() {
  console.log('--- Row-Level Security (RLS) Automated Verification ---');
  
  const superClient = await superuserPool.connect();
  const rlsClient = await rlsPool.connect();
  
  try {
    // =======================================================
    // 1. Audit RLS on Committed panel_logs
    // =======================================================
    console.log('\n[Phase 1] Auditing Committed logs (panel_logs):');
    const allLogsRes = await superClient.query('SELECT COUNT(*) FROM panel_logs');
    const totalLogs = parseInt(allLogsRes.rows[0].count);
    console.log(`Total unscoped rows in panel_logs (Superuser): ${totalLogs}`);
    
    if (totalLogs === 0) {
      console.error('Failure: No panels or logs seeded in the database. Please seed first.');
      process.exit(1);
    }

    const employeeRes = await superClient.query("SELECT id, name, role FROM users WHERE name = 'Mayuri S'");
    const emp = employeeRes.rows[0];
    console.log(`Testing with user context: ${emp.name} (Role: ${emp.role}, ID: ${emp.id})`);

    // Test Employee filters
    await rlsClient.query('BEGIN');
    await rlsClient.query(`SELECT set_config('app.current_user_id', '${emp.id}', true)`);
    await rlsClient.query(`SELECT set_config('app.current_user_role', '${emp.role}', true)`);
    const empLogsRes = await rlsClient.query('SELECT COUNT(*) FROM panel_logs');
    const empLogsCount = parseInt(empLogsRes.rows[0].count);
    await rlsClient.query('COMMIT');
    console.log(`Rows visible in panel_logs to Employee "${emp.name}": ${empLogsCount}`);
    
    const expectedEmpLogsRes = await superClient.query('SELECT COUNT(*) FROM panel_logs WHERE engineer_id = $1', [emp.id]);
    const expectedEmpLogsCount = parseInt(expectedEmpLogsRes.rows[0].count);
    
    if (empLogsCount === expectedEmpLogsCount) {
      console.log('✅ Success: Employee context successfully auto-filters committed logs!');
    } else {
      console.error(`RLS SECURITY AUDIT FAILED! Visible rows did not match expected.`);
      process.exit(1);
    }

    // =======================================================
    // 2. Audit RLS on Temporary pending_logs (Phase 2 Approvals)
    // =======================================================
    console.log('\n[Phase 2] Auditing Temporary Approvals (pending_logs):');
    
    // Seed a mock pending log using superuser
    const mockPanelRes = await superClient.query('SELECT id FROM panels LIMIT 1');
    const panelId = mockPanelRes.rows[0].id;
    
    // Clean existing pending logs to keep test exact
    await superClient.query('DELETE FROM pending_logs');
    
    // Insert pending log for Mayuri S (ID = 3)
    await superClient.query(`
      INSERT INTO pending_logs (panel_id, step_no, engineer_id, status, remark, approval_status)
      VALUES ($1, 2, $2, 'OK', 'Mock pending audit log', 'Pending Team Lead')
    `, [panelId, emp.id]);
    
    // Verify RLS pool filtering as Mayuri S (ID = 3)
    await rlsClient.query('BEGIN');
    await rlsClient.query(`SELECT set_config('app.current_user_id', '${emp.id}', true)`);
    await rlsClient.query(`SELECT set_config('app.current_user_role', '${emp.role}', true)`);
    const empPendingRes = await rlsClient.query('SELECT COUNT(*) FROM pending_logs');
    const empPendingCount = parseInt(empPendingRes.rows[0].count);
    await rlsClient.query('COMMIT');
    console.log(`Pending rows visible to Mayuri S (Owner): ${empPendingCount}`);
    
    // Verify RLS pool filtering as another Employee (Akash P, ID = 4)
    const otherEmpRes = await superClient.query("SELECT id, name, role FROM users WHERE name = 'Akash P'");
    const otherEmp = otherEmpRes.rows[0];
    
    await rlsClient.query('BEGIN');
    await rlsClient.query(`SELECT set_config('app.current_user_id', '${otherEmp.id}', true)`);
    await rlsClient.query(`SELECT set_config('app.current_user_role', '${otherEmp.role}', true)`);
    const otherPendingRes = await rlsClient.query('SELECT COUNT(*) FROM pending_logs');
    const otherPendingCount = parseInt(otherPendingRes.rows[0].count);
    await rlsClient.query('COMMIT');
    console.log(`Pending rows visible to Akash P (Non-Owner Employee): ${otherPendingCount}`);
    
    // Verify RLS pool filtering as Superadmin (Bypasses filtering)
    const adminRes = await superClient.query("SELECT id, name, role FROM users WHERE role = 'Superadmin' LIMIT 1");
    const admin = adminRes.rows[0];
    
    await rlsClient.query('BEGIN');
    await rlsClient.query(`SELECT set_config('app.current_user_id', '${admin.id}', true)`);
    await rlsClient.query(`SELECT set_config('app.current_user_role', '${admin.role}', true)`);
    const adminPendingRes = await rlsClient.query('SELECT COUNT(*) FROM pending_logs');
    const adminPendingCount = parseInt(adminPendingRes.rows[0].count);
    await rlsClient.query('COMMIT');
    console.log(`Pending rows visible to Superadmin: ${adminPendingCount}`);

    // Evaluation
    if (empPendingCount === 1 && otherPendingCount === 0 && adminPendingCount === 1) {
      console.log('✅ Success: Temporary approvals RLS is perfectly secure! Non-owners are fully isolated.');
    } else {
      console.error('RLS SECURITY AUDIT FAILED for pending_logs approvals isolation!');
      process.exit(1);
    }

    console.log('\n-------------------------------------------------------');
    console.log('✅ PostgreSQL Row-Level Security (RLS) is fully verified and secure across all phases!');
    
  } catch (err) {
    console.error('RLS verification crashed:', err);
    process.exit(1);
  } finally {
    superClient.release();
    rlsClient.release();
    await superuserPool.end();
    await rlsPool.end();
  }
}

verifyRLS();
