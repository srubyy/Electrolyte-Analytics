CREATE TABLE IF NOT EXISTS repair_steps (
    id SERIAL PRIMARY KEY,
    step_no INTEGER UNIQUE NOT NULL,
    name VARCHAR(100) UNIQUE NOT NULL
);

-- Seed static 14 steps
INSERT INTO repair_steps (step_no, name) VALUES
(1, 'Panel Assign'),
(2, 'Repair Aging'),
(3, 'Panel Opening'),
(4, 'Silicon Removing'),
(5, 'IC Removing'),
(6, 'IC Cleaning'),
(7, 'IC Replacing'),
(8, 'Debugging'),
(9, '1st Aging'),
(10, 'Applying Silicon'),
(11, 'Half Fitting'),
(12, 'Mesh Fitting'),
(13, 'QC'),
(14, 'Dispatch')
ON CONFLICT (step_no) DO UPDATE SET name = EXCLUDED.name;
