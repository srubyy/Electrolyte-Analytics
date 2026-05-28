CREATE TABLE IF NOT EXISTS defect_codes (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100) NOT NULL, -- e.g. 'IC Defect', 'Solder Bridge', 'Silicon Damage'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
