-- Enable Row Level Security (RLS) on panel_logs
ALTER TABLE panel_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE panel_logs FORCE ROW LEVEL SECURITY;

-- Drop policy if exists
DROP POLICY IF EXISTS employee_panel_logs_policy ON panel_logs;

-- Create policy for panel_logs
CREATE POLICY employee_panel_logs_policy ON panel_logs
FOR ALL
USING (
    current_setting('app.current_user_role', true) IN ('Superadmin', 'Manager', 'Team Lead')
    OR engineer_id = NULLIF(current_setting('app.current_user_id', true), '')::integer
);
