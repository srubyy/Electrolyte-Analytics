-- Migration: Update to 12-step high-precision refurb pipeline matching the tracking spreadsheet

-- 1. Update any existing panels at steps 13 and 14 to step 12
UPDATE panels SET current_step = 12 WHERE current_step > 12;

-- 2. Update panel_logs references pointing to step_no 13 and 14 to point to step_no 12
UPDATE panel_logs SET step_id = (SELECT id FROM repair_steps WHERE step_no = 12) 
WHERE step_id IN (SELECT id FROM repair_steps WHERE step_no > 12);

-- 3. Delete step_no 13 and 14 from repair_steps
DELETE FROM repair_steps WHERE step_no > 12;

-- 4. Update the names of steps 1 to 12 in sequence to match the Excel sheet
UPDATE repair_steps SET name = 'Inward' WHERE step_no = 1;
UPDATE repair_steps SET name = 'Segregation' WHERE step_no = 2;
UPDATE repair_steps SET name = 'Programming' WHERE step_no = 3;
UPDATE repair_steps SET name = '1st Testing' WHERE step_no = 4;
UPDATE repair_steps SET name = 'Debug' WHERE step_no = 5;
UPDATE repair_steps SET name = 'Entry' WHERE step_no = 6;
UPDATE repair_steps SET name = 'Cleaning' WHERE step_no = 7;
UPDATE repair_steps SET name = 'QC After Cleaning' WHERE step_no = 8;
UPDATE repair_steps SET name = 'Marking & Coating' WHERE step_no = 9;
UPDATE repair_steps SET name = 'Final Testing' WHERE step_no = 10;
UPDATE repair_steps SET name = 'Packing' WHERE step_no = 11;
UPDATE repair_steps SET name = 'Final Entry' WHERE step_no = 12;

-- 5. Delete any extra steps if there are any that got somehow created
DELETE FROM repair_steps WHERE step_no > 12;
