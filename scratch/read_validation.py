import openpyxl

wb = openpyxl.load_workbook('Info/PCB_Production_Tracking (1).xlsx', data_only=True)
ws = wb['Data Validation']

print("Data Validation Rows:")
for r in range(1, 100):
    row_vals = [ws.cell(r, c).value for c in range(1, 15)]
    non_null = [val for val in row_vals if val is not None]
    if non_null:
        print(f"Row {r}:", non_null)
