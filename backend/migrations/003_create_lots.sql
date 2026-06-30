CREATE TABLE IF NOT EXISTS lots (
    id SERIAL PRIMARY KEY,
    lot_no INTEGER UNIQUE NOT NULL,
    batch_no VARCHAR(50) NOT NULL,
    pixel_pitch VARCHAR(20) NOT NULL,
    client_id INTEGER REFERENCES clients(id) ON DELETE RESTRICT,
    qty_sent INTEGER NOT NULL,
    received_qty INTEGER NOT NULL,
    dispatched_qty INTEGER DEFAULT 0,
    return_qty INTEGER DEFAULT 0,
    redispatch_qty INTEGER DEFAULT 0,
    received_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(50) DEFAULT 'In Process',
    remarks TEXT
);
