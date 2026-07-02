-- Migration: Create lot-level step-wise production logs tables with RLS and index optimizations

CREATE TABLE IF NOT EXISTS production_logs (
    id SERIAL PRIMARY KEY,
    lot_id INTEGER REFERENCES lots(id) ON DELETE CASCADE,
    step_no INTEGER REFERENCES repair_steps(step_no),
    pcb_type VARCHAR(100) NOT NULL,
    operator_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    step_data JSONB NOT NULL, -- Contains all step-specific columns
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pending_production_logs (
    id SERIAL PRIMARY KEY,
    lot_id INTEGER REFERENCES lots(id) ON DELETE CASCADE,
    step_no INTEGER REFERENCES repair_steps(step_no),
    pcb_type VARCHAR(100) NOT NULL,
    operator_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    step_data JSONB NOT NULL,
    approval_status VARCHAR(50) DEFAULT 'Pending Team Lead', -- 'Pending Team Lead', 'Pending Manager', 'Approved', 'Rejected'
    team_lead_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    team_lead_approved_at TIMESTAMP,
    manager_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    manager_approved_at TIMESTAMP,
    rejection_reason TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Optimize queries with indexes
CREATE INDEX IF NOT EXISTS idx_prod_logs_lot ON production_logs(lot_id);
CREATE INDEX IF NOT EXISTS idx_prod_logs_step ON production_logs(step_no);
CREATE INDEX IF NOT EXISTS idx_pending_prod_logs_lot ON pending_production_logs(lot_id);
CREATE INDEX IF NOT EXISTS idx_pending_prod_logs_step ON pending_production_logs(step_no);
CREATE INDEX IF NOT EXISTS idx_pending_prod_logs_status ON pending_production_logs(approval_status);

-- Grant permissions for public access
GRANT ALL PRIVILEGES ON TABLE production_logs TO PUBLIC;
GRANT ALL PRIVILEGES ON TABLE pending_production_logs TO PUBLIC;
