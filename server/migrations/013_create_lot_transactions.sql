-- Migration to create the lot_transactions table for tracking all stock actions
CREATE TABLE IF NOT EXISTS lot_transactions (
    id SERIAL PRIMARY KEY,
    lot_id INTEGER REFERENCES lots(id) ON DELETE CASCADE,
    transaction_type VARCHAR(50) NOT NULL, -- 'Inward', 'Outward', 'Return', 'Redispatch', 'Status Toggle', 'Edit'
    qty INTEGER DEFAULT 0,
    actor_id INTEGER REFERENCES users(id) ON DELETE RESTRICT,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Grant permissions to the electrolyte_app role for RLS testing and app operations
GRANT ALL PRIVILEGES ON TABLE lot_transactions TO electrolyte_app;
GRANT ALL PRIVILEGES ON SEQUENCE lot_transactions_id_seq TO electrolyte_app;
