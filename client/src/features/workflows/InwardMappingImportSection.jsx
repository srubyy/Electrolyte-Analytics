import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Cpu, FileSpreadsheet, Trash2, CheckCircle, AlertTriangle, HelpCircle } from 'lucide-react';

const InwardMappingImportSection = ({ lotId, apiFetch, showToast, onSuccess }) => {
  // Manual Input States
  const [manualDummy, setManualDummy] = useState('');
  const [manualReal, setManualReal] = useState('');
  const [manualBox, setManualBox] = useState('Box 1');
  const [manualList, setManualList] = useState([]);

  // Excel Upload States
  const [excelList, setExcelList] = useState([]);
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
        text: '⚠️ Pending Actual PCB No. (Validation Deferred)'
      };
    }
    const year = getMfgYear(realSerial);
    if (!year) {
      return {
        status: 'valid',
        color: '#28a745',
        bg: 'rgba(40, 167, 69, 0.1)',
        border: 'rgba(40, 167, 69, 0.25)',
        text: '✅ Valid: Manufacturing year format unknown. Proceeding.'
      };
    }
    if (year <= 2022) {
      return {
        status: 'scrap',
        color: '#dc3545',
        bg: 'rgba(220, 53, 69, 0.1)',
        border: 'rgba(220, 53, 69, 0.3)',
        text: `🔴 SCRAP WARNING: Mfg Year ${year} (<= 2022)`
      };
    }
    return {
      status: 'valid',
      color: '#28a745',
      bg: 'rgba(40, 167, 69, 0.1)',
      border: 'rgba(40, 167, 69, 0.25)',
      text: `✅ Valid: Mfg Year ${year} (>= 2023)`
    };
  };

  // Live validation for manual inputs
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
      id: Date.now() + Math.random()
    };

    setManualList([...manualList, newPanel]);
    setManualDummy('');
    setManualReal('');
    showToast('Panel added to list!', 'success');
  };

  const removeManualPanel = (id) => {
    setManualList(manualList.filter(p => p.id !== id));
  };

  // Excel Drag-and-Drop Handlers
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

        const headers = json[0].map(h => String(h || '').trim().toLowerCase());
        const serialIdx = headers.findIndex(h => h.includes('sr no') || h.includes('serial') || h.includes('pcb sr'));
        const boxIdx = headers.findIndex(h => h.includes('box'));
        const barcodeIdx = headers.findIndex(h => h.includes('barcode'));

        const parsed = [];
        for (let r = 1; r < json.length; r++) {
          const row = json[r];
          if (!row || row.length === 0) continue;

          let rawSerial = serialIdx !== -1 ? String(row[serialIdx] || '').trim() : '';
          let boxNo = boxIdx !== -1 ? String(row[boxIdx] || '').trim() : '';
          let barcode = barcodeIdx !== -1 ? String(row[barcodeIdx] || '').trim() : '';

          if (!rawSerial && barcode) {
            rawSerial = barcode;
          }

          if (!rawSerial) continue;

          const isDummy = rawSerial.startsWith('AT') || rawSerial.length <= 8;
          parsed.push({
            dummy_sr_no: isDummy ? rawSerial : '',
            real_sr_no: isDummy ? '' : rawSerial,
            box_no: boxNo || 'Box 1',
            id: Date.now() + r
          });
        }

        if (parsed.length === 0) {
          showToast('No valid serial numbers found in the uploaded Excel.', 'warning');
          return;
        }

        setExcelList(parsed);
        showToast(`Successfully parsed ${parsed.length} rows from Excel!`, 'success');
      } catch (err) {
        console.error(err);
        showToast('Error reading Excel file.', 'danger');
      }
    };
    reader.readAsArrayBuffer(file);
  };

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
        setExcelList([]);
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 12 }}>
      {/* 2-Column Section */}
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

            {/* Dynamic Status Alert Badge */}
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

          {/* Staged manual items list */}
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

          {/* Staged Excel Rows Review */}
          {excelList.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>Parsed Excel Rows ({excelList.length})</span>
                <button type="button" className="btn btn-secondary" onClick={() => setExcelList([])} style={{ padding: '4px 8px', fontSize: '0.65rem' }}>Clear</button>
              </div>

              <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid var(--card-border)', borderRadius: 6 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.7rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--card-border)' }}>
                      <th style={{ padding: '6px 8px', textAlign: 'left' }}>#</th>
                      <th style={{ padding: '6px 8px', textAlign: 'left' }}>Serial No</th>
                      <th style={{ padding: '6px 8px', textAlign: 'left' }}>Box</th>
                      <th style={{ padding: '6px 8px', textAlign: 'left' }}>Validation Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {excelList.slice(0, 100).map((p, idx) => {
                      const val = getValidationInfo(p.real_sr_no || p.dummy_sr_no);
                      return (
                        <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                          <td style={{ padding: '6px 8px', color: 'var(--text-muted)' }}>{idx + 1}</td>
                          <td style={{ padding: '6px 8px', wordBreak: 'break-all' }}>{p.real_sr_no || p.dummy_sr_no}</td>
                          <td style={{ padding: '6px 8px' }}>{p.box_no}</td>
                          <td style={{ padding: '6px 8px', color: val.color, fontWeight: 700 }}>
                            {val.status === 'scrap' ? '🔴 Scrap' : val.status === 'valid' ? '🟢 Valid' : '🟡 Pending'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {excelList.length > 100 && (
                  <div style={{ padding: 8, textAlign: 'center', fontSize: '0.65rem', color: 'var(--text-muted)', borderTop: '1px solid var(--card-border)' }}>
                    ... and {excelList.length - 100} more rows
                  </div>
                )}
              </div>

              <button
                type="button"
                className="btn btn-primary"
                onClick={() => handleBulkSubmit(excelList)}
                disabled={submitting}
                style={{ background: '#28a745', borderColor: '#28a745', color: '#fff' }}
              >
                {submitting ? 'Submitting...' : `Import Excel Panels (${excelList.length})`}
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default InwardMappingImportSection;
