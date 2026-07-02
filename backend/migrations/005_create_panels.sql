CREATE TABLE IF NOT EXISTS panels (
    id SERIAL PRIMARY KEY,
    lot_id INTEGER REFERENCES lots(id) ON DELETE CASCADE,
    sr_no INTEGER NOT NULL,
    side VARCHAR(10) CHECK (side IN ('Left', 'Right')) NOT NULL,
    barcode VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'Repairable', -- 'Repairable', 'Scrap', 'Dispatched'
    scrap_reason TEXT,
    current_step INTEGER DEFAULT 1 REFERENCES repair_steps(step_no),
    assigned_engineer_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
