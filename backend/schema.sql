-- Drop existing tables to ensure a clean slate
DROP TABLE IF EXISTS panel_activity CASCADE;
DROP TABLE IF EXISTS panels CASCADE;
DROP TABLE IF EXISTS lots CASCADE;
DROP TABLE IF EXISTS engineers CASCADE;

-- Engineers/Operators list
CREATE TABLE IF NOT EXISTS engineers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    role VARCHAR(50) DEFAULT 'Engineer', -- 'Super Admin', 'Team Lead', 'Engineer'
    attendance_rate DECIMAL DEFAULT 95.0,
    avatar VARCHAR(255)
);

-- Lots imported or received from clients
CREATE TABLE IF NOT EXISTS lots (
    id SERIAL PRIMARY KEY,
    lot_no INTEGER UNIQUE NOT NULL,
    batch_no VARCHAR(50) NOT NULL, -- e.g., 'DX128'
    pixel_pitch VARCHAR(20) NOT NULL, -- e.g., 'P5.9'
    client_name VARCHAR(100) NOT NULL, -- e.g., 'Atomberg', 'Xtreme Media'
    qty_sent INTEGER NOT NULL, -- Expected client count
    received_qty INTEGER NOT NULL, -- Actual inward count
    dispatched_qty INTEGER DEFAULT 0,
    return_qty INTEGER DEFAULT 0,
    redispatch_qty INTEGER DEFAULT 0,
    received_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(50) DEFAULT 'In Process', -- 'In Process', 'Complete'
    remarks TEXT
);

-- Individual PCB Panels undergoing the 14-step refurbishment pipeline
CREATE TABLE IF NOT EXISTS panels (
    id SERIAL PRIMARY KEY,
    lot_id INTEGER REFERENCES lots(id) ON DELETE CASCADE,
    sr_no INTEGER NOT NULL,
    side VARCHAR(10) CHECK (side IN ('Left', 'Right')) NOT NULL,
    barcode VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'Repairable', -- 'Repairable', 'Scrap', 'Dispatched'
    scrap_reason TEXT,
    current_step INTEGER DEFAULT 1, -- Steps 1 to 14
    assigned_engineer_id INTEGER REFERENCES engineers(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Activity logging for audits, analytics, and performance speed calculations
CREATE TABLE IF NOT EXISTS panel_activity (
    id SERIAL PRIMARY KEY,
    panel_id INTEGER REFERENCES panels(id) ON DELETE CASCADE,
    step_no INTEGER NOT NULL,
    step_name VARCHAR(100) NOT NULL,
    engineer_id INTEGER REFERENCES engineers(id),
    status VARCHAR(50) NOT NULL, -- 'OK', 'Faulty', 'Scrap'
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    remark TEXT
);
