import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  Wrench, 
  Trophy, 
  User, 
  Calendar, 
  Plus, 
  RefreshCw, 
  ArrowRight, 
  Check, 
  X, 
  AlertTriangle, 
  Search, 
  Maximize2, 
  Minimize2, 
  CheckCircle,
  Truck,
  TrendingUp,
  AlertCircle,
  LogOut,
  Lock,
  ShieldCheck,
  History,
  Download,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { useAuth } from './context/AuthContext';

const STEP_NAMES = [
  "Panel Assign",
  "Repair Aging",
  "Panel Opening",
  "Silicon Removing",
  "IC Removing",
  "IC Cleaning",
  "IC Replacing",
  "Debugging",
  "1st Aging",
  "Applying Silicon",
  "Half Fitting",
  "Mesh Fitting",
  "QC",
  "Dispatch"
];

function App() {
  const { user, login, logout, apiFetch } = useAuth();
  
  // Tab view states
  const [view, setView] = useState('dashboard');
  const [fullscreen, setFullscreen] = useState(false);
  
  // Login Form States
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  
  // Data states
  const [engineers, setEngineers] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [stockData, setStockData] = useState([]);
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [approvalsData, setApprovalsData] = useState([]);
  const [clientsList, setClientsList] = useState([]);
  
  // Interactive filters & selections
  const [lotFilter, setLotFilter] = useState('');
  
  // Pagination State for Lots Table (5 items per page)
  const [currentStockPage, setCurrentStockPage] = useState(1);
  const lotsPerPage = 5;

  // History Modal States
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedLotHistory, setSelectedLotHistory] = useState(null);
  const [historyLotNo, setHistoryLotNo] = useState('');

  // Rejection/Feedback Modal States
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingLogId, setRejectingLogId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Create Lot form state
  const [showInwardForm, setShowInwardForm] = useState(false);
  const [newLot, setNewLot] = useState({
    lot_no: '',
    batch_no: '',
    pixel_pitch: 'P5.9',
    client_name: 'Xtreme Media Pvt. Ltd.',
    qty_sent: '',
    qty_received: '',
    remarks: ''
  });
  const [managerSignOff, setManagerSignOff] = useState(false);

  // Stock Filtering States
  const [stockSearchQuery, setStockSearchQuery] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateStartFilter, setDateStartFilter] = useState('');
  const [dateEndFilter, setDateEndFilter] = useState('');

  // Stock Outward Modal Form State
  const [showOutwardModal, setShowOutwardModal] = useState(false);
  const [outwardForm, setOutwardForm] = useState({
    lot_id: '',
    qty: '',
    remarks: ''
  });

  // Stock Return Modal Form State
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnForm, setReturnForm] = useState({
    lot_id: '',
    qty: '',
    reason: 'Solder Defect',
    remarks: ''
  });

  // Stock Redispatch Modal Form State
  const [showRedispatchModal, setShowRedispatchModal] = useState(false);
  const [redispatchForm, setRedispatchForm] = useState({
    lot_id: '',
    qty: '',
    remarks: ''
  });

  // Stock Transaction History Audit Modal State
  const [showTransactionsModal, setShowTransactionsModal] = useState(false);
  const [selectedLotTransactions, setSelectedLotTransactions] = useState([]);
  const [transactionsLotNo, setTransactionsLotNo] = useState('');

  // Repair Terminal States
  const [barcodeSearch, setBarcodeSearch] = useState('');
  const [searchedPanel, setSearchedPanel] = useState(null);
  const [searchError, setSearchError] = useState('');
  
  // Assign new panel state
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [assignForm, setAssignForm] = useState({
    lot_no: '',
    sr_no: '',
    side: 'Left',
    assigned_engineer_id: ''
  });
  
  // Repair Action state
  const [repairAction, setRepairAction] = useState({
    status: 'OK',
    remark: ''
  });

  // Global Notification
  const [notification, setNotification] = useState(null);

  // Set default view depending on user role
  useEffect(() => {
    if (user) {
      if (user.role === 'Employee') {
        setView('repair');
      } else {
        setView('dashboard');
      }
      
      // Load initial datasets
      fetchEngineers();
      fetchDashboard();
      fetchStock();
      fetchLeaderboard();
      fetchApprovals();
      fetchClients();
    }
  }, [user]);

  // Poll active data occasionally for real-time visual-board tracking
  useEffect(() => {
    if (!user) return;
    const timer = setInterval(() => {
      fetchDashboard();
      fetchApprovals();
    }, 15000);
    return () => clearInterval(timer);
  }, [user, lotFilter]);

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

  const fetchStock = async () => {
    try {
      let queryParams = [];
      if (stockSearchQuery) queryParams.push(`search=${encodeURIComponent(stockSearchQuery)}`);
      if (clientFilter) queryParams.push(`client_id=${clientFilter}`);
      if (statusFilter) queryParams.push(`status=${statusFilter}`);
      if (dateStartFilter) queryParams.push(`start_date=${dateStartFilter}`);
      if (dateEndFilter) queryParams.push(`end_date=${dateEndFilter}`);
      
      const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
      const res = await apiFetch(`/api/stock${queryString}`);
      if (res.ok) {
        const data = await res.json();
        setStockData(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await apiFetch('/api/stock/clients');
      if (res.ok) {
        const data = await res.json();
        setClientsList(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Re-fetch stock when filters change
  useEffect(() => {
    if (user) {
      fetchStock();
    }
  }, [stockSearchQuery, clientFilter, statusFilter, dateStartFilter, dateEndFilter]);

  const fetchLeaderboard = async () => {
    try {
      const res = await apiFetch('/api/leaderboard');
      if (res.ok) {
        const data = await res.json();
        setLeaderboardData(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchApprovals = async () => {
    try {
      if (!user || user.role === 'Employee') return;
      const res = await apiFetch('/api/approvals');
      if (res.ok) {
        const data = await res.json();
        setApprovalsData(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Auth handler
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      await login(loginEmail, loginPassword);
      showToast('Logged in successfully!');
    } catch (err) {
      setLoginError(err.message || 'Invalid credentials or connection failure.');
    } finally {
      setLoginLoading(false);
    }
  };

  // Handle new lot inward submit
  const handleInwardSubmit = async (e) => {
    e.preventDefault();

    const qtySent = parseInt(newLot.qty_sent);
    const qtyRecv = parseInt(newLot.qty_received);
    const hasDiscrepancy = qtySent !== qtyRecv;

    // Discrepancy block for Team Leads
    if (hasDiscrepancy && !['Superadmin', 'Manager'].includes(user.role)) {
      showToast('Manager or Superadmin privilege is required to sign off on discrepancies.', 'danger');
      return;
    }

    // Discrepancy sign-off requirement for Managers/Superadmins
    if (hasDiscrepancy && !managerSignOff) {
      showToast('You must confirm manager sign-off for this discrepancy.', 'warning');
      return;
    }

    try {
      const res = await apiFetch('/api/stock/inward', {
        method: 'POST',
        body: JSON.stringify({
          lot_no: parseInt(newLot.lot_no),
          batch_no: newLot.batch_no,
          pixel_pitch: newLot.pixel_pitch,
          client_name: newLot.client_name,
          qty_sent: qtySent,
          qty_received: qtyRecv,
          remarks: newLot.remarks
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Inward Lot ${data.lot_no} recorded successfully!`);
        setShowInwardForm(false);
        setNewLot({
          lot_no: '',
          batch_no: '',
          pixel_pitch: 'P5.9',
          client_name: 'Xtreme Media Pvt. Ltd.',
          qty_sent: '',
          qty_received: '',
          remarks: ''
        });
        setManagerSignOff(false);
        fetchStock();
        fetchDashboard();
        fetchClients();
      } else {
        showToast(data.error || 'Failed to inward lot', 'danger');
      }
    } catch (err) {
      console.error(err);
      showToast('Error connecting to API', 'danger');
    }
  };

  const handleOutwardSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/stock/outward', {
        method: 'POST',
        body: JSON.stringify({
          lot_id: parseInt(outwardForm.lot_id),
          qty: parseInt(outwardForm.qty),
          remarks: outwardForm.remarks
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Outward dispatch of ${outwardForm.qty} recorded successfully!`);
        setShowOutwardModal(false);
        setOutwardForm({ lot_id: '', qty: '', remarks: '' });
        fetchStock();
        fetchDashboard();
      } else {
        showToast(data.error || 'Failed to record outward dispatch', 'danger');
      }
    } catch (err) {
      console.error(err);
      showToast('Error connecting to API', 'danger');
    }
  };

  const handleReturnSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/stock/return', {
        method: 'POST',
        body: JSON.stringify({
          lot_id: parseInt(returnForm.lot_id),
          qty: parseInt(returnForm.qty),
          reason: returnForm.reason,
          remarks: returnForm.remarks
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Return of ${returnForm.qty} recorded successfully!`);
        setShowReturnModal(false);
        setReturnForm({ lot_id: '', qty: '', reason: 'Solder Defect', remarks: '' });
        fetchStock();
        fetchDashboard();
      } else {
        showToast(data.error || 'Failed to record return', 'danger');
      }
    } catch (err) {
      console.error(err);
      showToast('Error connecting to API', 'danger');
    }
  };

  const handleRedispatchSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/stock/redispatch', {
        method: 'POST',
        body: JSON.stringify({
          lot_id: parseInt(redispatchForm.lot_id),
          qty: parseInt(redispatchForm.qty),
          remarks: redispatchForm.remarks
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Redispatch of ${redispatchForm.qty} recorded successfully!`);
        setShowRedispatchModal(false);
        setRedispatchForm({ lot_id: '', qty: '', remarks: '' });
        fetchStock();
        fetchDashboard();
      } else {
        showToast(data.error || 'Failed to record redispatch', 'danger');
      }
    } catch (err) {
      console.error(err);
      showToast('Error connecting to API', 'danger');
    }
  };

  const handleViewLotTransactions = async (lotId, lotNo) => {
    try {
      const res = await apiFetch(`/api/stock/transactions/${lotId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedLotTransactions(data);
        setTransactionsLotNo(lotNo);
        setShowTransactionsModal(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Search Panel
  const handlePanelSearch = async (e) => {
    if (e) e.preventDefault();
    if (!barcodeSearch.trim()) return;
    
    setSearchError('');
    setSearchedPanel(null);
    
    try {
      const res = await apiFetch(`/api/panels/search?barcode=${encodeURIComponent(barcodeSearch.trim())}`);
      const data = await res.json();
      if (res.ok) {
        setSearchedPanel(data);
      } else {
        setSearchError(data.error || 'Panel not found.');
      }
    } catch (err) {
      console.error(err);
      setSearchError('Error connecting to database.');
    }
  };

  // Register / Assign panel
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
        
        // Auto load newly created panel
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
        
        fetchDashboard();
        fetchStock();
      } else {
        showToast(data.error || 'Failed to assign panel', 'danger');
      }
    } catch (err) {
      console.error(err);
      showToast('Error connecting to API', 'danger');
    }
  };

  // Progress Panel to Next Step (Temporary Vetting logs)
  const handleRepairAction = async (e) => {
    e.preventDefault();
    if (!searchedPanel) return;

    try {
      const res = await apiFetch('/api/repair/next', {
        method: 'POST',
        body: JSON.stringify({
          panel_id: searchedPanel.panel.id,
          engineer_id: user.id, // Enforce active authenticated user context
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
        
        fetchDashboard();
        fetchStock();
        fetchLeaderboard();
        fetchApprovals();
      } else {
        showToast(data.error || 'Failed to update panel', 'danger');
      }
    } catch (err) {
      console.error(err);
      showToast('Error connecting to API', 'danger');
    }
  };

  // ==========================================
  // Approvals Processing Handlers
  // ==========================================

  const handleTLApprove = async (logId) => {
    try {
      const res = await apiFetch('/api/approvals/tl-approve', {
        method: 'POST',
        body: JSON.stringify({ pending_log_id: logId })
      });
      if (res.ok) {
        showToast('Task approved and advanced to Manager final review stage!');
        fetchApprovals();
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed Team Lead approval.', 'danger');
      }
    } catch (err) {
      console.error(err);
      showToast('Server connection error.', 'danger');
    }
  };

  const handleManagerApprove = async (logId) => {
    try {
      const res = await apiFetch('/api/approvals/manager-approve', {
        method: 'POST',
        body: JSON.stringify({ pending_log_id: logId })
      });
      if (res.ok) {
        showToast('Final clearance approved. Task committed to committed database!');
        fetchApprovals();
        fetchDashboard();
        fetchStock();
        fetchLeaderboard();
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed Manager final clearance.', 'danger');
      }
    } catch (err) {
      console.error(err);
      showToast('Server connection error.', 'danger');
    }
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectingLogId || !rejectionReason.trim()) return;

    try {
      const res = await apiFetch('/api/approvals/reject', {
        method: 'POST',
        body: JSON.stringify({
          pending_log_id: rejectingLogId,
          rejection_reason: rejectionReason
        })
      });
      if (res.ok) {
        showToast('Task rejected and sent back to Employee for rework.', 'warning');
        setShowRejectModal(false);
        setRejectingLogId(null);
        setRejectionReason('');
        fetchApprovals();
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to submit rejection.', 'danger');
      }
    } catch (err) {
      console.error(err);
      showToast('Server connection error.', 'danger');
    }
  };

  // ==========================================
  // Lot Status & Panel History Modals
  // ==========================================

  const handleToggleLotStatus = async (lotId) => {
    try {
      const res = await apiFetch(`/api/stock/toggle/${lotId}`, { method: 'POST' });
      if (res.ok) {
        showToast('Lot status toggled successfully!');
        fetchStock();
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to toggle status.', 'danger');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleViewLotHistory = async (lotId, lotNo) => {
    try {
      const res = await apiFetch(`/api/stock/history/${lotId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedLotHistory(data);
        setHistoryLotNo(lotNo);
        setShowHistoryModal(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ==========================================
  // Client-Side CSV Exporters
  // ==========================================

  const downloadCSV = (filename, headers, rows) => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(r => r.map(val => `"${String(val || '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportSingleLot = (lotNo, panels) => {
    const headers = ["Serial Number", "Barcode", "Side", "Status", "Current Step", "Assigned Operator"];
    const rows = panels.map(p => [p.sr_no, p.barcode, p.side, p.status, STEP_NAMES[p.current_step - 1], p.engineer_name || 'Unassigned']);
    downloadCSV(`ES_Lot_${lotNo}_Report.csv`, headers, rows);
    showToast(`Report downloaded for Lot ${lotNo}!`);
  };

  const exportAllLots = () => {
    const headers = ["Lot Number", "Batch Code", "Pixel Pitch", "Client", "Sent Quantity", "Received Quantity", "Dispatched", "Scrap", "Available", "Status"];
    const rows = stockData.map(l => [l.lot_no, l.batch_no, l.pixel_pitch, l.client_name, l.qty_sent, l.received_qty, l.dispatched_qty, l.return_qty, l.available, l.status]);
    downloadCSV(`ES_Cumulative_Lots_Report.csv`, headers, rows);
    showToast("Cumulative lots summary downloaded!");
  };

  // Paginated Stock index limits
  const indexOfLastLot = currentStockPage * lotsPerPage;
  const indexOfFirstLot = indexOfLastLot - lotsPerPage;
  const paginatedLots = stockData.slice(indexOfFirstLot, indexOfLastLot);
  const totalStockPages = Math.ceil(stockData.length / lotsPerPage);

  return (
    <div className="desktop-wrapper">
      {/* Visual Header for Desktop Users */}
      {!fullscreen && (
        <div style={{ position: 'absolute', top: 20, left: 30, maxWidth: 320, color: '#94a3b8' }}>
          <h2 style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 800, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#ffd400', boxShadow: '0 0 10px #ffd400' }}></span>
            Electrolyte Solutions
          </h2>
          <p style={{ fontSize: '0.8rem', lineHeight: 1.4 }}>
            Shop floor mobile terminal. Implements a **2-tier quality approval cycle** (Employee temporary logs, Team Lead approvals, Manager final commits). Paginated stocks, history audits, and dynamic CSV downloads.
          </p>
          <div style={{ marginTop: 16 }}>
            <button 
              onClick={() => setFullscreen(true)}
              className="btn btn-secondary" 
              style={{ padding: '8px 12px', fontSize: '0.75rem', width: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Maximize2 size={12} /> Full Screen View
            </button>
          </div>
        </div>
      )}

      {/* Primary Mobile Mock Phone Screen */}
      <div className={`phone-shell ${fullscreen ? 'full-width' : ''}`}>
        {/* Notch */}
        {!fullscreen && (
          <div className="notch"></div>
        )}
        
        {/* Fullscreen restore button */}
        {fullscreen && (
          <button 
            onClick={() => setFullscreen(false)}
            style={{ position: 'absolute', top: 20, right: 20, zIndex: 9999, background: 'rgba(30,41,59,0.6)', border: 'none', color: '#fff', padding: 8, borderRadius: '50%', cursor: 'pointer' }}
          >
            <Minimize2 size={18} />
          </button>
        )}

        {/* Global Toast */}
        {notification && (
          <div 
            className={`badge ${notification.type === 'danger' ? 'badge-danger' : notification.type === 'warning' ? 'badge-warning' : 'badge-success'}`}
            style={{
              position: 'absolute',
              top: fullscreen ? 20 : 40,
              left: 16,
              right: 16,
              zIndex: 9999,
              justifyContent: 'center',
              boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
              padding: '12px 16px',
              animation: 'pulse-danger 2s infinite'
            }}
          >
            <AlertCircle size={14} />
            {notification.message}
          </div>
        )}

        {/* Inner Phone Viewport */}
        <div className="phone-content">
          
          {/* USER IS NOT LOGGED IN: Render Premium Login View */}
          {!user ? (
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', padding: '20px 8px' }}>
              <div style={{ textAlign: 'center', marginBottom: 30 }}>
                <span className="app-subtitle" style={{ fontSize: '0.75rem' }}>Factory Portal</span>
                <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                  <Lock color="#ffd400" size={24} />
                  Security Guard
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 8 }}>
                  Please authenticate to access factory board tracking and operations terminal.
                </p>
              </div>

              <div className="glass-panel" style={{ padding: '24px 20px', borderColor: 'rgba(255, 212, 0, 0.25)' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 8 }}>Sign In</h3>
                
                <form onSubmit={handleLoginSubmit}>
                  {loginError && (
                    <div style={{ color: 'var(--color-danger)', fontSize: '0.75rem', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(239, 68, 68, 0.05)', padding: 8, borderRadius: 8 }}>
                      <AlertCircle size={14} /> {loginError}
                    </div>
                  )}

                  <div className="form-group">
                    <label>Corporate Email</label>
                    <input 
                      type="email" 
                      required 
                      placeholder="e.g. rahul.gupta@electrolytesoln.com"
                      value={loginEmail}
                      onChange={e => setLoginEmail(e.target.value)}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 20 }}>
                    <label>Password</label>
                    <input 
                      type="password" 
                      required 
                      placeholder="••••••••••••"
                      value={loginPassword}
                      onChange={e => setLoginPassword(e.target.value)}
                    />
                  </div>

                  <button type="submit" className="btn" disabled={loginLoading}>
                    {loginLoading ? 'Verifying Context...' : 'Authenticate'}
                  </button>
                </form>
              </div>

              {/* Login Helper Note */}
              <div style={{ marginTop: 24, padding: 12, background: 'rgba(255,255,255,0.02)', borderRadius: 12, fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                <div style={{ fontWeight: 800, color: '#ffd400', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}><Lock size={10} /> Operator Cheat Sheet:</div>
                - Team Lead Account: <span style={{ color: '#fff' }}>rahul.gupta@electrolytesoln.com</span> / <span style={{ color: '#fff' }}>Electrolyte2026!</span><br/>
                - Super Admin Account: <span style={{ color: '#fff' }}>superadmin@electrolytesoln.com</span> / <span style={{ color: '#fff' }}>Electrolyte2026!</span><br/>
                - Engineer Account: <span style={{ color: '#fff' }}>mayuri.s@electrolytesoln.com</span> / <span style={{ color: '#fff' }}>Electrolyte2026!</span>
              </div>
            </div>
          ) : (
            // USER IS LOGGED IN: Render Workspace
            <div>
              {/* Authenticated Operator Status Header */}
              <div className="glass-panel" style={{ padding: 12, marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderColor: 'rgba(16, 185, 129, 0.15)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ position: 'relative' }}>
                    <img 
                      src={user.avatar || "https://api.dicebear.com/7.x/adventurer/svg?seed=Operator"} 
                      alt="Operator avatar" 
                      className="leader-avatar"
                      style={{ width: 36, height: 36 }}
                    />
                    <span style={{ position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: '50%', background: '#ffd400', border: '2px solid #0b0f19' }}></span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Active Operator</span>
                    <h4 style={{ fontSize: '0.85rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4 }}>
                      {user.name} 
                      <span style={{ fontSize: '0.6rem', padding: '2px 6px', background: 'rgba(255,212,0,0.1)', color: '#ffd400', borderRadius: 4 }}>
                        {user.role}
                      </span>
                    </h4>
                  </div>
                </div>
                
                <button 
                  onClick={() => { logout(); showToast('Logged out successfully!'); }} 
                  style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', padding: '6px 10px', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.7rem' }}
                >
                  <LogOut size={12} /> Logout
                </button>
              </div>

              {/* VIEW: Dashboard */}
              {view === 'dashboard' && (
                <div>
                  <div className="app-header">
                    <div>
                      <span className="app-subtitle">Electrolyte Solutions</span>
                      <h1 className="app-title"><LayoutDashboard size={20} color="#ffd400" /> Dashboard</h1>
                    </div>
                    <button onClick={() => { fetchDashboard(); showToast("Visual board updated!"); }} style={{ background: 'none', border: 'none', color: '#ffd400', cursor: 'pointer' }}>
                      <RefreshCw size={18} />
                    </button>
                  </div>

                  {/* Lot Filter Dropdown */}
                  <div className="form-group" style={{ marginBottom: 20 }}>
                    <label>Filter Dashboard by Lot</label>
                    <select value={lotFilter} onChange={(e) => setLotFilter(e.target.value)}>
                      <option value="">All Lots (Global Factory View)</option>
                      <option value="17">Lot 17 (DX128 • P5.9)</option>
                      <option value="18">Lot 18 (DX128 • P5.9)</option>
                      <option value="19">Lot 19 (DX128 • P5.9)</option>
                      <option value="20">Lot 20 (DX109 • P5.9)</option>
                    </select>
                  </div>

                  {/* Critical Alert Banners */}
                  {dashboardData?.alerts && dashboardData.alerts.length > 0 && (
                    <div className="alerts-section">
                      {dashboardData.alerts.map((alert, idx) => (
                        <div key={idx} className={`alert-card ${alert.type === 'discrepancy' ? '' : 'warning'}`}>
                          <AlertTriangle size={16} />
                          <div>{alert.message}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Cumulative KPI metrics */}
                  {dashboardData && (
                    <div className="metrics-grid">
                      <div className="metric-card glass-panel blue">
                        <span className="metric-label">Inward Lots</span>
                        <h3 className="metric-val">{dashboardData.metrics.total_lots}</h3>
                      </div>
                      <div className="metric-card glass-panel">
                        <span className="metric-label">Total Received</span>
                        <h3 className="metric-val">{dashboardData.metrics.total_received}</h3>
                      </div>
                      <div className="metric-card glass-panel warning">
                        <span className="metric-label">In Pipeline</span>
                        <h3 className="metric-val">{dashboardData.metrics.total_pending}</h3>
                      </div>
                      <div className="metric-card glass-panel success">
                        <span className="metric-label">Dispatched OK</span>
                        <h3 className="metric-val">{dashboardData.metrics.total_dispatched}</h3>
                      </div>
                    </div>
                  )}

                  {/* Step-wise Pending Tracker List */}
                  <div className="glass-panel" style={{ padding: 16, marginBottom: 20 }}>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <TrendingUp size={16} color="#ffd400" />
                      Step-wise Pending Panels
                    </h3>
                    <div className="pipeline-list">
                      {dashboardData?.pipeline.map((step) => (
                        <div 
                          key={step.step_no} 
                          className={`pipeline-step ${step.count > 10 ? 'active-step' : ''}`}
                          onClick={() => {
                            if (step.count > 0) {
                              setView('repair');
                              setBarcodeSearch(step.step_no === 14 ? 'ESRP2P5918E26128R0100' : 'ESRP2P5919E26128R0382');
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
                            color: step.count > 10 ? '#fff' : step.count > 0 ? '#ffd400' : '#475569',
                            background: step.count > 10 ? '#ef4444' : 'rgba(255,255,255,0.03)'
                          }}>
                            {step.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* VIEW: Stock/Inventory */}
              {view === 'stock' && (
                <div>
                  <div className="app-header">
                    <div>
                      <span className="app-subtitle">Inventory Management</span>
                      <h1 className="app-title"><Package size={20} color="#ffd400" /> Stock Summary</h1>
                    </div>
                    
                    {/* Header Action Grid */}
                    <div style={{ display: 'flex', gap: 8 }}>
                      {['Superadmin', 'Manager'].includes(user.role) && (
                        <button 
                          onClick={exportAllLots} 
                          className="badge badge-info"
                          style={{ cursor: 'pointer', background: '#38bdf8', color: '#000', border: 'none', padding: '6px 12px' }}
                        >
                          <Download size={12} /> Export All
                        </button>
                      )}
                      {['Superadmin', 'Manager', 'Team Lead'].includes(user.role) && (
                        <button 
                          onClick={() => setShowInwardForm(!showInwardForm)} 
                          className="badge badge-success"
                          style={{ cursor: 'pointer', background: '#ffd400', color: '#000', border: 'none', padding: '6px 12px' }}
                        >
                          <Plus size={12} /> Inward Lot
                        </button>
                      )}
                    </div>
                  </div>

                  {/* KPI cards - dynamically calculated from stockData */}
                  <div className="metrics-grid" style={{ marginBottom: 20 }}>
                    <div className="metric-card glass-panel blue">
                      <span className="metric-label">Total Lots</span>
                      <h3 className="metric-val">{stockData.length}</h3>
                    </div>
                    <div className="metric-card glass-panel">
                      <span className="metric-label">Total Received</span>
                      <h3 className="metric-val">{stockData.reduce((sum, l) => sum + l.received_qty, 0)}</h3>
                    </div>
                    <div className="metric-card glass-panel success">
                      <span className="metric-label">Dispatched OK</span>
                      <h3 className="metric-val">{stockData.reduce((sum, l) => sum + l.dispatched_qty, 0)}</h3>
                    </div>
                    <div className="metric-card glass-panel warning">
                      <span className="metric-label">Total Available</span>
                      <h3 className="metric-val" style={{ color: '#f59e0b' }}>
                        {stockData.reduce((sum, l) => sum + l.available, 0)}
                      </h3>
                    </div>
                  </div>

                  {/* Multi-Criteria Stock Search & Filters */}
                  <div className="glass-panel" style={{ padding: 16, marginBottom: 20 }}>
                    <h3 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 12 }}>Filter Stock Records</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input 
                          type="text" 
                          placeholder="Search lot number or batch code..." 
                          value={stockSearchQuery}
                          onChange={e => { setStockSearchQuery(e.target.value); setCurrentStockPage(1); }}
                          style={{ paddingLeft: 36 }}
                        />
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <select value={clientFilter} onChange={e => { setClientFilter(e.target.value); setCurrentStockPage(1); }}>
                            <option value="">All Clients</option>
                            {clientsList.map(c => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setCurrentStockPage(1); }}>
                            <option value="">All Statuses</option>
                            <option value="In Process">In Process</option>
                            <option value="Complete">Complete</option>
                          </select>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label style={{ fontSize: '0.65rem', marginBottom: 2 }}>From Date</label>
                          <input 
                            type="date" 
                            value={dateStartFilter} 
                            onChange={e => { setDateStartFilter(e.target.value); setCurrentStockPage(1); }} 
                          />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label style={{ fontSize: '0.65rem', marginBottom: 2 }}>To Date</label>
                          <input 
                            type="date" 
                            value={dateEndFilter} 
                            onChange={e => { setDateEndFilter(e.target.value); setCurrentStockPage(1); }} 
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Inward New Lot Form Drawer */}
                  {showInwardForm && (
                    <div className="glass-panel" style={{ padding: 16, marginBottom: 20, borderColor: '#ffd400' }}>
                      <h3 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: 12 }}>New Inward Lot Shipment</h3>
                      <form onSubmit={handleInwardSubmit}>
                        <div className="form-group">
                          <label>Lot Number</label>
                          <input 
                            type="number" 
                            required 
                            placeholder="e.g. 21" 
                            value={newLot.lot_no}
                            onChange={e => setNewLot({...newLot, lot_no: e.target.value})}
                          />
                        </div>
                        <div className="form-group">
                          <label>Batch Code</label>
                          <input 
                            type="text" 
                            required 
                            placeholder="e.g. DX128" 
                            value={newLot.batch_no}
                            onChange={e => setNewLot({...newLot, batch_no: e.target.value})}
                          />
                        </div>
                        <div className="form-group">
                          <label>Pixel Pitch</label>
                          <select 
                            value={newLot.pixel_pitch}
                            onChange={e => setNewLot({...newLot, pixel_pitch: e.target.value})}
                          >
                            <option value="P5.9">P5.9</option>
                            <option value="P3.9">P3.9</option>
                            <option value="P2.6">P2.6</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label>Client Name</label>
                          <input 
                            type="text" 
                            required 
                            value={newLot.client_name}
                            onChange={e => setNewLot({...newLot, client_name: e.target.value})}
                          />
                        </div>
                        <div className="metrics-grid" style={{ marginBottom: 0 }}>
                          <div className="form-group">
                            <label>Client Qty Sent (Expected)</label>
                            <input 
                              type="number" 
                              required 
                              placeholder="e.g. 500" 
                              value={newLot.qty_sent}
                              onChange={e => setNewLot({...newLot, qty_sent: e.target.value})}
                            />
                          </div>
                          <div className="form-group">
                            <label>Actual Qty Recv (Inward)</label>
                            <input 
                              type="number" 
                              required 
                              placeholder="e.g. 498" 
                              value={newLot.qty_received}
                              onChange={e => setNewLot({...newLot, qty_received: e.target.value})}
                            />
                          </div>
                        </div>

                        {/* GRN Discrepancy Warnings & Sign-offs */}
                        {newLot.qty_sent && newLot.qty_received && parseInt(newLot.qty_sent) !== parseInt(newLot.qty_received) && (
                          <div className="glass-panel" style={{ padding: 12, marginBottom: 16, borderColor: '#ef4444', background: 'rgba(239, 68, 68, 0.05)' }}>
                            <div style={{ color: '#fca5a5', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, marginBottom: 6 }}>
                              <AlertTriangle size={14} color="#ef4444" /> GRN DISCREPANCY DETECTED
                            </div>
                            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.4, marginBottom: 8 }}>
                              The actual received quantity ({newLot.qty_received}) differs from expected ({newLot.qty_sent}) by {Math.abs(parseInt(newLot.qty_sent) - parseInt(newLot.qty_received))} units.
                            </p>
                            {!['Superadmin', 'Manager'].includes(user.role) ? (
                              <div style={{ color: '#f87171', fontSize: '0.7rem', fontWeight: 700 }}>
                                🚫 BLOCKER: You have Team Lead privileges. Discrepancy requires a Manager or Superadmin to inward.
                              </div>
                            ) : (
                              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem', cursor: 'pointer', color: '#fff', fontWeight: 600 }}>
                                <input 
                                  type="checkbox" 
                                  checked={managerSignOff} 
                                  onChange={e => setManagerSignOff(e.target.checked)} 
                                  style={{ width: 'auto' }}
                                />
                                I confirm Manager sign-off for this discrepancy.
                              </label>
                            )}
                          </div>
                        )}

                        <div className="form-group">
                          <label>Remarks</label>
                          <textarea 
                            rows="2" 
                            placeholder="e.g. Discrepancy checked. Box packing undamaged."
                            value={newLot.remarks}
                            onChange={e => setNewLot({...newLot, remarks: e.target.value})}
                          />
                        </div>
                        <div className="metrics-grid">
                          <button 
                            type="submit" 
                            className="btn" 
                            disabled={newLot.qty_sent && newLot.qty_received && parseInt(newLot.qty_sent) !== parseInt(newLot.qty_received) && (!['Superadmin', 'Manager'].includes(user.role) || !managerSignOff)}
                          >
                            Save Inward
                          </button>
                          <button type="button" onClick={() => { setShowInwardForm(false); setManagerSignOff(false); }} className="btn btn-secondary">Cancel</button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Lots Summary Card List (Paginated, showing 5 per page) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {paginatedLots.length === 0 ? (
                      <div className="glass-panel" style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        No lots match the active filter criteria.
                      </div>
                    ) : paginatedLots.map(lot => {
                      const shortage = lot.qty_sent - lot.received_qty;
                      const isComplete = lot.status === 'Complete';
                      return (
                        <div key={lot.id} className="glass-panel" style={{ padding: 16, borderColor: isComplete ? 'rgba(16, 185, 129, 0.25)' : 'rgba(245, 158, 11, 0.2)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                            <div>
                              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Client: {lot.client_name}</span>
                              <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Lot {lot.lot_no} <span style={{ color: '#475569', fontSize: '0.85rem' }}>({lot.batch_no} • {lot.pixel_pitch})</span></h3>
                            </div>
                            
                            {/* Lot Action Toolbar */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <button 
                                onClick={() => handleViewLotTransactions(lot.id, lot.lot_no)}
                                style={{ background: 'none', border: 'none', color: '#ffd400', cursor: 'pointer', padding: 4 }}
                                title="View Audit Trail Logs"
                              >
                                <History size={16} />
                              </button>
                              
                              {['Superadmin', 'Manager'].includes(user.role) && (
                                <button 
                                  onClick={async () => {
                                    const res = await apiFetch(`/api/stock/history/${lot.id}`);
                                    if (res.ok) {
                                      const data = await res.json();
                                      exportSingleLot(lot.lot_no, data);
                                    }
                                  }}
                                  style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', padding: 4 }}
                                  title="Export Lot Panels CSV"
                                >
                                  <Download size={16} />
                                </button>
                              )}

                              {['Superadmin', 'Manager'].includes(user.role) && (
                                <button 
                                  onClick={() => handleToggleLotStatus(lot.id)}
                                  style={{ 
                                    background: 'none', 
                                    border: 'none', 
                                    color: isComplete ? '#ffd400' : '#475569', 
                                    cursor: (isComplete && user.role !== 'Superadmin') ? 'not-allowed' : 'pointer',
                                    padding: 4 
                                  }}
                                  disabled={isComplete && user.role !== 'Superadmin'}
                                  title={isComplete ? "Lock status (Only Superadmin can unlock)" : "Toggle Complete status"}
                                >
                                  {isComplete ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                                </button>
                              )}

                              <span className={`badge ${isComplete ? 'badge-success' : 'badge-warning'}`}>
                                {lot.status}
                              </span>
                            </div>
                          </div>
                          
                          {/* Shortage Discrepancy Highlight */}
                          {shortage !== 0 && (
                            <div className="badge badge-danger" style={{ display: 'flex', width: '100%', marginBottom: 12, justifyContent: 'center', background: 'rgba(239,68,68,0.1)', color: '#fca5a5', border: '0.5px solid rgba(239,68,68,0.2)' }}>
                              <AlertTriangle size={12} /> Discrepancy: {shortage > 0 ? `${shortage} units Shortage` : `${Math.abs(shortage)} units Excess`} (Expected: {lot.qty_sent} vs Inward: {lot.received_qty})
                            </div>
                          )}

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4, fontSize: '0.75rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', padding: 10, borderRadius: 8, marginBottom: 12 }}>
                            <div>
                              <div style={{ color: 'var(--text-muted)', fontSize: '0.58rem', textTransform: 'uppercase' }}>Inward</div>
                              <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#fff' }}>{lot.received_qty}</div>
                            </div>
                            <div>
                              <div style={{ color: 'var(--text-muted)', fontSize: '0.58rem', textTransform: 'uppercase' }}>Outward</div>
                              <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#10b981' }}>{lot.dispatched_qty}</div>
                            </div>
                            <div>
                              <div style={{ color: 'var(--text-muted)', fontSize: '0.58rem', textTransform: 'uppercase' }}>Return</div>
                              <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#f87171' }}>{lot.return_qty}</div>
                            </div>
                            <div>
                              <div style={{ color: 'var(--text-muted)', fontSize: '0.58rem', textTransform: 'uppercase' }}>Redispatch</div>
                              <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#60a5fa' }}>{lot.redispatch_qty}</div>
                            </div>
                            <div>
                              <div style={{ color: 'var(--text-muted)', fontSize: '0.58rem', textTransform: 'uppercase' }}>Available</div>
                              <div style={{ fontWeight: 800, fontSize: '0.9rem', color: lot.available > 0 ? '#ffd400' : '#64748b' }}>{lot.available}</div>
                            </div>
                          </div>

                          {/* Quick Action Transaction Toolbar for Active Lots */}
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button 
                              disabled={isComplete && user.role !== 'Superadmin'}
                              onClick={() => {
                                setOutwardForm({ lot_id: lot.id, qty: '', remarks: '' });
                                setShowOutwardModal(true);
                              }}
                              className="btn"
                              style={{ 
                                flex: 1, 
                                margin: 0, 
                                padding: '6px 8px', 
                                fontSize: '0.72rem', 
                                background: 'rgba(16, 185, 129, 0.1)', 
                                border: '1px solid rgba(16, 185, 129, 0.25)', 
                                color: '#10b981',
                                cursor: (isComplete && user.role !== 'Superadmin') ? 'not-allowed' : 'pointer',
                                opacity: (isComplete && user.role !== 'Superadmin') ? 0.3 : 1
                              }}
                            >
                              Dispatch Out
                            </button>
                            <button 
                              disabled={isComplete && user.role !== 'Superadmin'}
                              onClick={() => {
                                setReturnForm({ lot_id: lot.id, qty: '', reason: 'Solder Defect', remarks: '' });
                                setShowReturnModal(true);
                              }}
                              className="btn"
                              style={{ 
                                flex: 1, 
                                margin: 0, 
                                padding: '6px 8px', 
                                fontSize: '0.72rem', 
                                background: 'rgba(239, 68, 68, 0.1)', 
                                border: '1px solid rgba(239, 68, 68, 0.25)', 
                                color: '#ef4444',
                                cursor: (isComplete && user.role !== 'Superadmin') ? 'not-allowed' : 'pointer',
                                opacity: (isComplete && user.role !== 'Superadmin') ? 0.3 : 1
                              }}
                            >
                              Log Return
                            </button>
                            <button 
                              disabled={isComplete && user.role !== 'Superadmin'}
                              onClick={() => {
                                setRedispatchForm({ lot_id: lot.id, qty: '', remarks: '' });
                                setShowRedispatchModal(true);
                              }}
                              className="btn"
                              style={{ 
                                flex: 1, 
                                margin: 0, 
                                padding: '6px 8px', 
                                fontSize: '0.72rem', 
                                background: 'rgba(59, 130, 246, 0.1)', 
                                border: '1px solid rgba(59, 130, 246, 0.25)', 
                                color: '#3b82f6',
                                cursor: (isComplete && user.role !== 'Superadmin') ? 'not-allowed' : 'pointer',
                                opacity: (isComplete && user.role !== 'Superadmin') ? 0.3 : 1
                              }}
                            >
                              Redispatch
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>


                  {/* Stock List Pagination Controls */}
                  {totalStockPages > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, background: 'rgba(255,255,255,0.02)', padding: 10, borderRadius: 12 }}>
                      <button 
                        onClick={() => setCurrentStockPage(prev => Math.max(prev - 1, 1))} 
                        disabled={currentStockPage === 1}
                        className="btn btn-secondary"
                        style={{ width: 'auto', padding: '6px 12px', fontSize: '0.75rem', margin: 0 }}
                      >
                        Prev
                      </button>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Page {currentStockPage} of {totalStockPages}</span>
                      <button 
                        onClick={() => setCurrentStockPage(prev => Math.min(prev + 1, totalStockPages))} 
                        disabled={currentStockPage === totalStockPages}
                        className="btn btn-secondary"
                        style={{ width: 'auto', padding: '6px 12px', fontSize: '0.75rem', margin: 0 }}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* VIEW: Repair Terminal */}
              {view === 'repair' && (
                <div>
                  <div className="app-header">
                    <div>
                      <span className="app-subtitle">Operations Terminal</span>
                      <h1 className="app-title"><Wrench size={20} color="#ffd400" /> Repair Station</h1>
                    </div>
                    
                    {/* Only Superadmin, Manager, Team Lead can assign panels */}
                    {['Superadmin', 'Manager', 'Team Lead'].includes(user.role) && (
                      <button 
                        onClick={() => setShowAssignForm(!showAssignForm)} 
                        className="badge badge-success"
                        style={{ cursor: 'pointer', background: '#ffd400', color: '#000', border: 'none', padding: '6px 12px' }}
                      >
                        <Plus size={14} /> Assign Panel
                      </button>
                    )}
                  </div>

                  {/* Assign Panel Form Drawer */}
                  {showAssignForm && (
                    <div className="glass-panel" style={{ padding: 16, marginBottom: 20, borderColor: '#ffd400' }}>
                      <h3 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: 12 }}>Step 1: Panel Assignment Form</h3>
                      <form onSubmit={handlePanelAssign}>
                        <div className="form-group">
                          <label>Select Lot</label>
                          <select 
                            required
                            value={assignForm.lot_no}
                            onChange={e => setAssignForm({...assignForm, lot_no: e.target.value})}
                          >
                            <option value="">-- Choose Active Lot --</option>
                            <option value="18">Lot 18 (Batch DX128 • P5.9)</option>
                            <option value="19">Lot 19 (Batch DX128 • P5.9)</option>
                            <option value="20">Lot 20 (Batch DX109 • P5.9)</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label>Serial Number (Sr No)</label>
                          <input 
                            type="number" 
                            required 
                            placeholder="e.g. 385" 
                            value={assignForm.sr_no}
                            onChange={e => setAssignForm({...assignForm, sr_no: e.target.value})}
                          />
                        </div>
                        <div className="form-group">
                          <label>Panel Side</label>
                          <select 
                            value={assignForm.side}
                            onChange={e => setAssignForm({...assignForm, side: e.target.value})}
                          >
                            <option value="Left">Left Side</option>
                            <option value="Right">Right Side</option>
                          </select>
                        </div>

                        <div className="form-group">
                          <label>Assign to Worker</label>
                          <select 
                            value={assignForm.assigned_engineer_id}
                            onChange={e => setAssignForm({...assignForm, assigned_engineer_id: parseInt(e.target.value)})}
                          >
                            {engineers.map(eng => (
                              <option key={eng.id} value={eng.id}>{eng.name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="badge badge-info" style={{ display: 'flex', width: '100%', marginBottom: 12, justifyContent: 'center', fontSize: '0.7rem' }}>
                          * Barcode will be auto-generated according to strict Electrolyte standard ESRP2 format.
                        </div>
                        <div className="metrics-grid">
                          <button type="submit" className="btn">Assign Panel</button>
                          <button type="button" onClick={() => setShowAssignForm(false)} className="btn btn-secondary">Cancel</button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Panel Search Input */}
                  <div className="glass-panel" style={{ padding: 16, marginBottom: 20 }}>
                    <h3 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 8 }}>Find Panel by Barcode</h3>
                    <form onSubmit={handlePanelSearch} style={{ display: 'flex', gap: 8 }}>
                      <div style={{ position: 'relative', flex: 1 }}>
                        <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input 
                          type="text" 
                          placeholder="Scan/Enter barcode or Sr No" 
                          value={barcodeSearch}
                          onChange={e => setBarcodeSearch(e.target.value)}
                          style={{ paddingLeft: 36 }}
                        />
                      </div>
                      <button type="submit" className="btn" style={{ width: 'auto', marginTop: 0, padding: '10px 16px' }}>Find</button>
                    </form>
                    <div style={{ marginTop: 8, fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      * Try pre-filled Lot 18 dispatch barcodes, e.g. <span style={{ color: '#ffd400', textDecoration: 'underline', cursor: 'pointer' }} onClick={() => { setBarcodeSearch('ESRP2P5918E26128R0100'); }}>ESRP2P5918E26128R0100</span> or Lot 19 barcode <span style={{ color: '#ffd400', textDecoration: 'underline', cursor: 'pointer' }} onClick={() => { setBarcodeSearch('ESRP2P5919E26128R0382'); }}>ESRP2P5919E26128R0382</span>.
                    </div>
                    {searchError && (
                      <div style={{ color: 'var(--color-danger)', fontSize: '0.75rem', marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <AlertCircle size={12} /> {searchError}
                      </div>
                    )}
                  </div>

                  {/* Searched Panel Workspace */}
                  {searchedPanel && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {/* Active Quality-Vetting Locks & Warnings */}
                      {searchedPanel.is_locked && (
                        <div className="alert-card warning" style={{ display: 'flex', width: '100%', justifyContent: 'center', fontSize: '0.78rem', animation: 'pulse-danger 2s infinite' }}>
                          <Lock size={14} /> 🔒 AWAITING QUALITY CLEARANCE: ({searchedPanel.pending_info.approval_status}) by {searchedPanel.pending_info.engineer_name}.
                        </div>
                      )}

                      {searchedPanel.rework_info && (
                        <div className="alert-card" style={{ display: 'flex', width: '100%', justifyContent: 'center', fontSize: '0.78rem', background: 'rgba(239,68,68,0.15)', border: '1px solid #ef4444', color: '#fca5a5' }}>
                          <AlertTriangle size={14} /> ⚠️ REWORK REQUESTED: Previous log was rejected. Feedback: "{searchedPanel.rework_info.rejection_reason}".
                        </div>
                      )}

                      {/* Panel Metadata Card */}
                      <div className="glass-panel" style={{ padding: 16 }}>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>REFURBISHMENT INFORMATION</span>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: 4, color: searchedPanel.panel.status === 'Scrap' ? '#ef4444' : '#fff' }}>
                          {searchedPanel.panel.barcode}
                        </h2>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginTop: 12, fontSize: '0.8rem' }}>
                          <div>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>LOT NO</span>
                            <div style={{ fontWeight: 700 }}>Lot {searchedPanel.panel.lot_no}</div>
                          </div>
                          <div>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>BATCH & PITCH</span>
                            <div style={{ fontWeight: 700 }}>{searchedPanel.panel.batch_no} • {searchedPanel.panel.pixel_pitch}</div>
                          </div>
                          <div>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>SERIAL & SIDE</span>
                            <div style={{ fontWeight: 700 }}>Sr No {searchedPanel.panel.sr_no} ({searchedPanel.panel.side} Side)</div>
                          </div>
                          <div>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>ASSIGNED TO</span>
                            <div style={{ fontWeight: 700, color: '#ffd400' }}>{searchedPanel.panel.engineer_name || "Unassigned"}</div>
                          </div>
                          <div>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>CURRENT PIPELINE STEP</span>
                            <div style={{ fontWeight: 800, color: '#ffd400' }}>
                              {searchedPanel.panel.status === 'Scrap' ? 'SCRAP' : `Step ${searchedPanel.panel.current_step} OF 14`}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Step Action Form (Toggled depending on lock state and assignment) */}
                      {searchedPanel.panel.status !== 'Scrap' && searchedPanel.panel.current_step < 14 && (
                        <div className="glass-panel" style={{ padding: 16, borderColor: searchedPanel.is_locked ? 'rgba(255,255,255,0.05)' : 'rgba(16, 185, 129, 0.25)' }}>
                          <h3 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: 12, color: searchedPanel.is_locked ? '#475569' : '#ffd400', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <CheckCircle size={16} />
                            Progress step: {STEP_NAMES[searchedPanel.panel.current_step - 1]}
                          </h3>
                          
                          <form onSubmit={handleRepairAction}>
                            <div className="form-group">
                              <label style={{ color: searchedPanel.is_locked ? '#475569' : 'var(--text-muted)' }}>Work/Inspection Verdict</label>
                              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                                <button 
                                  type="button" 
                                  disabled={searchedPanel.is_locked}
                                  onClick={() => setRepairAction({...repairAction, status: 'OK'})}
                                  className={`btn ${repairAction.status === 'OK' ? '' : 'btn-secondary'}`}
                                  style={{ flex: 1, padding: 8, margin: 0, opacity: searchedPanel.is_locked ? 0.3 : 1 }}
                                >
                                  <Check size={14} /> OK (Pass)
                                </button>
                                <button 
                                  type="button" 
                                  disabled={searchedPanel.is_locked}
                                  onClick={() => setRepairAction({...repairAction, status: 'Faulty'})}
                                  className={`btn ${repairAction.status === 'Faulty' ? 'btn-warning' : 'btn-secondary'}`}
                                  style={{ flex: 1, padding: 8, margin: 0, background: repairAction.status === 'Faulty' ? '#f59e0b' : 'rgba(255,255,255,0.05)', color: '#fff', opacity: searchedPanel.is_locked ? 0.3 : 1 }}
                                >
                                  <AlertCircle size={14} /> Faulty (Rework)
                                </button>
                                <button 
                                  type="button" 
                                  disabled={searchedPanel.is_locked}
                                  onClick={() => setRepairAction({...repairAction, status: 'Scrap'})}
                                  className={`btn ${repairAction.status === 'Scrap' ? 'btn-danger' : 'btn-secondary'}`}
                                  style={{ flex: 1, padding: 8, margin: 0, background: repairAction.status === 'Scrap' ? '#ef4444' : 'rgba(255,255,255,0.05)', color: '#fff', opacity: searchedPanel.is_locked ? 0.3 : 1 }}
                                >
                                  <X size={14} /> Scrap (Non-Rep)
                                </button>
                              </div>
                            </div>

                            <div className="form-group">
                              <label style={{ color: searchedPanel.is_locked ? '#475569' : 'var(--text-muted)' }}>Remarks / Log Note</label>
                              <textarea 
                                rows="2" 
                                disabled={searchedPanel.is_locked}
                                required={repairAction.status === 'Scrap' || repairAction.status === 'Faulty'}
                                placeholder={repairAction.status === 'Scrap' ? "Provide reason for scrap classification..." : "Enter technical observations (e.g. solder touch-up, IC replaced)..."}
                                value={repairAction.remark}
                                onChange={e => setRepairAction({...repairAction, remark: e.target.value})}
                                style={{ opacity: searchedPanel.is_locked ? 0.3 : 1 }}
                              />
                            </div>

                            {/* Only the assigned engineer or managers/TL can submit work */}
                            {searchedPanel.is_locked ? (
                              <div style={{ color: 'var(--color-warning)', fontSize: '0.75rem', marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Lock size={12} /> This panel is locked awaiting clearance approvals from Team Lead/Manager.
                              </div>
                            ) : (user.role !== 'Employee' || searchedPanel.panel.assigned_engineer_id === user.id) ? (
                              <button type="submit" className="btn">
                                Log Step Completion <ArrowRight size={14} />
                              </button>
                            ) : (
                              <div style={{ color: 'var(--color-danger)', fontSize: '0.75rem', marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <AlertTriangle size={14} /> You cannot update this panel because it is assigned to another engineer.
                              </div>
                            )}
                          </form>
                        </div>
                      )}

                      {/* Audit History Timeline Log */}
                      <div className="glass-panel" style={{ padding: 16 }}>
                        <h3 style={{ fontSize: '0.875rem', fontWeight: 800, marginBottom: 12 }}>Audit History Timeline Log</h3>
                        
                        {searchedPanel.activities.length === 0 ? (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            No committed logs for this panel (filtered by database Row-Level Security policies).
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'relative', paddingLeft: 12, borderLeft: '2px solid rgba(255,255,255,0.05)' }}>
                            {searchedPanel.activities.map((act, index) => (
                              <div key={act.id} style={{ position: 'relative' }}>
                                <span style={{ 
                                  position: 'absolute', 
                                  left: -20, 
                                  top: 4, 
                                  width: 12, 
                                  height: 12, 
                                  borderRadius: '50%', 
                                  background: act.status === 'Scrap' ? '#ef4444' : act.status === 'Faulty' ? '#f59e0b' : '#ffd400',
                                  boxShadow: act.status === 'OK' ? '0 0 8px #ffd400' : 'none'
                                }}></span>
                                
                                <div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h4 style={{ fontSize: '0.8rem', fontWeight: 700 }}>
                                      Step {act.step_no}: {act.step_name}
                                    </h4>
                                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                                      {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                  
                                  <p style={{ fontSize: '0.75rem', color: '#cbd5e1', marginTop: 2 }}>{act.remark}</p>
                                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', marginTop: 2 }}>
                                    Worker: {act.engineer_name || 'System / Auto'}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* VIEW: Approvals Dashboard (Visible to TL & Managers only) */}
              {view === 'approvals' && user.role !== 'Employee' && (
                <div>
                  <div className="app-header">
                    <div>
                      <span className="app-subtitle">Quality Clearance Queue</span>
                      <h1 className="app-title"><ShieldCheck size={20} color="#ffd400" /> Vetting Center</h1>
                    </div>
                    <button onClick={() => { fetchApprovals(); showToast("Approvals list updated!"); }} style={{ background: 'none', border: 'none', color: '#ffd400', cursor: 'pointer' }}>
                      <RefreshCw size={18} />
                    </button>
                  </div>

                  {approvalsData.length === 0 ? (
                    <div className="glass-panel" style={{ padding: 30, textAlign: 'center' }}>
                      <CheckCircle size={36} color="#ffd400" style={{ display: 'block', margin: '0 auto 12px auto' }} />
                      <h3 style={{ fontSize: '0.95rem', fontWeight: 800 }}>Clearance Queue Clear</h3>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 6 }}>
                        No pending shop floor logs are currently awaiting your verification approval.
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {approvalsData.map(log => (
                        <div key={log.id} className="glass-panel" style={{ padding: 16 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                            <div>
                              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>ENGINEER: {log.engineer_name}</span>
                              <h4 style={{ fontSize: '0.9rem', fontWeight: 800 }}>{log.barcode}</h4>
                            </div>
                            <span className={`badge ${log.status === 'OK' ? 'badge-success' : log.status === 'Faulty' ? 'badge-warning' : 'badge-danger'}`}>
                              {log.status === 'OK' ? 'Pass' : log.status === 'Faulty' ? 'Rework' : 'Scrap'}
                            </span>
                          </div>

                          <div style={{ padding: 10, background: 'rgba(255,255,255,0.02)', borderRadius: 8, fontSize: '0.78rem', marginBottom: 12 }}>
                            <div><strong>Step {log.step_no}:</strong> {log.step_name}</div>
                            {log.remark && <div style={{ fontStyle: 'italic', marginTop: 4 }}>"{log.remark}"</div>}
                            {log.team_lead_name && <div style={{ fontSize: '0.65rem', color: '#ffd400', marginTop: 4 }}>Approved by TL: {log.team_lead_name}</div>}
                          </div>

                          {/* Approval Actions */}
                          <div style={{ display: 'flex', gap: 8 }}>
                            {user.role === 'Team Lead' && log.approval_status === 'Pending Team Lead' && (
                              <button 
                                onClick={() => handleTLApprove(log.id)}
                                className="btn"
                                style={{ flex: 1, padding: 8, margin: 0, fontSize: '0.72rem' }}
                              >
                                TL Vetting OK
                              </button>
                            )}

                            {['Superadmin', 'Manager'].includes(user.role) && log.approval_status === 'Pending Manager' && (
                              <button 
                                onClick={() => handleManagerApprove(log.id)}
                                className="btn"
                                style={{ flex: 1, padding: 8, margin: 0, fontSize: '0.72rem', background: '#38bdf8', color: '#000' }}
                              >
                                Final Commit
                              </button>
                            )}

                            <button 
                              onClick={() => {
                                setRejectingLogId(log.id);
                                setShowRejectModal(true);
                              }}
                              className="btn btn-secondary"
                              style={{ flex: 0.6, padding: 8, margin: 0, fontSize: '0.72rem', borderColor: 'rgba(239, 68, 68, 0.4)', color: '#ef4444' }}
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* VIEW: Leaderboard */}
              {view === 'leaderboard' && (
                <div>
                  <div className="app-header">
                    <div>
                      <span className="app-subtitle">Live Performer Scores</span>
                      <h1 className="app-title"><Trophy size={20} color="#ffd400" /> Leaderboard</h1>
                    </div>
                    <button onClick={() => { fetchLeaderboard(); showToast("Leaderboard recalculated!"); }} style={{ background: 'none', border: 'none', color: '#ffd400', cursor: 'pointer' }}>
                      <RefreshCw size={18} />
                    </button>
                  </div>

                  {/* Monthly Top 3 Podiums */}
                  {leaderboardData.length >= 3 && (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 10, margin: '20px 0 30px 0', height: 160, background: 'rgba(255,255,255,0.01)', borderRadius: 16, padding: 10 }}>
                      
                      {/* Rank 2 (Silver) */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                        <img src={leaderboardData[1].avatar} alt="" style={{ width: 44, height: 44, borderRadius: '50%', border: '2px solid #64748b' }} />
                        <div className="leader-name" style={{ fontSize: '0.75rem', marginTop: 4, maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {leaderboardData[1].name.split(' ')[0]}
                        </div>
                        <div style={{ height: 60, width: '100%', background: 'linear-gradient(to top, rgba(100, 116, 139, 0.1) 0%, rgba(100, 116, 139, 0.4) 100%)', borderRadius: '8px 8px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1', fontWeight: 800, fontSize: '1.1rem' }}>
                          2
                        </div>
                      </div>

                      {/* Rank 1 (Gold) */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1.1 }}>
                        <div style={{ position: 'relative' }}>
                          <Trophy size={16} color="#f59e0b" style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)' }} />
                          <img src={leaderboardData[0].avatar} alt="" style={{ width: 54, height: 54, borderRadius: '50%', border: '2.5px solid #f59e0b', boxShadow: '0 0 15px rgba(245, 158, 11, 0.3)' }} />
                        </div>
                        <div className="leader-name" style={{ fontSize: '0.8rem', fontWeight: 800, marginTop: 4, maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {leaderboardData[0].name.split(' ')[0]}
                        </div>
                        <div style={{ height: 80, width: '100%', background: 'linear-gradient(to top, rgba(245, 158, 11, 0.1) 0%, rgba(245, 158, 11, 0.4) 100%)', borderRadius: '8px 8px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b', fontWeight: 800, fontSize: '1.3rem' }}>
                          1
                        </div>
                      </div>

                      {/* Rank 3 (Bronze) */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                        <img src={leaderboardData[2].avatar} alt="" style={{ width: 44, height: 44, borderRadius: '50%', border: '2px solid #b45309' }} />
                        <div className="leader-name" style={{ fontSize: '0.75rem', marginTop: 4, maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {leaderboardData[2].name.split(' ')[0]}
                        </div>
                        <div style={{ height: 45, width: '100%', background: 'linear-gradient(to top, rgba(180, 83, 9, 0.1) 0%, rgba(180, 83, 9, 0.4) 100%)', borderRadius: '8px 8px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f3f4f6', fontWeight: 800, fontSize: '1rem' }}>
                          3
                        </div>
                      </div>

                    </div>
                  )}

                  {/* Full Leaderboard List */}
                  <div className="glass-panel" style={{ padding: 16 }}>
                    <h3 style={{ fontSize: '0.875rem', fontWeight: 800, marginBottom: 12 }}>Employee Leaderboard</h3>
                    <div className="leaderboard-list">
                      {leaderboardData.map((leader, index) => {
                        const rankClass = index === 0 ? 'rank-1' : index === 1 ? 'rank-2' : index === 2 ? 'rank-3' : 'rank-other';
                        return (
                          <div key={leader.id} className="leader-item glass-panel" style={{ background: 'rgba(255,255,255,0.01)', borderRadius: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span className={`leader-rank ${rankClass}`}>{index + 1}</span>
                              <div className="leader-profile">
                                <img src={leader.avatar} alt="" className="leader-avatar" style={{ width: 34, height: 34 }} />
                                <div>
                                  <div className="leader-name">{leader.name}</div>
                                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                                    Speed: {leader.speed} steps | Yield: {leader.quality}%
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="leader-score">
                              <span className="score-val">{leader.score}</span>
                              <span className="score-label">Points</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Dynamic Bottom Navigation Bar (Filtered by Role permissions) */}
        {user && (
          <div className="bottom-nav">
            {user.role !== 'Employee' && (
              <button 
                onClick={() => setView('dashboard')} 
                className={`nav-item ${view === 'dashboard' ? 'active' : ''}`}
              >
                <LayoutDashboard />
                Dashboard
              </button>
            )}
            {user.role !== 'Employee' && (
              <button 
                onClick={() => setView('stock')} 
                className={`nav-item ${view === 'stock' ? 'active' : ''}`}
              >
                <Package />
                Stock
              </button>
            )}
            <button 
              onClick={() => setView('repair')} 
              className={`nav-item ${view === 'repair' ? 'active' : ''}`}
            >
              <Wrench />
              Repair
            </button>
            
            {/* Approvals tab for Team Leads and Managers */}
            {user.role !== 'Employee' && (
              <button 
                onClick={() => setView('approvals')} 
                className={`nav-item ${view === 'approvals' ? 'active' : ''}`}
              >
                <ShieldCheck />
                Clearance
              </button>
            )}

            <button 
              onClick={() => setView('leaderboard')} 
              className={`nav-item ${view === 'leaderboard' ? 'active' : ''}`}
            >
              <Trophy />
              Trophy
            </button>
          </div>
        )}

      </div>

      {/* MODAL: Lot Panel History Audit */}
      {showHistoryModal && selectedLotHistory && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="glass-panel" style={{ width: '90%', maxWidth: 460, maxHeight: '80vh', overflowY: 'auto', padding: 20, borderColor: '#ffd400', background: '#111827' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Lot {historyLotNo} - Refurb History</h3>
              <button 
                onClick={() => { setShowHistoryModal(false); setSelectedLotHistory(null); }}
                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>
            
            {selectedLotHistory.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>No panels registered in this lot yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {selectedLotHistory.map(p => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 10, background: 'rgba(255,255,255,0.02)', borderRadius: 8, fontSize: '0.78rem' }}>
                    <div>
                      <div style={{ fontWeight: 800 }}>{p.barcode}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>Sr No {p.sr_no} • {p.side} Side • Operator: {p.engineer_name || 'Unassigned'}</div>
                    </div>
                    <span className={`badge ${p.status === 'Scrap' ? 'badge-danger' : p.current_step === 14 ? 'badge-success' : 'badge-warning'}`}>
                      {p.status === 'Scrap' ? 'Scrap' : p.current_step === 14 ? 'Dispatched' : `Step ${p.current_step}`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Rejection Reason Vetting */}
      {showRejectModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="glass-panel" style={{ width: '90%', maxWidth: 400, padding: 20, borderColor: '#ef4444', background: '#111827' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: 12, color: '#ef4444' }}>Quality Clearance Rejection</h3>
            
            <form onSubmit={handleRejectSubmit}>
              <div className="form-group">
                <label>Rejection Feedback Reason</label>
                <textarea 
                  rows="3" 
                  required 
                  placeholder="e.g. Solder touch-up required on back pins; Silicon layer too thin..."
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                />
              </div>
              <div className="metrics-grid">
                <button type="submit" className="btn" style={{ background: '#ef4444', color: '#fff' }}>Submit Rejection</button>
                <button 
                  type="button" 
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectingLogId(null);
                    setRejectionReason('');
                  }} 
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Outward Transaction Form */}
      {showOutwardModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="glass-panel" style={{ width: '90%', maxWidth: 400, padding: 20, borderColor: '#10b981', background: '#111827' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#10b981' }}>Record Outward Dispatch</h3>
              <button 
                onClick={() => { setShowOutwardModal(false); setOutwardForm({ lot_id: '', qty: '', remarks: '' }); }}
                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleOutwardSubmit}>
              <div className="form-group">
                <label>Select Lot</label>
                <select 
                  required
                  value={outwardForm.lot_id}
                  onChange={e => setOutwardForm({...outwardForm, lot_id: e.target.value})}
                >
                  <option value="">-- Choose Lot --</option>
                  {stockData.filter(l => l.status !== 'Complete' || user.role === 'Superadmin').map(l => (
                    <option key={l.id} value={l.id}>Lot {l.lot_no} (Avail: {l.available} • Client: {l.client_name})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Quantity to Dispatch</label>
                <input 
                  type="number" 
                  required 
                  min="1"
                  max={outwardForm.lot_id ? stockData.find(l => l.id === parseInt(outwardForm.lot_id))?.available : undefined}
                  placeholder="e.g. 50"
                  value={outwardForm.qty}
                  onChange={e => setOutwardForm({...outwardForm, qty: e.target.value})}
                />
                {outwardForm.lot_id && (
                  <div style={{ fontSize: '0.65rem', color: '#10b981', marginTop: 4 }}>
                    * Max available to dispatch: {stockData.find(l => l.id === parseInt(outwardForm.lot_id))?.available} units
                  </div>
                )}
              </div>
              <div className="form-group">
                <label>Remarks</label>
                <textarea 
                  rows="2" 
                  placeholder="e.g. Dispatched to Atomberg warehouse"
                  value={outwardForm.remarks}
                  onChange={e => setOutwardForm({...outwardForm, remarks: e.target.value})}
                />
              </div>
              <div className="metrics-grid">
                <button type="submit" className="btn" style={{ background: '#10b981', color: '#fff' }}>Record Dispatch</button>
                <button 
                  type="button" 
                  onClick={() => { setShowOutwardModal(false); setOutwardForm({ lot_id: '', qty: '', remarks: '' }); }} 
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Customer Return Form */}
      {showReturnModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="glass-panel" style={{ width: '90%', maxWidth: 400, padding: 20, borderColor: '#ef4444', background: '#111827' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ef4444' }}>Record Returned Stock</h3>
              <button 
                onClick={() => { setShowReturnModal(false); setReturnForm({ lot_id: '', qty: '', reason: 'Solder Defect', remarks: '' }); }}
                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleReturnSubmit}>
              <div className="form-group">
                <label>Select Lot</label>
                <select 
                  required
                  value={returnForm.lot_id}
                  onChange={e => setReturnForm({...returnForm, lot_id: e.target.value})}
                >
                  <option value="">-- Choose Lot --</option>
                  {stockData.filter(l => l.status !== 'Complete' || user.role === 'Superadmin').map(l => (
                    <option key={l.id} value={l.id}>Lot {l.lot_no} (Client: {l.client_name})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Quantity Returned</label>
                <input 
                  type="number" 
                  required 
                  min="1"
                  placeholder="e.g. 10"
                  value={returnForm.qty}
                  onChange={e => setReturnForm({...returnForm, qty: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Reason for Return</label>
                <select 
                  value={returnForm.reason}
                  onChange={e => setReturnForm({...returnForm, reason: e.target.value})}
                >
                  <option value="Solder Defect">Solder Defect</option>
                  <option value="Conformal Coating Discrepancy">Conformal Coating Discrepancy</option>
                  <option value="Firmware Issue">Firmware Issue</option>
                  <option value="Physical Transit Damage">Physical Transit Damage</option>
                  <option value="Other Technical Discrepancy">Other Technical Discrepancy</option>
                </select>
              </div>
              <div className="form-group">
                <label>Remarks</label>
                <textarea 
                  rows="2" 
                  placeholder="e.g. Customer reported failed testing at final assembly"
                  value={returnForm.remarks}
                  onChange={e => setReturnForm({...returnForm, remarks: e.target.value})}
                />
              </div>
              <div className="metrics-grid">
                <button type="submit" className="btn" style={{ background: '#ef4444', color: '#fff' }}>Record Return</button>
                <button 
                  type="button" 
                  onClick={() => { setShowReturnModal(false); setReturnForm({ lot_id: '', qty: '', reason: 'Solder Defect', remarks: '' }); }} 
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Redispatch Form */}
      {showRedispatchModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="glass-panel" style={{ width: '90%', maxWidth: 400, padding: 20, borderColor: '#3b82f6', background: '#111827' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#3b82f6' }}>Record Returned Lot Redispatch</h3>
              <button 
                onClick={() => { setShowRedispatchModal(false); setRedispatchForm({ lot_id: '', qty: '', remarks: '' }); }}
                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleRedispatchSubmit}>
              <div className="form-group">
                <label>Select Lot</label>
                <select 
                  required
                  value={redispatchForm.lot_id}
                  onChange={e => setRedispatchForm({...redispatchForm, lot_id: e.target.value})}
                >
                  <option value="">-- Choose Lot --</option>
                  {stockData.filter(l => l.status !== 'Complete' || user.role === 'Superadmin').map(l => (
                    <option key={l.id} value={l.id}>Lot {l.lot_no} (Avail: {l.available} • Client: {l.client_name})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Quantity to Redispatch</label>
                <input 
                  type="number" 
                  required 
                  min="1"
                  max={redispatchForm.lot_id ? stockData.find(l => l.id === parseInt(redispatchForm.lot_id))?.available : undefined}
                  placeholder="e.g. 5"
                  value={redispatchForm.qty}
                  onChange={e => setRedispatchForm({...redispatchForm, qty: e.target.value})}
                />
                {redispatchForm.lot_id && (
                  <div style={{ fontSize: '0.65rem', color: '#3b82f6', marginTop: 4 }}>
                    * Max available to redispatch: {stockData.find(l => l.id === parseInt(redispatchForm.lot_id))?.available} units
                  </div>
                )}
              </div>
              <div className="form-group">
                <label>Remarks</label>
                <textarea 
                  rows="2" 
                  placeholder="e.g. Redispatched to client after successful rework & cleaning"
                  value={redispatchForm.remarks}
                  onChange={e => setRedispatchForm({...redispatchForm, remarks: e.target.value})}
                />
              </div>
              <div className="metrics-grid">
                <button type="submit" className="btn" style={{ background: '#3b82f6', color: '#fff' }}>Record Redispatch</button>
                <button 
                  type="button" 
                  onClick={() => { setShowRedispatchModal(false); setRedispatchForm({ lot_id: '', qty: '', remarks: '' }); }} 
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Lot Transactions History Timeline */}
      {showTransactionsModal && selectedLotTransactions && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="glass-panel" style={{ width: '90%', maxWidth: 460, maxHeight: '80vh', overflowY: 'auto', padding: 20, borderColor: '#ffd400', background: '#111827' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffd400' }}>Lot {transactionsLotNo} - Stock Transaction History</h3>
              <button 
                onClick={() => { setShowTransactionsModal(false); setSelectedLotTransactions([]); }}
                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>
            
            {selectedLotTransactions.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic', textAlign: 'center', padding: 20 }}>No transaction logs recorded for this lot yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'relative', paddingLeft: 12, borderLeft: '2px solid rgba(255,255,255,0.05)', marginLeft: 8 }}>
                {selectedLotTransactions.map(trans => {
                  const isCompletionAuto = trans.remarks && trans.remarks.includes('auto-completed');
                  const pillColor = trans.transaction_type === 'Inward' ? '#ffd400' : trans.transaction_type === 'Outward' ? '#10b981' : trans.transaction_type === 'Return' ? '#ef4444' : trans.transaction_type === 'Redispatch' ? '#3b82f6' : '#8b5cf6';
                  
                  return (
                    <div key={trans.id} style={{ position: 'relative' }}>
                      <span style={{ 
                        position: 'absolute', 
                        left: -20, 
                        top: 4, 
                        width: 12, 
                        height: 12, 
                        borderRadius: '50%', 
                        background: pillColor,
                        boxShadow: `0 0 8px ${pillColor}`
                      }}></span>
                      
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: pillColor }}>
                            {trans.transaction_type} {trans.qty > 0 && `(Qty: ${trans.qty})`}
                          </h4>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                            {new Date(trans.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        </div>
                        
                        <p style={{ fontSize: '0.75rem', color: '#cbd5e1', marginTop: 2, fontStyle: isCompletionAuto ? 'italic' : 'normal' }}>
                          {trans.remarks}
                        </p>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', marginTop: 2 }}>
                          Actioned By: {trans.actor_name || 'System / Auto'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
