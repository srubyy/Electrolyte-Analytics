CREATE TABLE IF NOT EXISTS performance_scores (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    pcbs_repaired INTEGER DEFAULT 0,
    first_pass_yield DECIMAL DEFAULT 100.0,
    avg_time_per_pcb DECIMAL DEFAULT 0.0,
    attendance_pct DECIMAL DEFAULT 100.0,
    total_score DECIMAL DEFAULT 0.0,
    UNIQUE(user_id, month, year)
);
