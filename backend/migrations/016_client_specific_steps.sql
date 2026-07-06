-- Migration: Support client-specific workflow steps in repair_steps
-- Drop constraints referencing step_no that will not be globally unique anymore
ALTER TABLE panels DROP CONSTRAINT IF EXISTS panels_current_step_fkey;
ALTER TABLE production_logs DROP CONSTRAINT IF EXISTS production_logs_step_no_fkey;
ALTER TABLE pending_production_logs DROP CONSTRAINT IF EXISTS pending_production_logs_step_no_fkey;

-- Drop uniqueness constraints on step_no and name in repair_steps
ALTER TABLE repair_steps DROP CONSTRAINT IF EXISTS repair_steps_step_no_key;
ALTER TABLE repair_steps DROP CONSTRAINT IF EXISTS repair_steps_name_key;

-- Add client_id column to repair_steps referencing clients table
ALTER TABLE repair_steps ADD COLUMN IF NOT EXISTS client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE;

-- Create unique indexes to enforce uniqueness of step_no and name per client
CREATE UNIQUE INDEX IF NOT EXISTS repair_steps_client_id_step_no_idx ON repair_steps (client_id, step_no) WHERE client_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS repair_steps_global_step_no_idx ON repair_steps (step_no) WHERE client_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS repair_steps_client_id_name_idx ON repair_steps (client_id, name) WHERE client_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS repair_steps_global_name_idx ON repair_steps (name) WHERE client_id IS NULL;
