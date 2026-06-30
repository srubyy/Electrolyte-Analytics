CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) CHECK (role IN ('Superadmin', 'Manager', 'Team Lead', 'Employee')) NOT NULL DEFAULT 'Employee',
    attendance_rate DECIMAL DEFAULT 95.0,
    avatar VARCHAR(255),
    refresh_token VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
