import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Cpu, FileSpreadsheet, Trash2, CheckCircle, AlertTriangle, Plus, X, Search } from 'lucide-react';

const InwardMappingImportSection = ({ lotId, apiFetch, showToast, onSuccess }) => {
  // Database Backed States
  const [panels, setPanels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Row inline validation error states (panelId -> error string)
  const [rowErrors, setRowErrors] = useState({});

  // Keyboard scan state & active highlighted row
  const [activeRowId, setActiveRowId] = useState(null);

  // Manual Input States (Unchanged, unified with database spreadsheet view)
  const [manualDummy, setManualDummy] = useState('');
  const [manualReal, setManualReal] = useState('');
  const [manualBox, setManualBox] = useState('Box 1');
  const [manualList, setManualList] = useState([]);
  
  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);

  // Sheet selector modal states
  const [showSheetSelector, setShowSheetSelector] = useState(false);
  const [workbookSheets, setWorkbookSheets] = useState([]);
  const [pendingWorkbook, setPendingWorkbook] = useState(null);

  // Helper function to extract manufacturing year based on Actual Serial
  const getMfgYear = (serial) => {
    if (!serial) return null;
    const s = String(serial).trim();
    const len = s.length;

    // 1. Atomberg format: extract characters at index 2 and 3 (0-based) (e.g. ND21A3EHA2030096 -> 2021)
    if (len >= 4) {
      const yrPart = s.substring(2, 4);
      const yr = parseInt(yrPart, 10);
      if (!isNaN(yr) && yr >= 10 && yr <= 50) {
        return 2000 + yr;
      }
    }

    // 2. Fallbacks
    if (len === 16 || len === 17) {
      const yr = parseInt(s.substring(3, 5), 10);
      if (!isNaN(yr)) return yr + 2000;
    }
    if (s.startsWith('AGV')) {
      const cIndex = s.indexOf('C');
      if (cIndex !== -1 && cIndex + 2 < len) {
        const yr = parseInt(s.substring(cIndex + 1, cIndex + 3), 10);
        if (!isNaN(yr)) return yr + 2000;
      }
    }
    if (s.startsWith('EA') && len === 22) {
      const yr = parseInt(s.substring(15, 17), 10);
      if (!isNaN(yr)) return yr + 2000;
    }
    return null;
  };

  // Helper to determine status info based on real serial number
  const getValidationInfo = (realSerial) => {
    if (!realSerial || realSerial === '-') {
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
        text: '✅ Valid (Unknown)'
      };
    }
    if (year <= 2022) {
      return {
        status: 'scrap',
        color: '#dc3545',
        bg: 'rgba(220, 53, 69, 0.1)',
        border: 'rgba(220, 53, 69, 0.3)',
        text: `🔴 SCRAP (Mfg ${year})`
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

  // Fetch panels of the current lot from the database
  const fetchPanels = async () => {
    if (!lotId) return;
    setLoading(true);
    try {
      const res = await apiFetch(`/api/panels?lot_id=${lotId}`);
      if (res.ok) {
        const data = await res.json();
        setPanels(data);
      } else {
        showToast('Failed to retrieve lot panels.', 'danger');
      }
    } catch (err) {
      console.error(err);
      showToast('Error loading panels.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPanels();
  }, [lotId]);

  // Global keydown listener for barcode scanning HID mode
  useEffect(() => {
    let scanBuffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e) => {
      const currentTime = Date.now();
      if (currentTime - lastKeyTime > 50) {
        scanBuffer = ''; // reset buffer if keystrokes are too slow
      }
      lastKeyTime = currentTime;

      if (e.key === 'Enter') {
        if (scanBuffer.trim().length > 0) {
          const scannedVal = scanBuffer.trim();
          scanBuffer = '';
          handleGlobalScan(scannedVal);
          e.preventDefault();
        }
      } else if (e.key.length === 1) {
        scanBuffer += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [panels]);

  // Locate, highlight and focus row matching scanned dummy barcode
  const handleGlobalScan = (scannedVal) => {
    // 8 characters or starts with 'AT' implies dummy barcode
    const isDummy = scannedVal.length === 8 || scannedVal.startsWith('AT');
    
    if (isDummy) {
      const matched = panels.find(p => {
        const dummyVal = String(p.dummy_sr_no || '').toLowerCase();
        const excelDummyVal = String(p.excel_data?.['PCB Sr No'] || '').toLowerCase();
        const target = scannedVal.toLowerCase();
        return dummyVal === target || excelDummyVal === target;
      });

      if (matched) {
        setActiveRowId(matched.id);
        showToast(`Located PCB Sr No: ${scannedVal}. Focus shifted to Actual Serial No.`, 'success');
        
        const rowEl = document.getElementById(`panel-row-${matched.id}`);
        if (rowEl) {
          rowEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        setTimeout(() => {
          const inputEl = document.getElementById(`actual-serial-input-${matched.id}`);
          if (inputEl) {
            inputEl.focus();
            inputEl.select();
          }
        }, 150);
      } else {
        showToast(`Dummy serial ${scannedVal} not found in this lot.`, 'warning');
      }
    }
  };

  const manualValidation = getValidationInfo(manualReal);

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
        "PCB Sr No": manualDummy.trim(),
        "Barcode": manualReal.trim(),
        "Box": manualBox
      }
    };

    setManualList([...manualList, newPanel]);
    setManualDummy('');
    setManualReal('');
    showToast('Panel added to queue!', 'success');
  };

  const removeManualPanel = (id) => {
    setManualList(manualList.filter(p => p.id !== id));
  };

  // Drag and drop handlers
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

  // Load and parse excel file, sending rows straight to backend database
  const handleExcelFile = (file) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        if (workbook.SheetNames.length === 1) {
          importSheet(workbook, workbook.SheetNames[0]);
        } else {
          setWorkbookSheets(workbook.SheetNames);
          setPendingWorkbook(workbook);
          setShowSheetSelector(true);
        }
      } catch (err) {
        console.error(err);
        showToast(`Error reading Excel: ${err.message || err}`, 'danger');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const importSheet = async (workbook, sheetName) => {
    try {
      const worksheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

      if (json.length < 2) {
        showToast(`Sheet "${sheetName}" has no data rows.`, 'warning');
        return;
      }

      let maxCols = 0;
      json.forEach(row => {
        if (row && row.length > maxCols) maxCols = row.length;
      });

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
        headers = Array.from(json[0] || []);
      }

      while (headers.length < maxCols) {
        headers.push(`Column ${headers.length + 1}`);
      }
      headers = headers.map(h => String(h || '').trim());

      const lowerHeaders = headers.map(h => h.toLowerCase());
      let barcodeIdx = lowerHeaders.findIndex(h => h.includes('barcode'));
      let pcbSrIdx = lowerHeaders.findIndex(h => h.includes('pcb sr') || h.includes('sr no') || h.includes('serial'));
      let boxIdx = lowerHeaders.findIndex(h => h.includes('box'));

      // Fallback column detection: scan data rows for serial patterns (AT... or length 16/21/22)
      if (pcbSrIdx === -1 && barcodeIdx === -1) {
        for (let r = headerRowIdx + 1; r < Math.min(json.length, headerRowIdx + 10); r++) {
          const row = json[r];
          if (!row) continue;
          const cleanRow = Array.from(row);
          for (let c = 0; c < cleanRow.length; c++) {
            const val = String(cleanRow[c] || '').trim();
            if (val.startsWith('AT') || val.length === 16 || val.length === 21 || val.length === 22) {
              pcbSrIdx = c;
              break;
            }
          }
          if (pcbSrIdx !== -1) break;
        }
      }

      const dataRows = json.slice(headerRowIdx + 1).filter(r => r && r.length > 0);
      
      const panelsToSubmit = dataRows.map(row => {
        const arr = Array.from(row);
        while (arr.length < headers.length) {
          arr.push('');
        }
        const cleanedRow = arr.map(c => String(c || '').trim());
        
        const rawBarcode = barcodeIdx !== -1 ? cleanedRow[barcodeIdx] : '';
        const dummy = pcbSrIdx !== -1 ? cleanedRow[pcbSrIdx] : '';
        const boxVal = boxIdx !== -1 ? cleanedRow[boxIdx] : 'Box 1';

        // Skip rows that contain neither a dummy nor a real barcode
        if (!dummy && !rawBarcode) return null;

        // Extract real barcode if it contains actual content
        const hasRealBarcode = rawBarcode && rawBarcode !== '-';
        
        const rowData = {};
        headers.forEach((header, cIdx) => {
          rowData[header] = cleanedRow[cIdx];
        });

        return {
          dummy_sr_no: dummy,
          real_sr_no: hasRealBarcode ? rawBarcode : '',
          box_no: boxVal || 'Box 1',
          barcode: hasRealBarcode ? rawBarcode : '',
          excel_data: rowData
        };
      }).filter(Boolean);

      // Submit immediately to database
      await handleBulkSubmit(panelsToSubmit);
      
      // Reset sheet selector
      setShowSheetSelector(false);
      setPendingWorkbook(null);
    } catch (err) {
      console.error(err);
      showToast(`Error importing sheet: ${err.message || err}`, 'danger');
    }
  };

  // Submit bulk payload helper
  const handleBulkSubmit = async (panelsList) => {
    if (!lotId) {
      showToast('Please select a lot first.', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiFetch('/api/panels/import', {
        method: 'POST',
        body: JSON.stringify({
          lot_id: parseInt(lotId),
          panels: panelsList
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Successfully saved panels to database!');
        setManualList([]);
        fetchPanels();
        if (onSuccess) onSuccess();
      } else {
        showToast(data.error || 'Failed to save panels.', 'danger');
      }
    } catch (err) {
      console.error(err);
      showToast('Error connecting to import API.', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  // Edit custom cell in database immediately
  const handleCellChange = async (panelId, colKey, val) => {
    // Optimistic update
    setPanels(prev => prev.map(p => {
      if (p.id === panelId) {
        const updatedData = { ...(p.excel_data || {}) };
        updatedData[colKey] = val;
        return { ...p, excel_data: updatedData };
      }
      return p;
    }));

    try {
      const panelToUpdate = panels.find(p => p.id === panelId);
      const updatedData = { ...(panelToUpdate.excel_data || {}) };
      updatedData[colKey] = val;

      await apiFetch(`/api/panels/${panelId}`, {
        method: 'PATCH',
        body: JSON.stringify({ excel_data: updatedData })
      });
    } catch (err) {
      console.error('Cell update failed:', err);
      showToast('Failed to save cell update to database.', 'danger');
    }
  };

  // Edit Actual Serial No in database immediately (with scan validation)
  const handleActualSerialChange = async (panelId, val) => {
    const cleanVal = String(val).trim();
    setRowErrors(prev => ({ ...prev, [panelId]: null }));

    // Optimistic update
    setPanels(prev => prev.map(p => {
      if (p.id === panelId) {
        const mfgYear = getMfgYear(cleanVal);
        let status = 'Repairable';
        let scrapReason = null;
        if (mfgYear && mfgYear <= 2022) {
          status = 'Scrap';
          scrapReason = `Manufacturing Year (${mfgYear}) <= 2022`;
        }
        return {
          ...p,
          real_sr_no: cleanVal,
          barcode: cleanVal,
          mfg_year: mfgYear,
          status,
          scrap_reason: scrapReason
        };
      }
      return p;
    }));

    if (!cleanVal || cleanVal === '-') {
      try {
        await apiFetch(`/api/panels/${panelId}`, {
          method: 'PATCH',
          body: JSON.stringify({ real_sr_no: '', barcode: '' })
        });
        if (onSuccess) onSuccess();
      } catch (err) {
        console.error(err);
      }
      return;
    }

    // Verify barcode exists in database
    try {
      const searchRes = await apiFetch(`/api/panels/search?barcode=${encodeURIComponent(cleanVal)}`);
      if (!searchRes.ok) {
        setRowErrors(prev => ({ ...prev, [panelId]: 'Barcode not found — rescan' }));
        return;
      }

      const res = await apiFetch(`/api/panels/${panelId}`, {
        method: 'PATCH',
        body: JSON.stringify({ real_sr_no: cleanVal, barcode: cleanVal })
      });

      if (res.ok) {
        const data = await res.json();
        setPanels(prev => prev.map(p => p.id === panelId ? data.panel : p));
        if (onSuccess) onSuccess();
      } else {
        setRowErrors(prev => ({ ...prev, [panelId]: 'Error saving barcode — try again' }));
      }
    } catch (err) {
      console.error(err);
      setRowErrors(prev => ({ ...prev, [panelId]: 'Network error validating barcode' }));
    }
  };

  // Edit base field directly
  const handleBaseFieldChange = async (panelId, fieldName, val) => {
    setPanels(prev => prev.map(p => p.id === panelId ? { ...p, [fieldName]: val } : p));
    try {
      await apiFetch(`/api/panels/${panelId}`, {
        method: 'PATCH',
        body: JSON.stringify({ [fieldName]: val })
      });
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error(err);
      showToast('Failed to save field change.', 'danger');
    }
  };

  // Add empty row
  const handleAddRow = async () => {
    try {
      const res = await apiFetch('/api/panels', {
        method: 'POST',
        body: JSON.stringify({ lot_id: parseInt(lotId) })
      });
      if (res.ok) {
        fetchPanels();
        if (onSuccess) onSuccess();
        showToast('Added new empty row.', 'success');
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to append row.', 'danger');
    }
  };

  // Delete row
  const handleDeleteRow = async (panelId) => {
    try {
      const res = await apiFetch(`/api/panels/${panelId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchPanels();
        if (onSuccess) onSuccess();
        showToast('Panel removed successfully.', 'success');
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to delete row.', 'danger');
    }
  };

  // Clear all lot panels
  const handleClearLot = async () => {
    if (!window.confirm("Are you sure you want to clear all imported panels for this lot? This cannot be undone.")) return;
    try {
      const res = await apiFetch(`/api/panels/clear?lot_id=${lotId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setPanels([]);
        if (onSuccess) onSuccess();
        showToast('Cleared lot panels.', 'success');
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to clear panels.', 'danger');
    }
  };

  // Extract dynamically headers of raw excel columns
  const getExcelHeaders = () => {
    const headersSet = new Set();
    panels.forEach(p => {
      if (p.excel_data) {
        Object.keys(p.excel_data).forEach(k => headersSet.add(k));
      }
    });
    return Array.from(headersSet);
  };

  const rawHeaders = getExcelHeaders();

  // Create columns list ensuring correct insertion order
  const getColumns = () => {
    const cols = [];
    let actualSerialInserted = false;
    let scrapInserted = false;

    rawHeaders.forEach(h => {
      cols.push({ key: h, type: 'excel', label: h });
      if (h.toLowerCase() === 'barcode') {
        cols.push({ key: 'actual_serial_no', type: 'actual_serial_no', label: 'Actual Serial No' });
        actualSerialInserted = true;
      }
      if (h.toLowerCase() === 'mfg year') {
        cols.push({ key: 'scrap', type: 'scrap', label: 'Scrap' });
        scrapInserted = true;
      }
    });

    if (!actualSerialInserted) {
      cols.push({ key: 'actual_serial_no', type: 'actual_serial_no', label: 'Actual Serial No' });
    }
    if (!scrapInserted) {
      cols.push({ key: 'scrap', type: 'scrap', label: 'Scrap' });
    }

    return cols;
  };

  const columns = getColumns();

  // Show interactive spreadsheet grid when panels exist
  if (panels.length > 0) {
    return (
      <div className="glass-panel" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16, marginTop: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--color-primary)' }}>Spreadsheet Review Editor</h3>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              Scan dummy barcode to search. Edit any cell inline to update database immediately.
            </span>
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
              onClick={handleClearLot}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', fontSize: '0.72rem', background: '#dc3545', color: '#fff', border: 'none' }}
            >
              <X size={14} /> Clear All
            </button>
          </div>
        </div>

        {/* Scrollable table grid */}
        <div style={{ overflowX: 'auto', border: '1px solid var(--card-border)', borderRadius: 8, maxHeight: 450, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--card-border)' }}>
                <th style={{ padding: '8px 12px', width: 45, position: 'sticky', left: 0, background: 'var(--card-bg)', zIndex: 10 }}>#</th>
                <th style={{ padding: '8px 12px', minWidth: 100, background: 'rgba(255,255,255,0.01)', color: 'var(--text-muted)' }}>Dummy SR</th>
                <th style={{ padding: '8px 12px', minWidth: 90, background: 'rgba(255,255,255,0.01)', color: 'var(--text-muted)' }}>Box No</th>
                
                {/* Dynamically Ordered Excel Headers + Custom Injected Headers */}
                {columns.map((col, idx) => (
                  <th
                    key={idx}
                    style={{
                      padding: '8px 12px',
                      minWidth: col.type === 'actual_serial_no' ? 190 : col.type === 'scrap' ? 90 : 120,
                      background: col.type === 'actual_serial_no' ? 'rgba(var(--color-primary-rgb), 0.05)' : 'transparent',
                      color: col.type === 'actual_serial_no' ? 'var(--color-primary)' : 'var(--text-main)'
                    }}
                  >
                    {col.label}
                  </th>
                ))}
                
                <th style={{ padding: '8px 12px', minWidth: 100 }}>Validation</th>
                <th style={{ padding: '8px 12px', width: 50 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {panels.map((panel, rowIdx) => {
                const calculatedYear = getMfgYear(panel.real_sr_no);
                const valInfo = getValidationInfo(panel.real_sr_no);
                const isHighlighted = activeRowId === panel.id;

                return (
                  <tr
                    key={panel.id}
                    id={`panel-row-${panel.id}`}
                    style={{
                      borderBottom: '1px solid rgba(255,255,255,0.02)',
                      background: isHighlighted 
                        ? 'rgba(var(--color-primary-rgb), 0.15)' 
                        : (valInfo.status === 'scrap' ? 'rgba(220, 53, 69, 0.05)' : 'transparent'),
                      transition: 'all 0.25s ease'
                    }}
                  >
                    {/* Index */}
                    <td style={{ padding: '6px 12px', color: 'var(--text-muted)', fontWeight: 700, position: 'sticky', left: 0, background: 'var(--card-bg)', zIndex: 5 }}>
                      {rowIdx + 1}
                    </td>

                    {/* Dummy SR (Base Field) */}
                    <td style={{ padding: '4px 6px' }}>
                      <input
                        type="text"
                        value={panel.dummy_sr_no || ''}
                        onChange={e => handleBaseFieldChange(panel.id, 'dummy_sr_no', e.target.value)}
                        style={{ padding: '4px 8px', background: 'var(--input-bg)', border: '1px solid var(--card-border)', color: 'var(--text-main)', borderRadius: 4, width: '100%', fontSize: '0.72rem' }}
                      />
                    </td>

                    {/* Box No (Base Field) */}
                    <td style={{ padding: '4px 6px' }}>
                      <input
                        type="text"
                        value={panel.box_no || ''}
                        onChange={e => handleBaseFieldChange(panel.id, 'box_no', e.target.value)}
                        style={{ padding: '4px 8px', background: 'var(--input-bg)', border: '1px solid var(--card-border)', color: 'var(--text-main)', borderRadius: 4, width: '100%', fontSize: '0.72rem' }}
                      />
                    </td>

                    {/* Excel Columns & Calculated/Injected Columns */}
                    {columns.map((col, idx) => {
                      if (col.type === 'actual_serial_no') {
                        return (
                          <td key={idx} style={{ padding: '4px 6px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <input
                                id={`actual-serial-input-${panel.id}`}
                                type="text"
                                value={panel.real_sr_no || ''}
                                placeholder="Scan actual barcode"
                                onChange={e => handleActualSerialChange(panel.id, e.target.value)}
                                style={{
                                  padding: '4px 8px',
                                  background: 'var(--input-bg)',
                                  border: rowErrors[panel.id] ? '1px solid #dc3545' : '1px solid var(--color-primary)',
                                  color: 'var(--text-main)',
                                  borderRadius: 4,
                                  width: '100%',
                                  fontSize: '0.72rem'
                                }}
                              />
                              {rowErrors[panel.id] && (
                                <span style={{ color: '#dc3545', fontSize: '0.62rem', marginTop: 2 }}>
                                  {rowErrors[panel.id]}
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      }

                      if (col.type === 'scrap') {
                        return (
                          <td key={idx} style={{ padding: '6px 12px', fontWeight: 800 }}>
                            {valInfo.status === 'scrap' ? (
                              <span style={{ color: '#dc3545' }}>SCRAP</span>
                            ) : (
                              ''
                            )}
                          </td>
                        );
                      }

                      // Hijack display of 'Mfg Year' to show recalculated year live
                      if (col.key.toLowerCase() === 'mfg year') {
                        return (
                          <td key={idx} style={{ padding: '6px 12px', fontWeight: 700 }}>
                            {calculatedYear || ''}
                          </td>
                        );
                      }

                      // Raw Excel Cell
                      const rawVal = panel.excel_data ? panel.excel_data[col.key] : '';
                      return (
                        <td key={idx} style={{ padding: '4px 6px' }}>
                          <input
                            type="text"
                            value={rawVal || ''}
                            onChange={e => handleCellChange(panel.id, col.key, e.target.value)}
                            style={{ padding: '4px 8px', background: 'var(--input-bg)', border: '1px solid var(--card-border)', color: 'var(--text-main)', borderRadius: 4, width: '100%', fontSize: '0.72rem' }}
                          />
                        </td>
                      );
                    })}

                    {/* Validation */}
                    <td style={{ padding: '6px 12px' }}>
                      <span style={{ padding: '3px 6px', borderRadius: 6, background: valInfo.bg, color: valInfo.color, fontSize: '0.65rem', fontWeight: 700, border: `1px solid ${valInfo.border}` }}>
                        {valInfo.text}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '6px 12px', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => handleDeleteRow(panel.id)}
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
      </div>
    );
  }

  // File Upload Default view (when no panels in lot yet)
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
                background: manualValidation.bg,
                border: `1px solid ${manualValidation.border}`,
                color: manualValidation.color,
                fontSize: '0.75rem',
                fontWeight: 700,
                marginTop: 4,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                transition: 'all 0.3s ease'
              }}>
                {manualValidation.text}
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

      {/* Sheet Selector Modal overlay */}
      {showSheetSelector && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999
        }}>
          <div className="glass-panel" style={{
            padding: 24,
            width: '90%',
            maxWidth: 480,
            borderRadius: 12,
            border: '1px solid var(--card-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            background: 'var(--card-bg)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--color-primary)' }}>Select Excel Sheet</h3>
              <button
                type="button"
                onClick={() => { setShowSheetSelector(false); setPendingWorkbook(null); }}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>
            
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              This workbook contains multiple sheets. Select the sheet containing your PCB mapping data:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 200, overflowY: 'auto' }}>
              {workbookSheets.map((sheet, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => importSheet(pendingWorkbook, sheet)}
                  className="btn btn-secondary"
                  style={{
                    textAlign: 'left',
                    padding: '10px 12px',
                    fontSize: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    background: 'rgba(255,255,255,0.02)',
                    borderColor: 'var(--card-border)'
                  }}
                >
                  <FileSpreadsheet size={16} color="var(--color-primary)" />
                  <span>{sheet}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default InwardMappingImportSection;
