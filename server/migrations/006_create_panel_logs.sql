CREATE TABLE IF NOT EXISTS panel_logs (
    id SERIAL PRIMARY KEY,
    panel_id INTEGER REFERENCES panels(id) ON DELETE CASCADE,
    step_id INTEGER REFERENCES repair_steps(id) ON DELETE RESTRICT,
    engineer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL, -- 'OK', 'Faulty', 'Scrap'
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    remark TEXT
);
