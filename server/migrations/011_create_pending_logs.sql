CREATE TABLE IF NOT EXISTS pending_logs (
    id SERIAL PRIMARY KEY,
    panel_id INTEGER REFERENCES panels(id) ON DELETE CASCADE,
    step_no INTEGER NOT NULL,
    engineer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL, -- 'OK', 'Faulty', 'Scrap'
    remark TEXT,
    approval_status VARCHAR(50) CHECK (approval_status IN ('Pending Team Lead', 'Pending Manager', 'Approved', 'Rejected')) DEFAULT 'Pending Team Lead',
    team_lead_id INTEGER REFERENCES users(id),
    team_lead_approved_at TIMESTAMP,
    manager_id INTEGER REFERENCES users(id),
    manager_approved_at TIMESTAMP,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for approvals and panel search optimization
CREATE INDEX IF NOT EXISTS idx_pending_logs_panel ON pending_logs(panel_id);
CREATE INDEX IF NOT EXISTS idx_pending_logs_status ON pending_logs(approval_status);

-- Enable RLS on pending_logs
ALTER TABLE pending_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_logs FORCE ROW LEVEL SECURITY;

-- RLS Policy: Employees can view their own pending approvals. Managers and leads can view all.
DROP POLICY IF EXISTS employee_pending_logs_policy ON pending_logs;
CREATE POLICY employee_pending_logs_policy ON pending_logs
FOR ALL
USING (
    current_setting('app.current_user_role', true) IN ('Superadmin', 'Manager', 'Team Lead')
    OR engineer_id = NULLIF(current_setting('app.current_user_id', true), '')::integer
);
