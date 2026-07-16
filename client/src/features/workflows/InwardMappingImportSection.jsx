import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Cpu, FileSpreadsheet, Trash2, CheckCircle, AlertTriangle, Plus, X } from 'lucide-react';

const InwardMappingImportSection = ({ lotId, apiFetch, showToast, onSuccess }) => {
  // Manual Input States
  const [manualDummy, setManualDummy] = useState('');
  const [manualReal, setManualReal] = useState('');
  const [manualBox, setManualBox] = useState('Box 1');
  const [manualList, setManualList] = useState([]);

  // Excel Upload Raw States
  const [excelHeaders, setExcelHeaders] = useState([]);
  const [excelRows, setExcelRows] = useState([]); // Array of arrays containing raw cell values
  const [serialColIdx, setSerialColIdx] = useState(0);
  const [boxColIdx, setBoxColIdx] = useState(0);

  // UI Drag-and-drop state
  const [isDragging, setIsDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Helper function to extract manufacturing year
  const getMfgYear = (serial) => {
    if (!serial) return null;
    const s = String(serial).trim();
    const len = s.length;
    
    if (len === 16 || len === 17) {
      const yr = parseInt(s.substring(3, 5));
      return isNaN(yr) ? null : yr + 2000;
    }
    if (s.startsWith('AGV')) {
      const cIndex = s.indexOf('C');
      if (cIndex !== -1 && cIndex + 2 < len) {
        const yr = parseInt(s.substring(cIndex + 1, cIndex + 3));
        return isNaN(yr) ? null : yr + 2000;
      }
    }
    if (s.startsWith('EA') && len === 22) {
      const yr = parseInt(s.substring(15, 17));
      return isNaN(yr) ? null : yr + 2000;
    }
    return null;
  };

  // Helper to determine status and message based on real serial number
  const getValidationInfo = (realSerial) => {
    if (!realSerial) {
      return {
        status: 'pending',
        color: '#ffc107',
        bg: 'rgba(255, 193, 7, 0.1)',
        border: 'rgba(255, 193, 7, 0.25)',
        text: '⚠️ Pending'
      };
    }
    const year = getMfgYear(realSerial);
    if (!year) {
      return {
        status: 'valid',
        color: '#28a745',
        bg: 'rgba(40, 167, 69, 0.1)',
        border: 'rgba(40, 167, 69, 0.25)',
        text: '✅ Valid (Format Unknown)'
      };
    }
    if (year <= 2022) {
      return {
        status: 'scrap',
        color: '#dc3545',
        bg: 'rgba(220, 53, 69, 0.1)',
        border: 'rgba(220, 53, 69, 0.3)',
        text: `🔴 Scrap (Mfg ${year})`
      };
    }
    return {
      status: 'valid',
      color: '#28a745',
      bg: 'rgba(40, 167, 69, 0.1)',
      border: 'rgba(40, 167, 69, 0.25)',
      text: `✅ Valid (Mfg ${year})`
    };
  };

  const validation = getValidationInfo(manualReal);

  const addManualPanel = () => {
    if (!manualDummy && !manualReal) {
      showToast('Please enter either a dummy serial or an actual PCB serial.', 'warning');
      return;
    }

    const newPanel = {
      dummy_sr_no: manualDummy.trim(),
      real_sr_no: manualReal.trim(),
      box_no: manualBox,
      id: Date.now() + Math.random(),
      excel_data: {
        "Source": "Manual Entry",
        "Dummy Serial": manualDummy.trim(),
        "Actual Serial": manualReal.trim(),
        "Box": manualBox
      }
    };

    setManualList([...manualList, newPanel]);
    setManualDummy('');
    setManualReal('');
    showToast('Panel added to list!', 'success');
  };

  const removeManualPanel = (id) => {
    setManualList(manualList.filter(p => p.id !== id));
  };

  // Excel handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleExcelFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleExcelFile(e.target.files[0]);
    }
  };

  const handleExcelFile = (file) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (json.length < 2) {
          showToast('Excel sheet has no data rows.', 'warning');
          return;
        }

        // Detect header row containing serial number indicators
        let headerRowIdx = -1;
        let headers = [];
        for (let r = 0; r < Math.min(json.length, 20); r++) {
          const row = json[r];
          if (!row) continue;
          const mappedRow = Array.from(row).map(h => String(h || '').trim());
          const hasSerial = mappedRow.some(h => {
            const low = h.toLowerCase();
            return low.includes('sr no') || low.includes('serial') || low.includes('barcode') || low.includes('pcb sr');
          });
          if (hasSerial) {
            headerRowIdx = r;
            headers = mappedRow;
            break;
          }
        }

        if (headerRowIdx === -1) {
          headerRowIdx = 0;
          headers = Array.from(json[0] || []).map((h, i) => String(h || `Column ${i + 1}`).trim());
        }

        const lowerHeaders = headers.map(h => h.toLowerCase());
        let serialIdx = lowerHeaders.findIndex(h => h.includes('sr no') || h.includes('serial') || h.includes('pcb sr'));
        let boxIdx = lowerHeaders.findIndex(h => h.includes('box'));
        let barcodeIdx = lowerHeaders.findIndex(h => h.includes('barcode'));

        // Column fallback scan
        if (serialIdx === -1 && barcodeIdx === -1) {
          for (let r = headerRowIdx + 1; r < Math.min(json.length, headerRowIdx + 10); r++) {
            const row = json[r];
            if (!row) continue;
            const cleanRow = Array.from(row);
            for (let c = 0; c < cleanRow.length; c++) {
              const val = String(cleanRow[c] || '').trim();
              if (val.startsWith('AT') || val.length === 16 || val.length === 21 || val.length === 22) {
                serialIdx = c;
                break;
              }
            }
            if (serialIdx !== -1) break;
          }
        }

        const dataRows = json.slice(headerRowIdx + 1).filter(r => r && r.length > 0);

        // Standardize rows array length to match headers count
        const standardizedRows = dataRows.map(row => {
          const arr = Array.from(row);
          while (arr.length < headers.length) {
            arr.push('');
          }
          return arr.map(c => String(c || '').trim());
        });

        setExcelHeaders(headers);
        setExcelRows(standardizedRows);
        setSerialColIdx(serialIdx !== -1 ? serialIdx : 0);
        setBoxColIdx(boxIdx !== -1 ? boxIdx : 0);

        showToast(`Parsed ${standardizedRows.length} rows successfully!`, 'success');
      } catch (err) {
        console.error(err);
        showToast(`Error reading Excel: ${err.message || err}`, 'danger');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Cell modification handler
  const handleCellChange = (rowIdx, colIdx, val) => {
    const updated = [...excelRows];
    updated[rowIdx][colIdx] = val;
    setExcelRows(updated);
  };

  const handleAddRow = () => {
    const empty = Array(excelHeaders.length).fill('');
    setExcelRows([...excelRows, empty]);
  };

  const handleDeleteRow = (rowIdx) => {
    setExcelRows(excelRows.filter((_, idx) => idx !== rowIdx));
  };

  // API submit handler
  const handleBulkSubmit = async (panels) => {
    if (!lotId) {
      showToast('Please select a lot first.', 'warning');
      return;
    }
    if (panels.length === 0) {
      showToast('No panels to submit.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch('/api/panels/import', {
        method: 'POST',
        body: JSON.stringify({
          lot_id: parseInt(lotId),
          panels
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Successfully imported panels!');
        setManualList([]);
        setExcelHeaders([]);
        setExcelRows([]);
        if (onSuccess) onSuccess();
      } else {
        showToast(data.error || 'Failed to import panels.', 'danger');
      }
    } catch (err) {
      console.error(err);
      showToast('Error connecting to import API.', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  // Package spreadsheet rows into panel objects
  const handleSpreadsheetSubmit = () => {
    const panelsToSubmit = excelRows.map((row, idx) => {
      const rawSerial = String(row[serialColIdx] || '').trim();
      const boxNo = String(row[boxColIdx] || '').trim() || 'Box 1';

      if (!rawSerial) return null;

      const isDummy = rawSerial.startsWith('AT') || rawSerial.length <= 8;

      const rowData = {};
      excelHeaders.forEach((header, cIdx) => {
        rowData[header || `Column ${cIdx + 1}`] = row[cIdx] || '';
      });

      return {
        dummy_sr_no: isDummy ? rawSerial : '',
        real_sr_no: isDummy ? '' : rawSerial,
        box_no: boxNo,
        excel_data: rowData
      };
    }).filter(Boolean);

    if (panelsToSubmit.length === 0) {
      showToast('Please ensure you have entered a serial number in the designated column.', 'warning');
      return;
    }

    handleBulkSubmit(panelsToSubmit);
  };

  // If Excel spreadsheet is loaded, show the Full spreadsheet review editor!
  if (excelRows.length > 0) {
    return (
      <div className="glass-panel" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16, marginTop: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--color-primary)' }}>Spreadsheet Review Editor</h3>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>You can edit any cell directly by typing. Add/delete rows as needed.</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleAddRow}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', fontSize: '0.72rem' }}
            >
              <Plus size={14} /> Add Row
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => { setExcelHeaders([]); setExcelRows([]); }}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', fontSize: '0.72rem', background: '#dc3545', color: '#fff', border: 'none' }}
            >
              <X size={14} /> Cancel Import
            </button>
          </div>
        </div>

        {/* Configuration selectors */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, padding: 12, background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid var(--card-border)' }}>
          <div className="form-group">
            <label style={{ fontSize: '0.72rem', fontWeight: 700 }}>Identify Serial Number Column</label>
            <select value={serialColIdx} onChange={e => setSerialColIdx(parseInt(e.target.value))}>
              {excelHeaders.map((header, idx) => (
                <option key={idx} value={idx}>{header || `Column ${idx + 1}`}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label style={{ fontSize: '0.72rem', fontWeight: 700 }}>Identify Box Number Column</label>
            <select value={boxColIdx} onChange={e => setBoxColIdx(parseInt(e.target.value))}>
              {excelHeaders.map((header, idx) => (
                <option key={idx} value={idx}>{header || `Column ${idx + 1}`}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Scrollable table grid */}
        <div style={{ overflowX: 'auto', border: '1px solid var(--card-border)', borderRadius: 8, maxHeight: 350, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--card-border)' }}>
                <th style={{ padding: '8px 12px', width: 40 }}>#</th>
                {excelHeaders.map((header, idx) => (
                  <th key={idx} style={{ padding: '8px 12px', minWidth: 120 }}>
                    {header}
                    {idx === serialColIdx && <span style={{ color: 'var(--color-primary)', display: 'block', fontSize: '0.6rem' }}>[Serial No]</span>}
                    {idx === boxColIdx && <span style={{ color: '#28a745', display: 'block', fontSize: '0.6rem' }}>[Box No]</span>}
                  </th>
                ))}
                <th style={{ padding: '8px 12px', minWidth: 100 }}>Validation</th>
                <th style={{ padding: '8px 12px', width: 50 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {excelRows.map((row, rowIdx) => {
                const serialVal = row[serialColIdx] || '';
                const val = getValidationInfo(serialVal.startsWith('AT') || serialVal.length <= 8 ? '' : serialVal);
                return (
                  <tr key={rowIdx} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', background: val.status === 'scrap' ? 'rgba(220, 53, 69, 0.02)' : 'transparent' }}>
                    <td style={{ padding: '6px 12px', color: 'var(--text-muted)', fontWeight: 700 }}>{rowIdx + 1}</td>
                    {row.map((cell, colIdx) => (
                      <td key={colIdx} style={{ padding: '4px 6px' }}>
                        <input
                          type="text"
                          value={cell || ''}
                          onChange={e => handleCellChange(rowIdx, colIdx, e.target.value)}
                          style={{
                            padding: '4px 8px',
                            background: 'var(--input-bg)',
                            border: '1px solid var(--card-border)',
                            color: 'var(--text-main)',
                            borderRadius: 4,
                            width: '100%',
                            fontSize: '0.72rem'
                          }}
                        />
                      </td>
                    ))}
                    {/* Status Badge */}
                    <td style={{ padding: '6px 12px' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: 6,
                        background: val.bg,
                        color: val.color,
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        border: `1px solid ${val.border}`
                      }}>
                        {val.text}
                      </span>
                    </td>
                    <td style={{ padding: '6px 12px', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => handleDeleteRow(rowIdx)}
                        style={{ background: 'transparent', border: 'none', color: '#dc3545', cursor: 'pointer' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Submit */}
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleSpreadsheetSubmit}
          disabled={submitting}
          style={{ alignSelf: 'flex-end', background: '#28a745', borderColor: '#28a745', color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          {submitting ? 'Importing...' : `Import Mapped Spreadsheet (${excelRows.length} Rows)`}
        </button>
      </div>
    );
  }

  // Fallback default view (file drops & manual entry)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        
        {/* Left Column: Manual Entry & Mapping */}
        <div style={{ background: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 12, border: '1px solid var(--card-border)' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-primary)', marginBottom: 12 }}>Manual Mapping</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="form-group">
              <label>Dummy Serial Number (AT Prefix)</label>
              <input
                type="text"
                placeholder="e.g. AT303685"
                value={manualDummy}
                onChange={e => setManualDummy(e.target.value)}
              />
            </div>
            
            <div className="form-group">
              <label>Actual PCB Serial Number</label>
              <input
                type="text"
                placeholder="e.g. APJ2115352A05963"
                value={manualReal}
                onChange={e => setManualReal(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Box Selection</label>
              <select value={manualBox} onChange={e => setManualBox(e.target.value)}>
                {Array.from({ length: 12 }).map((_, i) => (
                  <option key={i} value={`Box ${i + 1}`}>{`Box ${i + 1}`}</option>
                ))}
              </select>
            </div>

            {(manualReal || manualDummy) && (
              <div style={{
                padding: '10px 12px',
                borderRadius: 8,
                background: validation.bg,
                border: `1px solid ${validation.border}`,
                color: validation.color,
                fontSize: '0.75rem',
                fontWeight: 700,
                marginTop: 4,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                transition: 'all 0.3s ease'
              }}>
                {validation.text}
              </div>
            )}

            <button
              type="button"
              className="btn btn-primary"
              onClick={addManualPanel}
              style={{ marginTop: 8 }}
            >
              Add Panel to Queue
            </button>
          </div>

          {manualList.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <h4 style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: 8 }}>Staged Manual Panels ({manualList.length})</h4>
              <div style={{ maxHeight: 150, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {manualList.map((p) => {
                  const val = getValidationInfo(p.real_sr_no);
                  return (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', borderRadius: 6 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-main)' }}>
                          <strong>Dummy:</strong> {p.dummy_sr_no || 'None'} • <strong>Real:</strong> {p.real_sr_no || 'None'}
                        </span>
                        <span style={{ fontSize: '0.65rem', color: val.color }}>{p.box_no} • {val.text}</span>
                      </div>
                      <button type="button" onClick={() => removeManualPanel(p.id)} style={{ background: 'transparent', border: 'none', color: '#dc3545', cursor: 'pointer' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => handleBulkSubmit(manualList)}
                disabled={submitting}
                style={{ width: '100%', marginTop: 10, background: '#28a745', borderColor: '#28a745', color: '#fff' }}
              >
                {submitting ? 'Submitting...' : `Submit Staged Panels (${manualList.length})`}
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Excel File Import */}
        <div style={{ background: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 12, border: '1px solid var(--card-border)', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-primary)', marginBottom: 12 }}>Excel File Import</h3>
          
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{
              flex: 1,
              border: isDragging ? '2px dashed var(--color-primary)' : '2px dashed var(--card-border)',
              background: isDragging ? 'rgba(var(--color-primary-rgb), 0.05)' : 'rgba(255,255,255,0.01)',
              borderRadius: 8,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              padding: 24,
              cursor: 'pointer',
              minHeight: 140,
              transition: 'all 0.2s ease',
              marginBottom: 12
            }}
            onClick={() => document.getElementById('excelFileInput').click()}
          >
            <FileSpreadsheet size={32} color={isDragging ? 'var(--color-primary)' : 'var(--text-muted)'} style={{ marginBottom: 8 }} />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)' }}>Drag and drop file here</span>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 4 }}>or click to browse (.xlsx, .xls)</span>
            <input
              type="file"
              id="excelFileInput"
              accept=".xlsx, .xls"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
          </div>
        </div>

      </div>
    </div>
  );
};

export default InwardMappingImportSection;
