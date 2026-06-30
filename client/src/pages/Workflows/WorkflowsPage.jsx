import React, { useState, useEffect } from 'react';
import { Cpu, ArrowRight, Check, X, ShieldAlert, CheckCircle, RefreshCw, Search, ToggleLeft, ToggleRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

// Import feature components
import StationChecklist from '../../features/workflows/StationChecklist';
import ScannerSearch from '../../features/workflows/ScannerSearch';
import PresetRemarksSelect from '../../features/workflows/PresetRemarksSelect';
import PipelineIndicator, { STEP_NAMES } from '../../features/stages/PipelineIndicator';

const WorkflowsPage = ({ barcodeSearch, setBarcodeSearch, showToast }) => {
  const { user, apiFetch } = useAuth();
  
  // Data states from parent or loaded locally
  const [engineers, setEngineers] = useState([]);
  const [stockData, setStockData] = useState([]);
  
  // Terminal selection states
  const [selectedProductionStep, setSelectedProductionStep] = useState(1);
  const [productionLotId, setProductionLotId] = useState('');
  const [productionPcbType, setProductionPcbType] = useState('GV3 Digital PCB');
  const [stepInputs, setStepInputs] = useState({});
  const [pendingProductionLogs, setPendingProductionLogs] = useState([]);
  const [approvedProductionLogs, setApprovedProductionLogs] = useState([]);
  const [lotProductionStats, setLotProductionStats] = useState(null);
  const [rejectionLogInputId, setRejectionLogInputId] = useState(null);
  const [rejectionLogText, setRejectionLogText] = useState('');

  // Station safety checklist
  const [esdWristStrap, setEsdWristStrap] = useState(false);
  const [ionizerOn, setIonizerOn] = useState(false);
  const [esdMatGrounded, setEsdMatGrounded] = useState(false);

  // Barcode search / assignment
  const [searchedPanel, setSearchedPanel] = useState(null);
  const [searchError, setSearchError] = useState('');
  const [recentScans, setRecentScans] = useState(['ESRP2P5918E26128R0100', 'ESRP2P5919E26128R0382']);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [assignForm, setAssignForm] = useState({
    lot_no: '',
    sr_no: '',
    side: 'Left',
    assigned_engineer_id: ''
  });
  const [repairAction, setRepairAction] = useState({ status: 'OK', remark: '' });

  // Step Detail Modal States
  const [showStepDetailModal, setShowStepDetailModal] = useState(false);
  const [stepDetailLoading, setStepDetailLoading] = useState(false);
  const [stepDetailPanels, setStepDetailPanels] = useState([]);
  const [stepDetailStepNo, setStepDetailStepNo] = useState(null);
  const [stepDetailSearchQuery, setStepDetailSearchQuery] = useState('');
  const [groupByLotEnabled, setGroupByLotEnabled] = useState(true);

  // Fetch initial helper data
  const fetchEngineers = async () => {
    try {
      const res = await apiFetch('/api/engineers');
      if (res.ok) {
        const data = await res.json();
        setEngineers(data);
        if (data.length > 0) {
          setAssignForm(prev => ({ ...prev, assigned_engineer_id: data[0].id }));
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStock = async () => {
    try {
      const res = await apiFetch('/api/stock');
      if (res.ok) {
        const data = await res.json();
        setStockData(data);
        if (data.length > 0 && !productionLotId) {
          setProductionLotId(data[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPendingProductionLogs = async (stepNo = '') => {
    try {
      let url = '/api/production/pending';
      if (stepNo) url += `?step_no=${stepNo}`;
      
      const res = await apiFetch(url);
      if (res.ok) {
        const data = await res.json();
        setPendingProductionLogs(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchProductionLogs = async (lotId = '', stepNo = '') => {
    try {
      let url = '/api/production/logs';
      const params = [];
      if (lotId) params.push(`lot_id=${lotId}`);
      if (stepNo) params.push(`step_no=${stepNo}`);
      if (params.length > 0) url += `?${params.join('&')}`;
      
      const res = await apiFetch(url);
      if (res.ok) {
        const data = await res.json();
        setApprovedProductionLogs(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLotProductionStats = async (lotId) => {
    if (!lotId) return;
    try {
      const res = await apiFetch(`/api/production/stats/${lotId}`);
      if (res.ok) {
        const data = await res.json();
        setLotProductionStats(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchEngineers();
    fetchStock();
  }, []);

  // Poll pending logs reactively
  useEffect(() => {
    if (user) {
      fetchPendingProductionLogs(selectedProductionStep);
      if (productionLotId) {
        fetchProductionLogs(productionLotId, selectedProductionStep);
        fetchLotProductionStats(productionLotId);
      }
    }
  }, [user, selectedProductionStep, productionLotId]);

  // Handle barcode pre-fills from parent page transitions
  useEffect(() => {
    if (barcodeSearch) {
      handlePanelSearch();
    }
  }, [barcodeSearch]);

  // Barcode Panel Search
  const handlePanelSearch = async (e) => {
    if (e) e.preventDefault();
    const cleanBarcode = barcodeSearch.trim();
    if (!cleanBarcode) return;
    
    setSearchError('');
    setSearchedPanel(null);
    
    try {
      const res = await apiFetch(`/api/panels/search?barcode=${encodeURIComponent(cleanBarcode)}`);
      const data = await res.json();
      if (res.ok) {
        setSearchedPanel(data);
        setRecentScans(prev => {
          const filtered = prev.filter(c => c !== cleanBarcode);
          return [cleanBarcode, ...filtered].slice(0, 4);
        });
      } else {
        setSearchError(data.error || 'Panel not found.');
      }
    } catch (err) {
      console.error(err);
      setSearchError('Error connecting to database.');
    }
  };

  // Register & Assign Panel
  const handlePanelAssign = async (e) => {
    e.preventDefault();
    const assignedId = assignForm.assigned_engineer_id || user.id;

    try {
      const res = await apiFetch('/api/repair/assign', {
        method: 'POST',
        body: JSON.stringify({
          lot_no: parseInt(assignForm.lot_no),
          sr_no: parseInt(assignForm.sr_no),
          side: assignForm.side,
          engineer_id: assignedId
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Panel assigned successfully! Barcode: ${data.barcode}`);
        setBarcodeSearch(data.barcode);
        setShowAssignForm(false);
        setAssignForm({ lot_no: '', sr_no: '', side: 'Left', assigned_engineer_id: engineers[0]?.id || '' });
        
        // Auto load panel state
        setSearchedPanel({
          panel: data.panel,
          activities: [{
            step_no: 1,
            step_name: 'Panel Assign',
            timestamp: new Date().toISOString(),
            status: 'OK',
            engineer_name: engineers.find(eng => eng.id === assignedId)?.name || user.name,
            remark: 'Initial registration and panel assignment'
          }],
          is_locked: false,
          pending_info: null,
          rework_info: null
        });
        
        fetchLotProductionStats(productionLotId);
      } else {
        showToast(data.error || 'Failed to assign panel', 'danger');
      }
    } catch (err) {
      console.error(err);
      showToast('Error connecting to API', 'danger');
    }
  };

  // Log Step Reworks / Progress actions
  const handleRepairAction = async (e) => {
    e.preventDefault();
    if (!searchedPanel) return;

    try {
      const res = await apiFetch('/api/repair/next', {
        method: 'POST',
        body: JSON.stringify({
          panel_id: searchedPanel.panel.id,
          engineer_id: user.id,
          status: repairAction.status,
          remark: repairAction.remark
        })
      });
      const data = await res.json();
      
      if (res.ok) {
        if (data.pending) {
          showToast(data.message, 'warning');
        } else {
          showToast(`Panel updated successfully to Step ${data.current_step}!`);
        }
        setRepairAction({ status: 'OK', remark: '' });
        
        // Reload panel state
        const reloadRes = await apiFetch(`/api/panels/search?barcode=${searchedPanel.panel.barcode}`);
        const reloadData = await reloadRes.json();
        setSearchedPanel(reloadData);
        
        fetchLotProductionStats(productionLotId);
      } else {
        showToast(data.error || 'Failed to update panel', 'danger');
      }
    } catch (err) {
      console.error(err);
      showToast('Error connecting to API', 'danger');
    }
  };

  // Submit Step Log
  const handleProductionLogSubmit = async (e) => {
    e.preventDefault();
    if (!productionLotId) {
      showToast('Please select a lot first.', 'warning');
      return;
    }

    try {
      const res = await apiFetch('/api/production/log', {
        method: 'POST',
        body: JSON.stringify({
          lot_id: parseInt(productionLotId),
          step_no: selectedProductionStep,
          pcb_type: productionPcbType,
          step_data: stepInputs
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Log submitted successfully!');
        setStepInputs({});
        fetchPendingProductionLogs(selectedProductionStep);
        fetchProductionLogs(productionLotId, selectedProductionStep);
        fetchLotProductionStats(productionLotId);
      } else {
        showToast(data.error || 'Failed to submit production log.', 'danger');
      }
    } catch (err) {
      console.error(err);
      showToast('Error connecting to production log API.', 'danger');
    }
  };

  // Clearance Actions (For TL & Managers)
  const tlApproveProductionLog = async (pendingLogId) => {
    try {
      const res = await apiFetch('/api/production/tl-approve', {
        method: 'POST',
        body: JSON.stringify({ pending_log_id: pendingLogId })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Team Lead clearance verified. Advanced to Manager clearance stage.');
        fetchPendingProductionLogs(selectedProductionStep);
        fetchLotProductionStats(productionLotId);
      } else {
        showToast(data.error || 'Failed to approve log.', 'danger');
      }
    } catch (err) {
      console.error(err);
      showToast('Error connecting to API.', 'danger');
    }
  };

  const managerApproveProductionLog = async (pendingLogId) => {
    try {
      const res = await apiFetch('/api/production/manager-approve', {
        method: 'POST',
        body: JSON.stringify({ pending_log_id: pendingLogId })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Manager clearance approved. Log committed to production database!');
        fetchPendingProductionLogs(selectedProductionStep);
        fetchProductionLogs(productionLotId, selectedProductionStep);
        fetchLotProductionStats(productionLotId);
      } else {
        showToast(data.error || 'Failed to commit log.', 'danger');
      }
    } catch (err) {
      console.error(err);
      showToast('Error connecting to API.', 'danger');
    }
  };

  const rejectProductionLog = async (pendingLogId, reason) => {
    if (!reason) {
      showToast('Please enter a rejection reason.', 'warning');
      return;
    }
    try {
      const res = await apiFetch('/api/production/reject', {
        method: 'POST',
        body: JSON.stringify({ pending_log_id: pendingLogId, rejection_reason: reason })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Production log entry rejected. Operator notified.', 'warning');
        setRejectionLogInputId(null);
        setRejectionLogText('');
        fetchPendingProductionLogs(selectedProductionStep);
      } else {
        showToast(data.error || 'Failed to reject log.', 'danger');
      }
    } catch (err) {
      console.error(err);
      showToast('Error connecting to API.', 'danger');
    }
  };

  // View Step active panels list details
  const fetchStepPanels = async (stepNo) => {
    setStepDetailLoading(true);
    setStepDetailPanels([]);
    setStepDetailStepNo(stepNo);
    try {
      const res = await apiFetch(`/api/panels?step_no=${stepNo}`);
      if (res.ok) {
        const data = await res.json();
        setStepDetailPanels(data);
      } else {
        showToast("Failed to load step panels", "danger");
      }
    } catch (err) {
      console.error(err);
      showToast("Error connecting to server", "danger");
    } finally {
      setStepDetailLoading(false);
    }
  };

  return (
    <div>
      <div className="app-header">
        <div>
          <span className="app-subtitle">Operations Terminal</span>
          <h1 className="app-title"><Wrench size={20} color="#ffd400" /> Refurbishment Pipeline Station</h1>
        </div>
        
        {/* Active Lot selector */}
        <div className="repair-lot-selector" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700 }}>Active Lot:</label>
          <select
            value={productionLotId}
            onChange={e => { setProductionLotId(e.target.value); fetchLotProductionStats(e.target.value); setStepInputs({}); }}
            style={{ width: 'auto', minWidth: 200, padding: '6px 12px', background: 'rgba(0,0,0,0.4)', color: '#fff', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}
          >
            <option value="">-- Select Active Lot --</option>
            {stockData.map(l => (
              <option key={l.id} value={l.id}>Lot {l.lot_no} ({l.batch_no} • {l.pixel_pitch})</option>
            ))}
          </select>
        </div>
      </div>

      {/* 12-Step Visual Pipeline Grid */}
      <div className="glass-panel" style={{ padding: 16, marginBottom: 20 }}>
        <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-primary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Wrench size={14} /> Interactive 12-Step Pipeline Flow (Click to Select Step)
        </h3>
        <PipelineIndicator 
          selectedStep={selectedProductionStep}
          onSelectStep={(stepNo) => { setSelectedProductionStep(stepNo); setStepInputs({}); }}
          onViewStepPanels={(stepNo) => { fetchStepPanels(stepNo); setShowStepDetailModal(true); }}
        />
      </div>

      <div className="widescreen-grid">
        {/* Left Column: Lot Status & ESD checklist */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="glass-panel" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20, height: 'fit-content' }}>
            <div>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--color-primary)', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 8, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Cpu size={16} /> Lot Checksum & Yield Vitals
              </h3>
              {lotProductionStats ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div style={{ padding: 10, background: 'rgba(255,255,255,0.015)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.03)' }}>
                      <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>Inward Received</span>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ffd400', marginTop: 4 }}>
                        {lotProductionStats.received_qty} <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>PCBs</span>
                      </div>
                    </div>
                    <div style={{ padding: 10, background: 'rgba(255,255,255,0.015)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.03)' }}>
                      <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>Shortage vs Sent</span>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: lotProductionStats.qty_sent - lotProductionStats.received_qty > 0 ? '#f87171' : '#10b981', marginTop: 4 }}>
                        {lotProductionStats.qty_sent - lotProductionStats.received_qty} <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>units</span>
                      </div>
                    </div>
                  </div>

                  {/* Stage-wise throughput metrics */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fff' }}>Stage-wise Active Throughput:</div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                      <span>Step 1: Inward (Lot Received)</span>
                      <span style={{ color: '#ffd400', fontWeight: 700 }}>{lotProductionStats.received_qty} units</span>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                      <span>Step 2: Segregation</span>
                      <span style={{ color: '#ffd400', fontWeight: 700 }}>
                        {parseInt(lotProductionStats.steps[2]?.repairable_qty || 0)} Rep • {parseInt(lotProductionStats.steps[2]?.scrap_qty || 0)} Scrap
                      </span>
                    </div>

                    {/* Checksum discrepancy warnings */}
                    {parseInt(lotProductionStats.steps[2]?.repairable_qty || 0) + parseInt(lotProductionStats.steps[2]?.scrap_qty || 0) > 0 &&
                     parseInt(lotProductionStats.steps[2]?.repairable_qty || 0) + parseInt(lotProductionStats.steps[2]?.scrap_qty || 0) !== lotProductionStats.received_qty && (
                      <div style={{ color: '#ef4444', fontSize: '0.65rem', background: 'rgba(239, 68, 68, 0.05)', padding: 6, borderRadius: 6, border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                        ⚠️ DISCREPANCY DETECTED: Segregated count ({parseInt(lotProductionStats.steps[2]?.repairable_qty || 0) + parseInt(lotProductionStats.steps[2]?.scrap_qty || 0)}) does not match Inward count ({lotProductionStats.received_qty})!
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                      <span>Step 3: Programming</span>
                      <span style={{ color: '#ffd400', fontWeight: 700 }}>
                        {parseInt(lotProductionStats.steps[3]?.code_ok || 0)} OK • {parseInt(lotProductionStats.steps[3]?.code_not_ok || 0)} Fail
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                      <span>Step 4: 1st Testing</span>
                      <span style={{ color: '#ffd400', fontWeight: 700 }}>
                        {parseInt(lotProductionStats.steps[4]?.qty_passed || 0)} Passed • {parseInt(lotProductionStats.steps[4]?.qty_failed || 0)} Failed
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                      <span>Step 12: Final Entry (Dispatch)</span>
                      <span style={{ color: '#10b981', fontWeight: 700 }}>{parseInt(lotProductionStats.steps[12]?.entry_count || 0)} Dispatched</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ 
                  padding: '16px', 
                  background: 'rgba(255, 255, 255, 0.01)', 
                  border: '1px dashed rgba(255, 255, 255, 0.06)', 
                  borderRadius: 10, 
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                  margin: '8px 0'
                }}>
                  <span className="pulse-indicator" style={{ background: '#e11d48', width: 8, height: 8, borderRadius: '50%', boxShadow: '0 0 10px #e11d48' }}></span>
                  <div style={{ fontSize: '0.72rem', color: '#fda4af', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Telemetry Link Offline</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                    Select an active production lot from the header to link this station terminal and synchronize real-time stage checksum metrics.
                  </div>
                </div>
              )}
            </div>

            {/* Product selection */}
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: 6 }}>PCB Product Type:</label>
              <select
                value={productionPcbType}
                onChange={e => setProductionPcbType(e.target.value)}
                style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', color: '#fff', borderRadius: 8, width: '100%', cursor: 'pointer' }}
              >
                <option value="GV3 Digital PCB">GV3 Digital PCB</option>
                <option value="GV2 Remote Main PCB">GV2 Remote Main PCB</option>
                <option value="GV4 Studio+ Remote PCB">GV4 Studio+ Remote PCB</option>
                <option value="GV3 Power PCB">GV3 Power PCB</option>
                <option value="GV4 Alpha Regulator PCB">GV4 Alpha Regulator PCB</option>
                <option value="GV2 Regulator">GV2 Regulator</option>
              </select>
            </div>

            {/* ESD Checklist */}
            <StationChecklist 
              esdWristStrap={esdWristStrap} 
              setEsdWristStrap={setEsdWristStrap} 
              ionizerOn={ionizerOn} 
              setIonizerOn={setIonizerOn} 
              esdMatGrounded={esdMatGrounded} 
              setEsdMatGrounded={setEsdMatGrounded} 
            />
          </div>

          {/* Barcode Search Scanner Panel */}
          <ScannerSearch 
            barcodeSearch={barcodeSearch}
            setBarcodeSearch={setBarcodeSearch}
            handlePanelSearch={handlePanelSearch}
            searchedPanel={searchedPanel}
            searchError={searchError}
            recentScans={recentScans}
            showAssignForm={showAssignForm}
            setShowAssignForm={setShowAssignForm}
            assignForm={assignForm}
            setAssignForm={setAssignForm}
            handlePanelAssign={handlePanelAssign}
            engineers={engineers}
            user={user}
            repairAction={repairAction}
            setRepairAction={setRepairAction}
            handleRepairAction={handleRepairAction}
          />
        </div>

        {/* Right Column: Vetting Queue / Logs form */}
        <div className="glass-panel" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {user?.role === 'Employee' ? (
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#ffd400', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 8, marginBottom: 16 }}>
                Log Production Batch - Step {selectedProductionStep}: {STEP_NAMES[selectedProductionStep - 1]}
              </h2>

              <form onSubmit={handleProductionLogSubmit}>
                {selectedProductionStep === 1 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div className="form-group">
                      <label>Quantity Received</label>
                      <input
                        type="number"
                        required
                        placeholder="e.g. 658"
                        value={stepInputs.qty_received || ''}
                        onChange={e => setStepInputs({...stepInputs, qty_received: parseInt(e.target.value) || ''})}
                      />
                    </div>
                    <div className="form-group">
                      <label>Expected Quantity (Atomberg quantity)</label>
                      <input
                        type="number"
                        required
                        placeholder="e.g. 678"
                        value={stepInputs.expected_qty || ''}
                        onChange={e => setStepInputs({...stepInputs, expected_qty: parseInt(e.target.value) || ''})}
                      />
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                      * Shortage will be auto-computed: <strong>{(parseInt(stepInputs.expected_qty || 0) - parseInt(stepInputs.qty_received || 0))} units shortage</strong>.
                    </div>
                  </div>
                )}

                {selectedProductionStep === 2 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div className="form-group">
                      <label>Repairable Quantity</label>
                      <input
                        type="number"
                        required
                        placeholder="e.g. 600"
                        value={stepInputs.repairable_qty || ''}
                        onChange={e => setStepInputs({...stepInputs, repairable_qty: parseInt(e.target.value) || ''})}
                      />
                    </div>
                    <div className="form-group">
                      <label>Scrap Quantity</label>
                      <input
                        type="number"
                        required
                        placeholder="e.g. 58"
                        value={stepInputs.scrap_qty || ''}
                        onChange={e => setStepInputs({...stepInputs, scrap_qty: parseInt(e.target.value) || ''})}
                      />
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Total Inspected (Repairable + Scrap): <strong>{(parseInt(stepInputs.repairable_qty || 0) + parseInt(stepInputs.scrap_qty || 0))} PCBs</strong>.
                      {lotProductionStats && (parseInt(stepInputs.repairable_qty || 0) + parseInt(stepInputs.scrap_qty || 0)) !== lotProductionStats.received_qty && (
                        <span style={{ color: '#ef4444', display: 'block', marginTop: 4 }}>
                          ⚠️ Warning: Total must equal lot received count ({lotProductionStats.received_qty})!
                        </span>
                      )}
                    </div>
                    <PresetRemarksSelect stepNo={2} stepInputs={stepInputs} setStepInputs={setStepInputs} />
                  </div>
                )}

                {selectedProductionStep === 3 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div className="form-group">
                      <label>Code OK (Passed)</label>
                      <input
                        type="number"
                        required
                        placeholder="e.g. 590"
                        value={stepInputs.code_ok || ''}
                        onChange={e => setStepInputs({...stepInputs, code_ok: parseInt(e.target.value) || ''})}
                      />
                    </div>
                    <div className="form-group">
                      <label>Code Not OK (Failed)</label>
                      <input
                        type="number"
                        required
                        placeholder="e.g. 10"
                        value={stepInputs.code_not_ok || ''}
                        onChange={e => setStepInputs({...stepInputs, code_not_ok: parseInt(e.target.value) || ''})}
                      />
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Total programmed: <strong>{(parseInt(stepInputs.code_ok || 0) + parseInt(stepInputs.code_not_ok || 0))} PCBs</strong>.
                    </div>
                  </div>
                )}

                {selectedProductionStep === 4 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div className="form-group">
                      <label>Quantity Passed (OK)</label>
                      <input
                        type="number"
                        required
                        placeholder="e.g. 570"
                        value={stepInputs.qty_passed || ''}
                        onChange={e => setStepInputs({...stepInputs, qty_passed: parseInt(e.target.value) || ''})}
                      />
                    </div>
                    <div className="form-group">
                      <label>Quantity Failed</label>
                      <input
                        type="number"
                        required
                        placeholder="e.g. 20"
                        value={stepInputs.qty_failed || ''}
                        onChange={e => setStepInputs({...stepInputs, qty_failed: parseInt(e.target.value) || ''})}
                      />
                    </div>
                    <PresetRemarksSelect stepNo={4} stepInputs={stepInputs} setStepInputs={setStepInputs} />
                  </div>
                )}

                {selectedProductionStep === 5 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div className="form-group">
                      <label>Quantity Debug OK</label>
                      <input
                        type="number"
                        required
                        placeholder="e.g. 15"
                        value={stepInputs.debug_ok || ''}
                        onChange={e => setStepInputs({...stepInputs, debug_ok: parseInt(e.target.value) || ''})}
                      />
                    </div>
                    <div className="form-group">
                      <label>Critical Quantity</label>
                      <input
                        type="number"
                        required
                        placeholder="e.g. 3"
                        value={stepInputs.critical_qty || ''}
                        onChange={e => setStepInputs({...stepInputs, critical_qty: parseInt(e.target.value) || ''})}
                      />
                    </div>
                    <div className="form-group">
                      <label>Scrap PCBs</label>
                      <input
                        type="number"
                        required
                        placeholder="e.g. 2"
                        value={stepInputs.scrap_qty || ''}
                        onChange={e => setStepInputs({...stepInputs, scrap_qty: parseInt(e.target.value) || ''})}
                      />
                    </div>
                    <PresetRemarksSelect stepNo={5} stepInputs={stepInputs} setStepInputs={setStepInputs} />
                  </div>
                )}

                {selectedProductionStep === 6 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div className="form-group">
                      <label>Entry Count</label>
                      <input
                        type="number"
                        required
                        placeholder="e.g. 585"
                        value={stepInputs.entry_count || ''}
                        onChange={e => setStepInputs({...stepInputs, entry_count: parseInt(e.target.value) || ''})}
                      />
                    </div>
                    <div className="form-group">
                      <label>PCB Status</label>
                      <select
                        value={stepInputs.pcb_status || 'OK PCB'}
                        onChange={e => setStepInputs({...stepInputs, pcb_status: e.target.value})}
                      >
                        <option value="OK PCB">OK PCB</option>
                        <option value="Faulty">Faulty</option>
                      </select>
                    </div>
                  </div>
                )}

                {selectedProductionStep === 7 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div className="form-group">
                      <label>Quantity Cleaned</label>
                      <input
                        type="number"
                        required
                        placeholder="e.g. 580"
                        value={stepInputs.qty_cleaned || ''}
                        onChange={e => setStepInputs({...stepInputs, qty_cleaned: parseInt(e.target.value) || ''})}
                      />
                    </div>
                    <div className="form-group">
                      <label>QC Reject</label>
                      <input
                        type="number"
                        required
                        placeholder="e.g. 5"
                        value={stepInputs.qc_reject || ''}
                        onChange={e => setStepInputs({...stepInputs, qc_reject: parseInt(e.target.value) || ''})}
                      />
                    </div>
                    <PresetRemarksSelect stepNo={7} stepInputs={stepInputs} setStepInputs={setStepInputs} />
                  </div>
                )}

                {selectedProductionStep === 8 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div className="form-group">
                      <label>Quantity Passed</label>
                      <input
                        type="number"
                        required
                        placeholder="e.g. 580"
                        value={stepInputs.qty_passed || ''}
                        onChange={e => setStepInputs({...stepInputs, qty_passed: parseInt(e.target.value) || ''})}
                      />
                    </div>
                    <div className="form-group">
                      <label>Quantity Failed</label>
                      <input
                        type="number"
                        required
                        placeholder="e.g. 0"
                        value={stepInputs.qty_failed || ''}
                        onChange={e => setStepInputs({...stepInputs, qty_failed: parseInt(e.target.value) || ''})}
                      />
                    </div>
                    <PresetRemarksSelect stepNo={8} stepInputs={stepInputs} setStepInputs={setStepInputs} />
                  </div>
                )}

                {selectedProductionStep === 9 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div className="form-group">
                      <label>Quantity Marked & Coated</label>
                      <input
                        type="number"
                        required
                        placeholder="e.g. 580"
                        value={stepInputs.qty_coated || ''}
                        onChange={e => setStepInputs({...stepInputs, qty_coated: parseInt(e.target.value) || ''})}
                      />
                    </div>
                    <PresetRemarksSelect stepNo={9} stepInputs={stepInputs} setStepInputs={setStepInputs} />
                  </div>
                )}

                {selectedProductionStep === 10 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div className="form-group">
                      <label>Quantity Passed</label>
                      <input
                        type="number"
                        required
                        value={stepInputs.qty_passed || ''}
                        onChange={e => setStepInputs({...stepInputs, qty_passed: parseInt(e.target.value) || ''})}
                      />
                    </div>
                    <div className="form-group">
                      <label>Quantity Failed</label>
                      <input
                        type="number"
                        required
                        value={stepInputs.qty_failed || ''}
                        onChange={e => setStepInputs({...stepInputs, qty_failed: parseInt(e.target.value) || ''})}
                      />
                    </div>
                    <PresetRemarksSelect stepNo={10} stepInputs={stepInputs} setStepInputs={setStepInputs} />
                  </div>
                )}

                {selectedProductionStep === 11 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div className="form-group">
                      <label>Bubble Packed</label>
                      <input
                        type="number"
                        required
                        value={stepInputs.bubble_packed || ''}
                        onChange={e => setStepInputs({...stepInputs, bubble_packed: parseInt(e.target.value) || ''})}
                      />
                    </div>
                    <div className="form-group">
                      <label>Box Packed</label>
                      <input
                        type="number"
                        required
                        value={stepInputs.box_packed || ''}
                        onChange={e => setStepInputs({...stepInputs, box_packed: parseInt(e.target.value) || ''})}
                      />
                    </div>
                    <div className="form-group">
                      <label>Outbound Lot Code (Out_Lot)</label>
                      <input
                        type="text"
                        placeholder="e.g. DISP-72"
                        value={stepInputs.out_lot || ''}
                        onChange={e => setStepInputs({...stepInputs, out_lot: e.target.value})}
                      />
                    </div>
                    <PresetRemarksSelect stepNo={11} stepInputs={stepInputs} setStepInputs={setStepInputs} />
                  </div>
                )}

                {selectedProductionStep === 12 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div className="form-group">
                      <label>Entry Count</label>
                      <input
                        type="number"
                        required
                        value={stepInputs.entry_count || ''}
                        onChange={e => setStepInputs({...stepInputs, entry_count: parseInt(e.target.value) || ''})}
                      />
                    </div>
                    <div className="form-group">
                      <label>PCB Status</label>
                      <select
                        value={stepInputs.pcb_status || 'OK PCB'}
                        onChange={e => setStepInputs({...stepInputs, pcb_status: e.target.value})}
                      >
                        <option value="OK PCB">OK PCB</option>
                        <option value="Faulty">Faulty</option>
                      </select>
                    </div>
                  </div>
                )}

                <button type="submit" className="btn" style={{ marginTop: 16 }}>
                  Submit Step Production Log <ArrowRight size={14} />
                </button>
              </form>

              {/* My Pending & Recent Submissions */}
              <div style={{ marginTop: 24, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 16 }}>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-primary)', marginBottom: 12 }}>My Pending & Recent Step Log Submissions</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 150, overflowY: 'auto' }}>
                  {pendingProductionLogs.filter(p => p.operator_id === user.id).length === 0 ? (
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No pending clearance approvals for this step.</div>
                  ) : (
                    pendingProductionLogs.filter(p => p.operator_id === user.id).map(p => (
                      <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, padding: 8, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 6, fontSize: '0.72rem' }}>
                        <div>
                          <strong>{p.pcb_type}</strong> • Qty: {Object.values(p.step_data)[0]} units
                          {p.rejection_reason && <div style={{ color: '#ef4444', fontSize: '0.65rem' }}>❌ Rejected Reason: {p.rejection_reason}</div>}
                        </div>
                        <span className={`badge ${p.approval_status === 'Rejected' ? 'badge-danger' : 'badge-warning'}`}>{p.approval_status}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Vetting & Approvals Queue for Selected Step (TL / Manager) */
            <div>
              <h2 className="vetting-queue-header" style={{ fontSize: '1rem', fontWeight: 800, color: '#ffd400', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 8, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <span>Vetting & Approvals Queue - Step {selectedProductionStep}: {STEP_NAMES[selectedProductionStep - 1]}</span>
                <button 
                  onClick={() => fetchPendingProductionLogs(selectedProductionStep)} 
                  className="btn btn-secondary" 
                  style={{ width: 'auto', margin: 0, padding: '4px 8px', fontSize: '0.65rem' }}
                >
                  Refresh
                </button>
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {pendingProductionLogs.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 200, color: 'var(--text-muted)', textAlign: 'center' }}>
                    <CheckCircle size={36} color="#10b981" style={{ opacity: 0.6, marginBottom: 12 }} />
                    <h3 style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 800, margin: 0 }}>Step Queue Clear</h3>
                    <p style={{ fontSize: '0.75rem', margin: 0, marginTop: 4 }}>No pending step-wise logs require your clearance sign-off at this step.</p>
                  </div>
                ) : (
                  pendingProductionLogs.map(log => {
                    const dataEntries = Object.entries(log.step_data);
                    const isTLPending = log.approval_status === 'Pending Team Lead';
                    const isTLRole = ['Team Lead', 'Manager', 'Superadmin'].includes(user.role);
                    const isMgrRole = ['Manager', 'Superadmin'].includes(user.role);
                    const isManagerPending = log.approval_status === 'Pending Manager';

                    return (
                      <div 
                        key={log.id} 
                        className="glass-panel" 
                        style={{ 
                          padding: 14, 
                          border: '1px solid rgba(255,255,255,0.04)', 
                          background: 'rgba(255,255,255,0.015)',
                          borderColor: isTLPending ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: 8, marginBottom: 10 }}>
                          <div>
                            <strong style={{ fontSize: '0.8rem', color: '#fff' }}>Lot {log.lot_no} ({log.batch_no} • {log.pixel_pitch})</strong>
                            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2 }}>
                              Operator: <strong>{log.operator_name || 'System'}</strong> • Time: {new Date(log.timestamp).toLocaleString()}
                            </div>
                          </div>
                          <span className={`badge ${isTLPending ? 'badge-warning' : isManagerPending ? 'badge-info' : 'badge-success'}`}>
                            {log.approval_status}
                          </span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>LOG DATA FIELDS:</div>
                          <div className="approval-data-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                            <div style={{ padding: '6px 8px', background: 'rgba(0,0,0,0.2)', borderRadius: 6 }}>
                              <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', display: 'block' }}>PCB Type</span>
                              <strong style={{ fontSize: '0.72rem', color: '#fff' }}>{log.pcb_type}</strong>
                            </div>
                            {dataEntries.map(([k, v]) => (
                              <div key={k} style={{ padding: '6px 8px', background: 'rgba(0,0,0,0.2)', borderRadius: 6 }}>
                                <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', display: 'block', textTransform: 'capitalize' }}>{k.replace('_', ' ')}</span>
                                <strong style={{ fontSize: '0.72rem', color: '#ffd400' }}>{String(v)}</strong>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Sign-off Actions */}
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', alignItems: 'center' }}>
                          {rejectionLogInputId === log.id ? (
                            <div style={{ display: 'flex', gap: 8, width: '100%' }}>
                              <input 
                                type="text" 
                                required
                                placeholder="Enter reason for rejection..."
                                value={rejectionLogText}
                                onChange={e => setRejectionLogText(e.target.value)}
                                style={{ flex: 1, padding: '6px 12px', fontSize: '0.72rem' }}
                              />
                              <button 
                                onClick={() => rejectProductionLog(log.id, rejectionLogText)} 
                                className="btn btn-danger" 
                                style={{ width: 'auto', margin: 0, padding: '6px 12px', fontSize: '0.72rem' }}
                              >
                                Confirm
                              </button>
                              <button 
                                onClick={() => setRejectionLogInputId(null)} 
                                className="btn btn-secondary" 
                                style={{ width: 'auto', margin: 0, padding: '6px 12px', fontSize: '0.72rem' }}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <>
                              {isTLPending && isTLRole && (
                                <button 
                                  onClick={() => tlApproveProductionLog(log.id)} 
                                  className="btn btn-success" 
                                  style={{ width: 'auto', margin: 0, padding: '6px 14px', background: '#ffd400', color: '#000', fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer' }}
                                >
                                  <Check size={12} /> TL Sign-off
                                </button>
                              )}
                              
                              {isManagerPending && isMgrRole && (
                                <button 
                                  onClick={() => managerApproveProductionLog(log.id)} 
                                  className="btn btn-success" 
                                  style={{ width: 'auto', margin: 0, padding: '6px 14px', background: '#10b981', color: '#fff', fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer' }}
                                >
                                  <CheckCheck size={12} /> Manager Approve
                                </button>
                              )}

                              {((isTLPending && isTLRole) || (isManagerPending && isMgrRole)) && (
                                <button 
                                  onClick={() => { setRejectionLogInputId(log.id); setRejectionLogText(''); }} 
                                  className="btn btn-danger" 
                                  style={{ width: 'auto', margin: 0, padding: '6px 14px', fontSize: '0.72rem', cursor: 'pointer' }}
                                >
                                  <X size={12} /> Reject
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Step Active Panels Detail Modal */}
      {showStepDetailModal && stepDetailStepNo && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16 }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: 640, maxHeight: '85vh', display: 'flex', flexDirection: 'column', padding: 20, borderColor: 'var(--color-primary)', background: '#0b0f19', borderRadius: 16 }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 12, marginBottom: 16 }}>
              <div>
                <span className="app-subtitle" style={{ fontSize: '0.65rem' }}>Stepwise Live Inventory</span>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', marginTop: 2 }}>
                  Step {stepDetailStepNo}: {STEP_NAMES[stepDetailStepNo - 1]}
                </h3>
              </div>
              <button 
                onClick={() => { setShowStepDetailModal(false); setStepDetailPanels([]); setStepDetailSearchQuery(''); }}
                style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', borderRadius: '50%', color: '#ef4444', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
              <div style={{ position: 'relative', width: '100%' }}>
                <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  placeholder="Search panels by barcode, lot, or engineer..." 
                  value={stepDetailSearchQuery}
                  onChange={e => setStepDetailSearchQuery(e.target.value)}
                  style={{ padding: '8px 12px 8px 34px', fontSize: '0.78rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255, 212, 0, 0.15)', borderRadius: 8, color: '#fff' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', background: 'rgba(255,255,255,0.02)', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Group by Lot:</span>
                  <button 
                    onClick={() => setGroupByLotEnabled(!groupByLotEnabled)}
                    style={{ background: 'none', border: 'none', color: '#ffd400', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}
                  >
                    {groupByLotEnabled ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                  </button>
                </div>
                
                <div style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                  {stepDetailLoading ? (
                    <span>Loading...</span>
                  ) : (
                    <span>
                      {(() => {
                        const q = stepDetailSearchQuery.toLowerCase().trim();
                        const filtered = stepDetailPanels.filter(p => {
                          if (!q) return true;
                          return (
                            p.barcode.toLowerCase().includes(q) ||
                            String(p.lot_no).toLowerCase().includes(q) ||
                            p.engineer_name.toLowerCase().includes(q)
                          );
                        });
                        return q 
                          ? `Showing ${filtered.length} of ${stepDetailPanels.length} panels` 
                          : `${stepDetailPanels.length} active panels`;
                      })()}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', paddingRight: 4 }}>
              {stepDetailLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                  <RefreshCw size={24} className="spin" style={{ color: 'var(--color-primary)', marginBottom: 8 }} />
                  <span style={{ fontSize: '0.75rem' }}>Loading stepwise panels inventory...</span>
                </div>
              ) : stepDetailPanels.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>
                  No active panels currently in this station.
                </div>
              ) : (() => {
                const q = stepDetailSearchQuery.toLowerCase().trim();
                const filtered = stepDetailPanels.filter(p => {
                  if (!q) return true;
                  return (
                    p.barcode.toLowerCase().includes(q) ||
                    String(p.lot_no).toLowerCase().includes(q) ||
                    p.engineer_name.toLowerCase().includes(q)
                  );
                });

                if (filtered.length === 0) {
                  return (
                    <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      No panels match your search criteria.
                    </div>
                  );
                }

                if (groupByLotEnabled) {
                  const groups = {};
                  filtered.forEach(p => {
                    const key = p.lot_no || 'Unassigned';
                    if (!groups[key]) groups[key] = [];
                    groups[key].push(p);
                  });

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {Object.entries(groups).map(([lotNo, panels]) => {
                        const sample = panels[0];
                        return (
                          <div key={lotNo} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid rgba(255, 212, 0, 0.15)', paddingBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>📦 Lot {lotNo} ({sample.batch_no} • {sample.pixel_pitch})</span>
                              <span style={{ fontSize: '0.62rem', background: 'rgba(255,255,255,0.05)', padding: '1px 6px', borderRadius: 4, color: 'var(--text-muted)' }}>
                                {panels.length} panels
                              </span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                              {panels.map(p => (
                                <div key={p.id} style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '10px 12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 8, fontSize: '0.75rem' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <strong style={{ fontSize: '0.78rem', color: '#fff', fontFamily: 'monospace' }}>{p.barcode}</strong>
                                    <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 700 }}>SR #{p.sr_no}</span>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2 }}>
                                    <span>Side: <strong>{p.side}</strong></span>
                                    <span>Eng: <strong>{p.engineer_name.split(' ')[0]}</strong></span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                } else {
                  return (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {filtered.map(p => (
                        <div key={p.id} style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '10px 12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 8, fontSize: '0.75rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <strong style={{ fontSize: '0.78rem', color: '#fff', fontFamily: 'monospace' }}>{p.barcode}</strong>
                            <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 700 }}>Lot {p.lot_no} • SR #{p.sr_no}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2 }}>
                            <span>Side: <strong>{p.side}</strong></span>
                            <span>Eng: <strong>{p.engineer_name.split(' ')[0]}</strong></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                }
              })()}
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default WorkflowsPage;
