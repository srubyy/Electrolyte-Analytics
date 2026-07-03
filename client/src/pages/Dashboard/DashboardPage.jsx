import React, { useState, useEffect } from 'react';
import { LayoutDashboard, RefreshCw, AlertTriangle, TrendingUp, History } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const DashboardPage = ({ setView, setBarcodeSearch, showToast }) => {
  const { user, apiFetch } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [lotFilter, setLotFilter] = useState('');
  const [engineers, setEngineers] = useState([]);

  const fetchDashboard = async () => {
    try {
      const url = lotFilter ? `/api/dashboard?lot_no=${lotFilter}` : '/api/dashboard';
      const res = await apiFetch(url);
      if (res.ok) {
        const data = await res.json();
        setDashboardData(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchEngineers = async () => {
    try {
      const res = await apiFetch('/api/engineers');
      if (res.ok) {
        const data = await res.json();
        setEngineers(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchDashboard();
    fetchEngineers();
  }, [lotFilter]);

  // Auto-refresh stats every 15s
  useEffect(() => {
    const timer = setInterval(() => {
      fetchDashboard();
    }, 15000);
    return () => clearInterval(timer);
  }, [lotFilter]);

  return (
    <div>
      <div className="app-header">
        <div>
          <span className="app-subtitle">Electrolyte Solutions</span>
          <h1 className="app-title"><LayoutDashboard size={20} color='var(--color-primary)' /> Dashboard</h1>
        </div>
        <button 
          onClick={() => { fetchDashboard(); showToast("Visual board updated!"); }} 
          style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer' }}
        >
          <RefreshCw size={18} />
        </button>
      </div>

      <div className="widescreen-grid">
        {/* Left Column: KPI Metrics & Critical Alerts */}
        <div className="glass-panel" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--color-primary)', borderBottom: '1px solid var(--card-border)', paddingBottom: 8 }}>Production KPI Metrics</h3>
          
          {dashboardData && (
            <div className="metrics-grid" style={{ marginBottom: 0 }}>
              <div className="metric-card glass-panel blue" style={{ border: 'none', background: 'var(--card-bg)' }}>
                <span className="metric-label">Inward Lots</span>
                <h3 className="metric-val">{dashboardData.metrics.total_lots}</h3>
              </div>
              <div className="metric-card glass-panel" style={{ border: 'none', background: 'var(--card-bg)' }}>
                <span className="metric-label">Total Received</span>
                <h3 className="metric-val">{dashboardData.metrics.total_received}</h3>
              </div>
              <div className="metric-card glass-panel warning" style={{ border: 'none', background: 'var(--card-bg)' }}>
                <span className="metric-label">In Pipeline</span>
                <h3 className="metric-val">{dashboardData.metrics.total_pending}</h3>
              </div>
              <div className="metric-card glass-panel success" style={{ border: 'none', background: 'var(--card-bg)' }}>
                <span className="metric-label">Dispatched OK</span>
                <h3 className="metric-val">{dashboardData.metrics.total_dispatched}</h3>
              </div>
            </div>
          )}

          {/* Critical Alert Banners */}
          {dashboardData?.alerts && dashboardData.alerts.length > 0 && (
            <div className="alerts-section" style={{ marginBottom: 0, flex: 1, overflowY: 'auto' }}>
              {dashboardData.alerts.map((alert, idx) => (
                <div key={idx} className={`alert-card ${alert.type === 'discrepancy' ? '' : 'warning'}`} style={{ animation: 'none' }}>
                  <AlertTriangle size={16} />
                  <div>{alert.message}</div>
                </div>
              ))}
            </div>
          )}

          {/* Shop Floor Vitals Widget */}
          {user && (
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-blue)', display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
                <TrendingUp size={14} /> Shop Floor Health Vitals
              </h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ padding: 10, background: 'var(--card-bg)', borderRadius: 8, border: '1px solid var(--card-border)' }}>
                  <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>Line Yield Rate</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <span style={{ fontSize: '1rem', fontWeight: 800, color: '#10b981' }}>98.2%</span>
                    <div style={{ flex: 1, height: 4, background: 'var(--card-bg)', borderRadius: 2 }}>
                      <div style={{ width: '98.2%', height: '100%', background: '#10b981', borderRadius: 2 }}></div>
                    </div>
                  </div>
                </div>
                
                <div style={{ padding: 10, background: 'var(--card-bg)', borderRadius: 8, border: '1px solid var(--card-border)' }}>
                  <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>Active Shift Output</span>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-primary)', marginTop: 4 }}>
                    {dashboardData ? dashboardData.metrics.total_dispatched : 0} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>OK</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ padding: 10, background: 'var(--card-bg)', borderRadius: 8, border: '1px solid var(--card-border)' }}>
                  <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>Vetting Speed</span>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginTop: 4 }}>
                    ⚡ Fast <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 500 }}>(&lt;1.2m/step)</span>
                  </div>
                </div>
                
                <div style={{ padding: 10, background: 'var(--card-bg)', borderRadius: 8, border: '1px solid var(--card-border)' }}>
                  <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>Operator Stations</span>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#38bdf8', marginTop: 4 }}>
                    {engineers.length} Active / Online
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Recent Activities Feed Widget */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
              <History size={14} /> Live Line Activity Log
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, fontSize: '0.72rem', background: 'var(--card-bg)', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--card-border)' }}>
                <span style={{ fontFamily: 'monospace', color: 'var(--color-primary)' }}>ESRP2P5918E26128R0100</span>
                <span style={{ fontSize: '0.62rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>QC PASS</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, fontSize: '0.72rem', background: 'var(--card-bg)', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--card-border)' }}>
                <span style={{ fontFamily: 'monospace', color: 'var(--color-primary)' }}>ESRP2P5919E26128R0382</span>
                <span style={{ fontSize: '0.62rem', color: 'var(--color-primary)', background: 'rgba(255, 212, 0, 0.1)', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>REWORKED</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Factory Lot Filter & Shop Floor Pipeline Queue */}
        <div className="glass-panel" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Lot Filter Dropdown */}
          <div>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 12, color: 'var(--color-primary)' }}>Visual Filter</h3>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Filter Dashboard by Lot</label>
              <select value={lotFilter} onChange={(e) => setLotFilter(e.target.value)}>
                <option value="">All Lots (Global Factory View)</option>
                <option value="17">Lot 17 (DX128 • P5.9)</option>
                <option value="18">Lot 18 (DX128 • P5.9)</option>
                <option value="19">Lot 19 (DX128 • P5.9)</option>
                <option value="20">Lot 20 (DX109 • P5.9)</option>
              </select>
            </div>
          </div>

          {/* Step-wise Pending Tracker List */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-primary)' }}>
              <TrendingUp size={16} />
              Step-wise Pending Panels
            </h3>
            <div className="pipeline-list" style={{ flex: 1, overflowY: 'auto', maxHeight: '420px', paddingRight: 4 }}>
              {dashboardData?.pipeline.map((step) => (
                <div 
                  key={step.step_no} 
                  className={`pipeline-step ${step.count > 10 ? 'active-step' : ''}`}
                  onClick={() => {
                    if (step.count > 0) {
                      setView('repair');
                      setBarcodeSearch(step.step_no === 12 ? 'ESRP2P5918E26128R0100' : 'ESRP2P5919E26128R0382');
                      showToast(`Pre-filling serial search for Step ${step.step_no}!`);
                    }
                  }}
                  style={{ cursor: step.count > 0 ? 'pointer' : 'default' }}
                >
                  <div className="step-info">
                    <span className="step-number">{step.step_no}</span>
                    <span className="step-name">{step.step_name}</span>
                  </div>
                  <span className="step-count" style={{
                    color: step.count > 10 ? '#fff' : step.count > 0 ? 'var(--color-primary)' : '#475569',
                    background: step.count > 10 ? '#ef4444' : 'rgba(255,255,255,0.03)'
                  }}>
                    {step.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
