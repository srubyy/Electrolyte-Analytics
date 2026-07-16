-- Migration: Add dummy_sr_no, real_sr_no, mfg_year, and box_no fields to panels, production_logs, and pending_production_logs

-- Add to panels table
ALTER TABLE panels ADD COLUMN IF NOT EXISTS dummy_sr_no VARCHAR(100);
ALTER TABLE panels ADD COLUMN IF NOT EXISTS real_sr_no VARCHAR(100);
ALTER TABLE panels ADD COLUMN IF NOT EXISTS mfg_year INTEGER;
ALTER TABLE panels ADD COLUMN IF NOT EXISTS box_no VARCHAR(50);

-- Add to production_logs table
ALTER TABLE production_logs ADD COLUMN IF NOT EXISTS dummy_sr_no VARCHAR(100);
ALTER TABLE production_logs ADD COLUMN IF NOT EXISTS real_sr_no VARCHAR(100);
ALTER TABLE production_logs ADD COLUMN IF NOT EXISTS mfg_year INTEGER;
ALTER TABLE production_logs ADD COLUMN IF NOT EXISTS box_no VARCHAR(50);

-- Add to pending_production_logs table
ALTER TABLE pending_production_logs ADD COLUMN IF NOT EXISTS dummy_sr_no VARCHAR(100);
ALTER TABLE pending_production_logs ADD COLUMN IF NOT EXISTS real_sr_no VARCHAR(100);
ALTER TABLE pending_production_logs ADD COLUMN IF NOT EXISTS mfg_year INTEGER;
ALTER TABLE pending_production_logs ADD COLUMN IF NOT EXISTS box_no VARCHAR(50);
