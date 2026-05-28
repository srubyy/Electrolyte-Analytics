import os

# Paths
info_dir = "/Users/srutibaliga/Documents/Projects/Electrolyte/Info"
server_dir = "/Users/srutibaliga/Documents/Projects/Electrolyte/server"
seed_sql_path = os.path.join(server_dir, "seed.sql")

print("Generating seed.sql dynamically with high-fidelity representation of Electrolyte Solutions data...")

# Define standard seed data based on the extracted Excel and OCR contents
engineers = [
    {"name": "Super Admin", "role": "Super Admin", "attendance": 100.0},
    {"name": "Rahul Gupta", "role": "Team Lead", "attendance": 98.2},
    {"name": "Mayuri S", "role": "Engineer", "attendance": 96.5},
    {"name": "Akash P", "role": "Engineer", "attendance": 94.0},
    {"name": "Nilam Dhanavde", "role": "Engineer", "attendance": 97.1},
    {"name": "Usha M", "role": "Engineer", "attendance": 95.8},
    {"name": "Swarupa Vishwakarma", "role": "Engineer", "attendance": 93.4},
    {"name": "Poonam Lokhande", "role": "Engineer", "attendance": 96.0},
    {"name": "Sukhdev S", "role": "Engineer", "attendance": 92.5},
    {"name": "Mannsi S", "role": "Engineer", "attendance": 95.0},
    {"name": "Amit Ghabale", "role": "Engineer", "attendance": 96.2},
    {"name": "Sharmila N", "role": "Engineer", "attendance": 97.5},
    {"name": "Vijay Kumar", "role": "Engineer", "attendance": 94.8},
]

lots = [
    {"lot_no": 17, "batch_no": "DX128", "pixel_pitch": "P5.9", "client_name": "Xtreme Media Pvt. Ltd.", "qty_sent": 260, "received_qty": 260, "status": "Complete", "remarks": "Successfully completed all refurbishment steps and dispatched."},
    {"lot_no": 18, "batch_no": "DX128", "pixel_pitch": "P5.9", "client_name": "Xtreme Media Pvt. Ltd.", "qty_sent": 200, "received_qty": 200, "status": "In Process", "remarks": "139 dispatched. 61 pending in various steps. 48 panels pending dispatch."},
    {"lot_no": 19, "batch_no": "DX128", "pixel_pitch": "P5.9", "client_name": "Xtreme Media Pvt. Ltd.", "qty_sent": 500, "received_qty": 500, "status": "In Process", "remarks": "Large batch, currently in early triage and panel assignment stages."},
    {"lot_no": 20, "batch_no": "DX109", "pixel_pitch": "P5.9", "client_name": "Xtreme Media Pvt. Ltd.", "qty_sent": 50, "received_qty": 50, "status": "In Process", "remarks": "Received recently, initial panel assign in progress."}
]

# Generate high-fidelity panels for Lot 18 (DX128, P5.9)
# Lot 18: 200 received. 139 dispatched. 61 available/pending.
# Out of 61 pending: 48 are in Step 14 (Dispatch) - 21 Left, 27 Right.
# 13 are in earlier steps.
lot_18_panels = []
# 48 dispatch pending panels
for sr in [100, 102, 103, 106, 109, 110, 116, 121, 124, 126, 130, 131, 132, 133, 138, 141, 142]:
    side = "Left" if sr % 2 == 0 else "Right"
    lot_18_panels.append({"sr_no": sr, "side": side, "step": 14, "status": "Repairable"})
# Add more to fill up to 48 dispatch-pending panels
for i in range(150, 181):
    side = "Left" if i % 3 == 0 else "Right"
    lot_18_panels.append({"sr_no": i, "side": side, "step": 14, "status": "Repairable"})
# 13 panels in earlier steps of Lot 18
for i in range(1, 14):
    side = "Left" if i % 2 == 0 else "Right"
    lot_18_panels.append({"sr_no": i + 20, "side": side, "step": i, "status": "Repairable"})

# Generate panels for Lot 19 (DX128, P5.9)
# Lot 19 has 50 panels in panel assign (Step 1) and Silicon Removing (Step 3) etc.
lot_19_panels = [
    {"sr_no": 382, "side": "Right", "step": 3, "status": "Repairable", "engineer": "Sharmila N"},
    {"sr_no": 384, "side": "Right", "step": 3, "status": "Repairable", "engineer": "OJT Batch_2"},
    {"sr_no": 386, "side": "Right", "step": 3, "status": "Repairable", "engineer": "OJT Batch_2"},
    {"sr_no": 388, "side": "Right", "step": 3, "status": "Repairable", "engineer": "OJT Batch_2"},
    {"sr_no": 393, "side": "Left", "step": 3, "status": "Repairable", "engineer": "OJT Batch_2"},
    {"sr_no": 394, "side": "Left", "step": 3, "status": "Repairable", "engineer": "OJT Batch_2"},
    {"sr_no": 396, "side": "Left", "step": 3, "status": "Repairable", "engineer": "OJT Batch_2"},
    {"sr_no": 398, "side": "Left", "step": 3, "status": "Repairable", "engineer": "OJT Batch_2"},
    {"sr_no": 400, "side": "Left", "step": 3, "status": "Repairable", "engineer": "Sharmila N"},
]
for i in range(1, 41):
    side = "Left" if i % 2 == 0 else "Right"
    lot_19_panels.append({"sr_no": i, "side": side, "step": 1, "status": "Repairable"})

# Auto-generate barcodes function matching real pattern
def make_barcode(lot_no, pitch, batch, side, sr):
    pitch_str = pitch.replace(".", "") # P5.9 -> P59
    side_char = side[0] # Left -> L, Right -> R
    sr_str = f"{sr:04d}"
    return f"ESRP2{pitch_str}{lot_no}E26{batch}{side_char}{sr_str}"

# 14 Fixed Steps from Build Tracker PDF
step_names = [
    "Panel Assign", "Repair Aging", "Panel Opening", "Silicon Removing", "IC Removing", 
    "IC Cleaning", "IC Replacing", "Debugging", "1st Aging", "Applying Silicon", 
    "Half Fitting", "Mesh Fitting", "QC", "Dispatch"
]

with open(seed_sql_path, "w", encoding="utf-8") as f:
    f.write("-- Seed file for Electrolyte Solutions PCB Refurbishment\n\n")
    
    # 1. Seed Engineers
    f.write("-- Seed Engineers\n")
    for eng in engineers:
        avatar = f"https://api.dicebear.com/7.x/adventurer/svg?seed={eng['name'].replace(' ', '')}"
        f.write(f"INSERT INTO engineers (name, role, attendance_rate, avatar) VALUES ('{eng['name']}', '{eng['role']}', {eng['attendance']}, '{avatar}') ON CONFLICT (name) DO NOTHING;\n")
    f.write("\n")
    
    # 2. Seed Lots
    f.write("-- Seed Lots\n")
    for lot in lots:
        f.write(f"INSERT INTO lots (lot_no, batch_no, pixel_pitch, client_name, qty_sent, received_qty, status, remarks) VALUES ({lot['lot_no']}, '{lot['batch_no']}', '{lot['pixel_pitch']}', '{lot['client_name']}', {lot['qty_sent']}, {lot['received_qty']}, '{lot['status']}', '{lot['remarks']}') ON CONFLICT (lot_no) DO NOTHING;\n")
    f.write("\n")
    
    # Helper to get lot subquery
    def lot_sub(lot_no):
        return f"(SELECT id FROM lots WHERE lot_no = {lot_no})"
        
    # Helper to get engineer subquery
    def eng_sub(name):
        return f"(SELECT id FROM engineers WHERE name = '{name}')"

    # 3. Seed Panels & Activity logs for Lot 18
    f.write("-- Seed Panels and Activities for Lot 18\n")
    for panel in lot_18_panels:
        barcode = make_barcode(18, "P5.9", "128", panel["side"], panel["sr_no"])
        eng_name = "Mayuri S" if panel["sr_no"] % 2 == 0 else "Akash P"
        f.write(f"INSERT INTO panels (lot_id, sr_no, side, barcode, status, current_step, assigned_engineer_id) VALUES ({lot_sub(18)}, {panel['sr_no']}, '{panel['side']}', '{barcode}', '{panel['status']}', {panel['step']}, {eng_sub(eng_name)}) ON CONFLICT (barcode) DO NOTHING;\n")
        
        # Log active history for these steps
        for step in range(1, panel["step"] + 1):
            s_name = step_names[step-1]
            status = "OK"
            f.write(f"INSERT INTO panel_activity (panel_id, step_no, step_name, engineer_id, status, remark) VALUES ((SELECT id FROM panels WHERE barcode = '{barcode}'), {step}, '{s_name}', {eng_sub(eng_name)}, '{status}', 'Completed step {s_name} successfully') ON CONFLICT DO NOTHING;\n")

    # 4. Seed Panels & Activity logs for Lot 19
    f.write("\n-- Seed Panels and Activities for Lot 19\n")
    for panel in lot_19_panels:
        barcode = make_barcode(19, "P5.9", "128", panel["side"], panel["sr_no"])
        eng_name = panel.get("engineer", "Sharmila N")
        if eng_name == "OJT Batch_2":
            # Map OJT Batch_2 to Rahul Gupta as supervisor/lead
            eng_name = "Rahul Gupta"
            
        f.write(f"INSERT INTO panels (lot_id, sr_no, side, barcode, status, current_step, assigned_engineer_id) VALUES ({lot_sub(19)}, {panel['sr_no']}, '{panel['side']}', '{barcode}', '{panel['status']}', {panel['step']}, {eng_sub(eng_name)}) ON CONFLICT (barcode) DO NOTHING;\n")
        
        for step in range(1, panel["step"] + 1):
            s_name = step_names[step-1]
            status = "OK"
            f.write(f"INSERT INTO panel_activity (panel_id, step_no, step_name, engineer_id, status, remark) VALUES ((SELECT id FROM panels WHERE barcode = '{barcode}'), {step}, '{s_name}', {eng_sub(eng_name)}, '{status}', 'Completed step {s_name} successfully') ON CONFLICT DO NOTHING;\n")

print(f"seed.sql has been generated successfully at {seed_sql_path}!")
