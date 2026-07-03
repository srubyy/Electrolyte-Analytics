import React from 'react';
import { Search, Wrench, Plus, ArrowRight, Check, X, ShieldAlert } from 'lucide-react';

const ScannerSearch = ({
  barcodeSearch,
  setBarcodeSearch,
  handlePanelSearch,
  searchedPanel,
  searchError,
  recentScans,
  showAssignForm,
  setShowAssignForm,
  assignForm,
  setAssignForm,
  handlePanelAssign,
  engineers,
  user,
  repairAction,
  setRepairAction,
  handleRepairAction
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Scanner Search Box */}
      <div className="glass-panel" style={{ padding: 16 }}>
        <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-primary)', marginBottom: 12 }}>
          🔍 Real-time Barcode Scanner
        </h3>
        <form onSubmit={handlePanelSearch} style={{ display: 'flex', gap: 8 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Scan or enter barcode serial (e.g. ESRP2P5918E26128R0100)..." 
              value={barcodeSearch}
              onChange={e => setBarcodeSearch(e.target.value)}
              style={{ paddingLeft: 36, fontSize: '0.85rem' }}
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: 'auto', margin: 0 }}>
            Query
          </button>
        </form>
        
        {searchError && (
          <div style={{ color: 'var(--color-danger)', fontSize: '0.75rem', marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>⚠️ {searchError}</span>
            {searchError.includes('not found') && (
              <button 
                type="button" 
                onClick={() => {
                  setAssignForm(prev => ({ ...prev, lot_no: barcodeSearch.substring(6, 8) || '', sr_no: barcodeSearch.substring(18, 21) || '' }));
                  setShowAssignForm(true);
                }}
                style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', padding: 0, textDecoration: 'underline', fontSize: '0.75rem', fontWeight: 700 }}
              >
                Register PCB Now
              </button>
            )}
          </div>
        )}

        {/* Recent Scans list */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginTop: 10 }}>
          <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Recents:</span>
          {recentScans.map(scan => (
            <span 
              key={scan} 
              onClick={() => { setBarcodeSearch(scan); setTimeout(() => handlePanelSearch(), 50); }}
              style={{ fontSize: '0.65rem', background: 'var(--card-bg)', color: 'var(--color-primary)', padding: '2px 8px', borderRadius: 4, cursor: 'pointer', border: '1px solid var(--card-border)', fontFamily: 'monospace' }}
            >
              {scan}
            </span>
          ))}
        </div>
      </div>

      {/* Assign PCB form (if active) */}
      {showAssignForm && (
        <div className="glass-panel" style={{ padding: 16, borderColor: 'var(--color-primary)', background: 'rgba(255, 212, 0, 0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-primary)', margin: 0 }}>
              🆕 Register & Assign PCB
            </h3>
            <button 
              type="button" 
              onClick={() => setShowAssignForm(false)}
              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
            >
              <X size={16} />
            </button>
          </div>
          <form onSubmit={handlePanelAssign} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Lot Number</label>
                <input 
                  type="number" 
                  required 
                  placeholder="e.g. 17"
                  value={assignForm.lot_no}
                  onChange={e => setAssignForm({ ...assignForm, lot_no: e.target.value })}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Serial Number</label>
                <input 
                  type="number" 
                  required 
                  placeholder="e.g. 1"
                  value={assignForm.sr_no}
                  onChange={e => setAssignForm({ ...assignForm, sr_no: e.target.value })}
                />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Side</label>
                <select 
                  value={assignForm.side}
                  onChange={e => setAssignForm({ ...assignForm, side: e.target.value })}
                >
                  <option value="Left">Left</option>
                  <option value="Right">Right</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Assign Engineer</label>
                <select 
                  value={assignForm.assigned_engineer_id}
                  onChange={e => setAssignForm({ ...assignForm, assigned_engineer_id: e.target.value })}
                >
                  {engineers.map(eng => (
                    <option key={eng.id} value={eng.id}>{eng.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <button type="submit" className="btn btn-primary" style={{ marginTop: 6, background: 'var(--color-primary)', color: '#000', fontWeight: 800 }}>
              Submit Registration
            </button>
          </form>
        </div>
      )}

      {/* Searched PCB Details & Repair Action Input */}
      {searchedPanel && (
        <div className="glass-panel" style={{ padding: 16, borderColor: 'var(--color-primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Active Scan Target</span>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)', margin: '2px 0 0 0', fontFamily: 'monospace' }}>
                {searchedPanel.panel.barcode}
              </h3>
            </div>
            <span className={`badge ${searchedPanel.panel.status === 'OK' ? 'badge-success' : searchedPanel.panel.status === 'Faulty' ? 'badge-warning' : 'badge-danger'}`}>
              Status: {searchedPanel.panel.status}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: '0.72rem', background: 'var(--card-bg)', padding: 10, borderRadius: 8, border: '1px solid var(--card-border)', marginBottom: 12 }}>
            <div>Lot Number: <strong style={{ color: 'var(--text-main)' }}>{searchedPanel.panel.lot_no}</strong></div>
            <div>Serial Number: <strong style={{ color: 'var(--text-main)' }}>#{searchedPanel.panel.sr_no}</strong></div>
            <div>Component Side: <strong style={{ color: 'var(--text-main)' }}>{searchedPanel.panel.side} Side</strong></div>
            <div>Current Stage: <strong style={{ color: 'var(--color-primary)' }}>Step {searchedPanel.panel.current_step}</strong></div>
          </div>

          {/* Rework Info Warning */}
          {searchedPanel.rework_info && (
            <div style={{ fontSize: '0.7rem', color: '#f87171', background: 'rgba(239, 68, 68, 0.08)', padding: 8, borderRadius: 6, border: '1px solid var(--card-border)', display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 12 }}>
              <ShieldAlert size={14} style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong>⚠️ REWORK DIRECTIVE AT STEP {searchedPanel.rework_info.step_no}:</strong>
                <div style={{ fontStyle: 'italic', marginTop: 2 }}>"{searchedPanel.rework_info.rejection_reason}"</div>
                <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  Rejected by: {searchedPanel.rework_info.reviewer_name}
                </div>
              </div>
            </div>
          )}

          {/* Vetting Lock Status */}
          {searchedPanel.is_locked ? (
            <div style={{ fontSize: '0.72rem', color: '#60a5fa', background: 'rgba(59, 130, 246, 0.08)', padding: 10, borderRadius: 8, border: '1px solid var(--card-border)', textAlign: 'center' }}>
              ⏳ VETTING CLEARANCE IN PROGRESS
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 4 }}>
                This step log is currently in the Quality Clearance Queue awaiting sign-off.
              </div>
            </div>
          ) : (
            /* Action Form for operator/engineer to progress the PCB */
            <form onSubmit={handleRepairAction} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Step Action Result</label>
                <select 
                  value={repairAction.status}
                  onChange={e => setRepairAction({ ...repairAction, status: e.target.value })}
                >
                  <option value="OK">OK (Clear and progress to next step)</option>
                  <option value="Faulty">Faulty (Flag defect and queue rework)</option>
                  <option value="Scrap">Scrap (Flag component completely damaged)</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Action Remark</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Solder mask check completed; oscillator IC replaced..."
                  value={repairAction.remark}
                  onChange={e => setRepairAction({ ...repairAction, remark: e.target.value })}
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                Submit Action Step <ArrowRight size={14} />
              </button>
            </form>
          )}

          {/* Step Activities Logs Timeline */}
          {searchedPanel.activities && searchedPanel.activities.length > 0 && (
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 12, marginTop: 14 }}>
              <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 10 }}>
                PCB Step-wise History logs
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 150, overflowY: 'auto' }}>
                {searchedPanel.activities.map((act, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: '0.7rem', borderBottom: '1px solid var(--card-border)', paddingBottom: 6 }}>
                    <div>
                      <div style={{ color: 'var(--text-main)' }}><strong>Step {act.step_no}: {act.step_name}</strong></div>
                      {act.remark && <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 1 }}>"{act.remark}"</div>}
                      <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        By: {act.engineer_name} | {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <span className={`badge ${act.status === 'OK' ? 'badge-success' : act.status === 'Faulty' ? 'badge-warning' : 'badge-danger'}`} style={{ fontSize: '0.52rem', padding: '1px 4px' }}>
                      {act.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ScannerSearch;
