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
  CheckCheck,
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
  ToggleRight,
  Info,
  Users,
  ShieldAlert,
  Cpu,
  Activity
} from 'lucide-react';
import { useAuth } from './context/AuthContext';

const STEP_NAMES = [
  "Inward",
  "Segregation",
  "Programming",
  "1st Testing",
  "Debug",
  "Entry",
  "Cleaning",
  "QC After Cleaning",
  "Marking & Coating",
  "Final Testing",
  "Packing",
  "Final Entry"
];

const REMARK_PRESETS = {
  2: [
    "No visible physical damage or corrosion",
    "Minor oxidation on pads, salvageable",
    "PCB physically cracked, designated for scrap",
    "Liquid damage detected, corrosion on power rail",
    "Lot inspection complete"
  ],
  4: [
    "All parameters within standard limits",
    "High failed rate due to programming issues",
    "Minor calibration failures",
    "IC response timeout detected",
    "Failed board sent to Debug station"
  ],
  5: [
    "Replaced faulty oscillator IC",
    "Power line short circuit repaired",
    "Minor solder bridging resolved",
    "Critical microcontroller defect - board scrapped",
    "PCB restored and functional"
  ],
  7: [
    "Flux residues completely removed via ultrasonic cleaning",
    "Surface contamination cleared",
    "Isopropyl Alcohol (IPA) clean cycle done",
    "Board rejected due to solder mask peeling"
  ],
  8: [
    "IPC-A-610 Class 2 standards verified",
    "Flux completely cleared, board pristine",
    "Minor solder bridge caught and reworked",
    "Solder joint voids found under QFN"
  ],
  9: [
    "Conformal coating applied uniformly",
    "Silicone thermal paste applied",
    "Serial labels verified and affixed"
  ],
  10: [
    "Passes high-voltage burn-in test",
    "All parameters within 100% IPC standards",
    "Failed board sent to rework loop"
  ],
  11: [
    "Antistatic ESD bubble wrap pack completed",
    "Standard corrugated carton box pack",
    "Bulk shipment box prepared"
  ]
};

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
  
  // Lot-Level 12-Step Production Logging States
  const [selectedProductionStep, setSelectedProductionStep] = useState(1);
  const [productionLotId, setProductionLotId] = useState('');
  const [productionPcbType, setProductionPcbType] = useState('GV3 Digital PCB');
  const [stepInputs, setStepInputs] = useState({});
  const [pendingProductionLogs, setPendingProductionLogs] = useState([]);
  const [approvedProductionLogs, setApprovedProductionLogs] = useState([]);
  const [lotProductionStats, setLotProductionStats] = useState(null);
  const [rejectionLogInputId, setRejectionLogInputId] = useState(null);
  const [rejectionLogText, setRejectionLogText] = useState('');
  
  // Superadmin User Management States
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminUsersLoading, setAdminUsersLoading] = useState(false);
  const [newUserForm, setNewUserForm] = useState({ firstName: '', lastName: '', role: 'Employee', attendance_rate: '95.0' });
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Station readiness checklist states
  const [esdWristStrap, setEsdWristStrap] = useState(false);
  const [ionizerOn, setIonizerOn] = useState(false);
  const [esdMatGrounded, setEsdMatGrounded] = useState(false);
  
  // Pagination State for Lots Table (5 items per page)
  const [currentStockPage, setCurrentStockPage] = useState(1);
  const lotsPerPage = 5;

  const renderRemarkField = (stepNo) => {
    const presets = REMARK_PRESETS[stepNo] || ["Log entry updated", "Standard procedure complete"];
    const currentRemark = stepInputs.remarks || '';
    
    // Check if currentRemark is one of the presets
    const isPreset = presets.includes(currentRemark) || currentRemark === '';
    
    return (
      <div className="form-group" style={{ marginTop: 12 }}>
        <label>Remarks</label>
        <select
          value={isPreset ? currentRemark : 'custom'}
          onChange={e => {
            const val = e.target.value;
            if (val === 'custom') {
              setStepInputs(prev => ({ ...prev, remarks: '' }));
            } else {
              setStepInputs(prev => ({ ...prev, remarks: val }));
            }
          }}
          style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', color: '#fff', borderRadius: 8, width: '100%', cursor: 'pointer', marginBottom: 8 }}
        >
          <option value="">-- Select Standard Remark --</option>
          {presets.map((preset, idx) => (
            <option key={idx} value={preset}>{preset}</option>
          ))}
          <option value="custom">Custom Write-in...</option>
        </select>
        
        {(!isPreset || currentRemark === '' || stepInputs.remarks === undefined) && (
          <input
            type="text"
            required
            placeholder="Type custom remark here..."
            value={stepInputs.remarks || ''}
            onChange={e => setStepInputs(prev => ({ ...prev, remarks: e.target.value }))}
            style={{ width: '100%', padding: '8px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', color: '#fff', borderRadius: 8 }}
          />
        )}
      </div>
    );
  };

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
  const [recentScans, setRecentScans] = useState(['ESRP2P5918E26128R0100', 'ESRP2P5919E26128R0382']);
  
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

  // Load Lot-level production logs & stats reactively
  useEffect(() => {
    if (user && view === 'repair') {
      fetchPendingProductionLogs(selectedProductionStep);
      if (productionLotId) {
        fetchProductionLogs(productionLotId, selectedProductionStep);
        fetchLotProductionStats(productionLotId);
      } else if (stockData && stockData.length > 0) {
        setProductionLotId(stockData[0].id);
      }
    }
  }, [user, view, selectedProductionStep, productionLotId, stockData]);

  // Load Superadmin User Management accounts list reactively
  useEffect(() => {
    if (user && view === 'users' && user.role === 'Superadmin') {
      fetchAdminUsers();
    }
  }, [user, view]);

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

  const fetchAdminUsers = async () => {
    try {
      if (!user || user.role !== 'Superadmin') return;
      setAdminUsersLoading(true);
      const res = await apiFetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setAdminUsers(data);
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to fetch active system accounts.', 'danger');
    } finally {
      setAdminUsersLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!user || user.role !== 'Superadmin') return;
    
    const firstName = newUserForm.firstName?.trim() || '';
    const lastName = newUserForm.lastName?.trim() || '';
    
    if (!firstName || !lastName) {
      showToast('Both First Name and Last Name are required.', 'danger');
      return;
    }
    
    // Capitalize first name and last name properly: e.g. "John Doe"
    const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);
    const formattedFirstName = firstName.split(' ').map(capitalize).join(' ');
    const formattedLastName = lastName.split(' ').map(capitalize).join(' ');
    const name = `${formattedFirstName} ${formattedLastName}`;
    
    // Generate email: <firstname>.<first letter of surname>@electrolytesoln.com in lowercase
    const cleanFirstName = firstName.toLowerCase().replace(/\s+/g, '');
    const firstLetterOfSurname = lastName.charAt(0).toLowerCase();
    const email = `${cleanFirstName}.${firstLetterOfSurname}@electrolytesoln.com`;
    
    const password = 'Electrolyte2026!';
    
    setIsSubmittingUser(true);
    try {
      const res = await apiFetch('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          name,
          email,
          password,
          role: newUserForm.role,
          attendance_rate: newUserForm.attendance_rate
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'User account provisioned successfully!');
        setNewUserForm({ firstName: '', lastName: '', role: 'Employee', attendance_rate: '95.0' });
        fetchAdminUsers();
      } else {
        showToast(data.error || 'Failed to provision user.', 'danger');
      }
    } catch (err) {
      console.error(err);
      showToast('Error connecting to user management API.', 'danger');
    } finally {
      setIsSubmittingUser(false);
    }
  };

  const handleToggleUserStatus = async (targetUserId) => {
    if (!user || user.role !== 'Superadmin') return;
    try {
      const res = await apiFetch(`/api/admin/users/toggle/${targetUserId}`, {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'User status updated successfully!');
        fetchAdminUsers();
      } else {
        showToast(data.error || 'Failed to update user status.', 'danger');
      }
    } catch (err) {
      console.error(err);
      showToast('Error communicating with active directory API.', 'danger');
    }
  };

  // Lot-Level 12-Step Production Logging Fetchers & Actions
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
        setStepInputs({}); // reset inputs
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
        showToast('Manager clearance approved. Log successfully committed to production database!');
        fetchPendingProductionLogs(selectedProductionStep);
        fetchProductionLogs(productionLotId, selectedProductionStep);
        fetchLotProductionStats(productionLotId);
        fetchStock();
        fetchDashboard();
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
    <div className="app-layout">
      {/* Premium Widescreen Top Navigation Header Bar */}
      {user && (
        <header className="app-top-header">
          <div className="app-brand">
            <span className="app-brand-dot"></span>
            <h1 className="app-brand-title">Electrolyte Solutions</h1>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="app-nav-tabs">
            {user.role !== 'Employee' && (
              <button 
                onClick={() => setView('dashboard')} 
                className={`app-nav-tab ${view === 'dashboard' ? 'active' : ''}`}
              >
                <LayoutDashboard size={14} /> Dashboard
              </button>
            )}
            {user.role !== 'Employee' && (
              <button 
                onClick={() => setView('stock')} 
                className={`app-nav-tab ${view === 'stock' ? 'active' : ''}`}
              >
                <Package size={14} /> Stock Summary
              </button>
            )}
            <button 
              onClick={() => setView('repair')} 
              className={`app-nav-tab ${view === 'repair' ? 'active' : ''}`}
            >
              <Wrench size={14} /> Repair Terminal
            </button>
            {user.role !== 'Employee' && (
              <button 
                onClick={() => setView('approvals')} 
                className={`app-nav-tab ${view === 'approvals' ? 'active' : ''}`}
              >
                <ShieldCheck size={14} /> Quality Clearance
              </button>
            )}
            <button 
              onClick={() => setView('leaderboard')} 
              className={`app-nav-tab ${view === 'leaderboard' ? 'active' : ''}`}
            >
              <Trophy size={14} /> Leaderboard
            </button>
            {user.role === 'Superadmin' && (
              <button 
                onClick={() => setView('users')} 
                className={`app-nav-tab ${view === 'users' ? 'active' : ''}`}
              >
                <Users size={14} /> Users
              </button>
            )}
          </nav>

          {/* Header Right Profile Actions Widget */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <img 
                src={user.avatar || "https://api.dicebear.com/7.x/adventurer/svg?seed=Operator"} 
                alt="Operator avatar" 
                className="leader-avatar"
                style={{ width: 32, height: 32, border: '2px solid var(--color-primary)', margin: 0 }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }} className="desktop-only-flex">
                <span style={{ fontSize: '0.8rem', fontWeight: 800 }}>{user.name}</span>
                <span style={{ fontSize: '0.6rem', color: 'var(--color-primary)', textTransform: 'uppercase', fontWeight: 700 }}>{user.role}</span>
              </div>
            </div>
            
            <button 
              onClick={() => { logout(); showToast('Logged out successfully!'); }} 
              style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.25)', color: '#ef4444', padding: '6px 12px', borderRadius: '30px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}
            >
              <LogOut size={12} /> Logout
            </button>
          </div>
        </header>
      )}

      {/* Main Container Area */}
      <main className="app-main-content">
        {/* Global Toast */}
        {notification && (
          <div 
            className={`badge ${notification.type === 'danger' ? 'badge-danger' : notification.type === 'warning' ? 'badge-warning' : 'badge-success'}`}
            style={{
              position: 'fixed',
              top: '80px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 9999,
              justifyContent: 'center',
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
              padding: '12px 24px',
              width: 'auto',
              maxWidth: '90%',
              minWidth: 260,
              background: 'rgba(17, 24, 39, 0.95)',
              backdropFilter: 'blur(16px)',
              border: `1.5px solid ${
                notification.type === 'danger' 
                  ? 'var(--color-danger)' 
                  : notification.type === 'warning' 
                    ? 'var(--color-warning)' 
                    : 'var(--color-primary)'
              }`,
              borderRadius: '30px',
              fontSize: '0.8rem',
              fontWeight: 800,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              animation: 'none'
            }}
          >
            <AlertCircle size={14} color={
              notification.type === 'danger' 
                ? 'var(--color-danger)' 
                : notification.type === 'warning' 
                  ? 'var(--color-warning)' 
                  : 'var(--color-primary)'
            } />
            {notification.message}
          </div>
        )}

        {/* USER IS NOT LOGGED IN: Render Premium Login View */}
        {!user ? (
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', padding: '40px 20px' }}>
            <div style={{ width: '100%', maxWidth: 450 }}>
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
          </div>
        ) : (
          // USER IS LOGGED IN: Render Workspace
          <div style={{ width: '100%' }}>
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

                  <div className="widescreen-grid">
                    {/* Left Column: KPI Metrics & Critical Alerts unified in one glass-panel */}
                    <div className="glass-panel" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
                      <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--color-primary)', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 8 }}>Production KPI Metrics</h3>
                      {/* Cumulative KPI metrics */}
                      {dashboardData && (
                        <div className="metrics-grid" style={{ marginBottom: 0 }}>
                          <div className="metric-card glass-panel blue" style={{ border: 'none', background: 'rgba(255,255,255,0.02)' }}>
                            <span className="metric-label">Inward Lots</span>
                            <h3 className="metric-val">{dashboardData.metrics.total_lots}</h3>
                          </div>
                          <div className="metric-card glass-panel" style={{ border: 'none', background: 'rgba(255,255,255,0.02)' }}>
                            <span className="metric-label">Total Received</span>
                            <h3 className="metric-val">{dashboardData.metrics.total_received}</h3>
                          </div>
                          <div className="metric-card glass-panel warning" style={{ border: 'none', background: 'rgba(255,255,255,0.02)' }}>
                            <span className="metric-label">In Pipeline</span>
                            <h3 className="metric-val">{dashboardData.metrics.total_pending}</h3>
                          </div>
                          <div className="metric-card glass-panel success" style={{ border: 'none', background: 'rgba(255,255,255,0.02)' }}>
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

                      {/* Manager Shop Floor Vitals Widget (Rendered for everyone to prevent empty container gaps) */}
                      {user && (
                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                          <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-blue)', display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
                            <TrendingUp size={14} /> Shop Floor Health Vitals
                          </h4>
                          
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            <div style={{ padding: 10, background: 'rgba(255,255,255,0.015)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.03)' }}>
                              <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>Line Yield Rate</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                                <span style={{ fontSize: '1rem', fontWeight: 800, color: '#10b981' }}>98.2%</span>
                                <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2 }}>
                                  <div style={{ width: '98.2%', height: '100%', background: '#10b981', borderRadius: 2 }}></div>
                                </div>
                              </div>
                            </div>
                            
                            <div style={{ padding: 10, background: 'rgba(255,255,255,0.015)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.03)' }}>
                              <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>Active Shift Output</span>
                              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#ffd400', marginTop: 4 }}>
                                {dashboardData ? dashboardData.metrics.total_dispatched : 0} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>OK</span>
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            <div style={{ padding: 10, background: 'rgba(255,255,255,0.015)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.03)' }}>
                              <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>Vetting Speed</span>
                              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff', marginTop: 4 }}>
                                ⚡ Fast <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 500 }}>(&lt;1.2m/step)</span>
                              </div>
                            </div>
                            
                            <div style={{ padding: 10, background: 'rgba(255,255,255,0.015)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.03)' }}>
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
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, fontSize: '0.72rem', background: 'rgba(255,255,255,0.01)', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.02)' }}>
                            <span style={{ fontFamily: 'monospace', color: '#ffd400' }}>ESRP2P5918E26128R0100</span>
                            <span style={{ fontSize: '0.62rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>QC PASS</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, fontSize: '0.72rem', background: 'rgba(255,255,255,0.01)', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.02)' }}>
                            <span style={{ fontFamily: 'monospace', color: '#ffd400' }}>ESRP2P5919E26128R0382</span>
                            <span style={{ fontSize: '0.62rem', color: '#ffd400', background: 'rgba(255, 212, 0, 0.1)', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>REWORKED</span>
                          </div>
                        </div>
                      </div>


                    </div>

                    {/* Right Column: Factory Lot Filter & Shop Floor Pipeline Queue unified in one glass-panel */}
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

                  <div className="widescreen-grid">
                    {/* Left Column: Multi-Criteria Stock Search, Filters, & Inward Form Drawer */}
                    <div className="glass-panel" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
                      <div>
                        <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--color-primary)', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 8, marginBottom: 12 }}>Filter Stock Records</h3>
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

                      {/* Inward New Lot Form Drawer inside Left Column Panel */}
                      {showInwardForm && (
                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 16 }}>
                          <h3 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: 12, color: '#ffd400' }}>New Inward Lot Shipment</h3>
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

                      {/* Stock Insights Widget (Rendered for everyone to prevent empty container gaps) */}
                      {user && (
                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                          <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
                            <Package size={14} /> Client Allocation Vitals
                          </h4>
                          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                            Allocated quantities by client representing active, in-process shop floor lots.
                          </p>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                            {clientsList.map(client => {
                              const clientLots = stockData.filter(l => l.client_name === client.name);
                              const totalReceived = clientLots.reduce((sum, l) => sum + l.received_qty, 0);
                              const totalAvailable = clientLots.reduce((sum, l) => sum + l.available, 0);
                              const progressPct = stockData.length > 0 ? Math.round((clientLots.length / stockData.length) * 100) : 0;
                              
                              if (totalReceived === 0) return null; // skip clients with no active inventory
                              
                              return (
                                <div key={client.id} style={{ padding: 10, background: 'rgba(255,255,255,0.015)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.03)' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 6 }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fff' }}>{client.name}</span>
                                    <span style={{ fontSize: '0.7rem', color: '#ffd400', fontWeight: 600 }}>{totalAvailable} / {totalReceived} avl</span>
                                  </div>
                                  <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2 }}>
                                    <div style={{ width: `${progressPct}%`, height: '100%', background: 'var(--color-blue)', borderRadius: 2 }}></div>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.58rem', color: 'var(--text-muted)', marginTop: 4 }}>
                                    <span>Share: {progressPct}% of warehouse</span>
                                    <span>Lots: {clientLots.length} active</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Environmental & Storage Vitals Widget */}
                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-blue)', display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
                          <Info size={14} /> Environmental Vitals
                        </h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, fontSize: '0.68rem', textAlign: 'center' }}>
                          <div style={{ padding: '8px 4px', background: 'rgba(16, 185, 129, 0.05)', borderRadius: 8, border: '1px solid rgba(16, 185, 129, 0.1)' }}>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.55rem', textTransform: 'uppercase', marginBottom: 2 }}>Humidity</div>
                            <strong style={{ color: '#10b981', fontSize: '0.85rem' }}>38% RH</strong>
                            <div style={{ color: '#10b981', fontSize: '0.5rem', fontWeight: 700, marginTop: 2 }}>SAFE</div>
                          </div>
                          <div style={{ padding: '8px 4px', background: 'rgba(16, 185, 129, 0.05)', borderRadius: 8, border: '1px solid rgba(16, 185, 129, 0.1)' }}>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.55rem', textTransform: 'uppercase', marginBottom: 2 }}>Temperature</div>
                            <strong style={{ color: '#10b981', fontSize: '0.85rem' }}>22.4°C</strong>
                            <div style={{ color: '#10b981', fontSize: '0.5rem', fontWeight: 700, marginTop: 2 }}>SAFE</div>
                          </div>
                          <div style={{ padding: '8px 4px', background: 'rgba(59, 130, 246, 0.05)', borderRadius: 8, border: '1px solid rgba(59, 130, 246, 0.1)' }}>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.55rem', textTransform: 'uppercase', marginBottom: 2 }}>ESD Level</div>
                            <strong style={{ color: '#60a5fa', fontSize: '0.85rem' }}>0V</strong>
                            <div style={{ color: '#60a5fa', fontSize: '0.5rem', fontWeight: 700, marginTop: 2 }}>SAFE</div>
                          </div>
                        </div>
                      </div>


                    </div>

                    {/* Right Column: Paginated Lots cards list unified in a single glass-panel */}
                    <div className="glass-panel" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--color-primary)', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 8 }}>
                        Stock Records Ledger
                      </h3>
                      
                      <div style={{ flex: 1, overflowY: 'auto', maxHeight: '520px', paddingRight: 4, display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {paginatedLots.length === 0 ? (
                          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                            No lots match the active filter criteria.
                          </div>
                        ) : paginatedLots.map(lot => {
                          const shortage = lot.qty_sent - lot.received_qty;
                          const isComplete = lot.status === 'Complete';
                          return (
                            <div key={lot.id} style={{ padding: 16, borderRadius: 12, border: '1px solid rgba(255, 255, 255, 0.06)', background: 'rgba(255, 255, 255, 0.015)', borderColor: isComplete ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.15)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
                                <div>
                                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Client: {lot.client_name}</span>
                                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '2px 0 0 0' }}>Lot {lot.lot_no} <span style={{ color: '#475569', fontSize: '0.85rem' }}>({lot.batch_no} • {lot.pixel_pitch})</span></h3>
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

                              <div className="lot-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4, fontSize: '0.75rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', padding: 10, borderRadius: 8, marginBottom: 12 }}>
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
                              <div className="lot-action-btns" style={{ display: 'flex', gap: 6 }}>
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

                      {/* Stock List Pagination Controls at the bottom of Right Column Panel */}
                      {totalStockPages > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, background: 'rgba(255,255,255,0.02)', padding: 10, borderRadius: 12, border: '1px solid rgba(255,255,255,0.04)' }}>
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
                  </div>
                </div>
              )}
              {/* VIEW: Repair Terminal */}
              {view === 'repair' && (
                <div>
                  <div className="app-header">
                    <div>
                      <span className="app-subtitle">Operations Terminal</span>
                      <h1 className="app-title"><Wrench size={20} color="#ffd400" /> Refurbishment Pipeline Station</h1>
                    </div>
                    
                    {/* Active Lot selector in the header for quick lot selection */}
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

                  {/* 12-Step Visual Pipeline Selector */}
                  <div className="glass-panel" style={{ padding: 16, marginBottom: 20 }}>
                    <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-primary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Wrench size={14} /> Interactive 12-Step Pipeline Flow (Click to Select Step)
                    </h3>
                    <div className="pipeline-step-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }}>
                      {STEP_NAMES.map((name, index) => {
                        const stepNo = index + 1;
                        const isActive = selectedProductionStep === stepNo;
                        return (
                          <div
                            key={stepNo}
                            onClick={() => { setSelectedProductionStep(stepNo); setStepInputs({}); }}
                            style={{
                              padding: '10px 8px',
                              borderRadius: 8,
                              background: isActive ? 'rgba(255, 212, 0, 0.08)' : 'rgba(255,255,255,0.015)',
                              border: isActive ? '1px solid #ffd400' : '1px solid rgba(255,255,255,0.03)',
                              cursor: 'pointer',
                              textAlign: 'center',
                              transition: 'all 0.2s',
                              boxShadow: isActive ? '0 0 10px rgba(255, 212, 0, 0.15)' : 'none'
                            }}
                          >
                            <div style={{ fontSize: '0.7rem', color: isActive ? '#ffd400' : 'var(--text-muted)', fontWeight: 800 }}>Step {stepNo}</div>
                            <div style={{ fontSize: '0.72rem', fontWeight: isActive ? 800 : 500, color: isActive ? '#fff' : '#cbd5e1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 }}>{name}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="widescreen-grid">
                    {/* Left Column: Lot Status & Checksum Vitals Monitor */}
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

                            {/* Step Vitals progress bars to verify conservation */}
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
                              {/* Visual Checksum warning for Step 2 */}
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

                      {/* PCB Type selection */}
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

                      {/* Station ESD & Safety Checklist */}
                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 16 }}>
                        <h4 style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                          <ShieldAlert size={14} color="#ffd400" /> ESD Station Safety Readiness
                        </h4>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '0.72rem', color: esdWristStrap ? '#fff' : 'var(--text-muted)' }}>
                            <input 
                              type="checkbox" 
                              checked={esdWristStrap} 
                              onChange={e => setEsdWristStrap(e.target.checked)} 
                              style={{ width: 14, height: 14, cursor: 'pointer', accentColor: '#ffd400' }} 
                            />
                            <span>ESD Wrist Strap Connected (Tested &lt;1.0 MΩ)</span>
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '0.72rem', color: ionizerOn ? '#fff' : 'var(--text-muted)' }}>
                            <input 
                              type="checkbox" 
                              checked={ionizerOn} 
                              onChange={e => setIonizerOn(e.target.checked)} 
                              style={{ width: 14, height: 14, cursor: 'pointer', accentColor: '#ffd400' }} 
                            />
                            <span>Clean Air Ionizer Operational</span>
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '0.72rem', color: esdMatGrounded ? '#fff' : 'var(--text-muted)' }}>
                            <input 
                              type="checkbox" 
                              checked={esdMatGrounded} 
                              onChange={e => setEsdMatGrounded(e.target.checked)} 
                              style={{ width: 14, height: 14, cursor: 'pointer', accentColor: '#ffd400' }} 
                            />
                            <span>Anti-Static Desk Mat Properly Grounded</span>
                          </label>
                        </div>

                        <div style={{ 
                          marginTop: 10, 
                          padding: '6px 12px', 
                          borderRadius: 6, 
                          background: (esdWristStrap && ionizerOn && esdMatGrounded) ? 'rgba(16, 185, 129, 0.06)' : 'rgba(245, 158, 11, 0.05)',
                          border: (esdWristStrap && ionizerOn && esdMatGrounded) ? '1px solid rgba(16, 185, 129, 0.15)' : '1px solid rgba(245, 158, 11, 0.1)',
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          gap: 6,
                          fontSize: '0.62rem', 
                          fontWeight: 800, 
                          color: (esdWristStrap && ionizerOn && esdMatGrounded) ? '#10b981' : '#f59e0b',
                          transition: 'all 0.3s'
                        }}>
                          {(esdWristStrap && ionizerOn && esdMatGrounded) ? (
                            <>🛡️ STATION SAFE • ESD IPC COMPLIANT</>
                          ) : (
                            <>⚠️ STATION WARNING • RUN READINESS CHECKLIST</>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Dynamic Form (Employee) OR Pending Approvals List (TL / Manager) */}
                    <div className="glass-panel" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {/* Render for Employee - Active Step Form Entry */}
                      {user.role === 'Employee' ? (
                        <div>
                          <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#ffd400', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 8, marginBottom: 16 }}>
                            Log Production Batch - Step {selectedProductionStep}: {STEP_NAMES[selectedProductionStep - 1]}
                          </h2>

                          <form onSubmit={handleProductionLogSubmit}>
                            {/* RENDER STEP DYNAMIC FIELDS */}
                            {selectedProductionStep === 1 && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <div className="form-group">
                                  <label>Quantity Received</label>
                                  <input
                                    type="number"
                                    required
                                    placeholder="e.g. 658"
                                    value={stepInputs.qty_received || ''}
                                    onChange={e => setStepInputs({...stepInputs, qty_received: parseInt(e.target.value)})}
                                  />
                                </div>
                                <div className="form-group">
                                  <label>Expected Quantity (Atomberg quantity)</label>
                                  <input
                                    type="number"
                                    required
                                    placeholder="e.g. 678"
                                    value={stepInputs.expected_qty || ''}
                                    onChange={e => setStepInputs({...stepInputs, expected_qty: parseInt(e.target.value)})}
                                  />
                                </div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                                  * Shortage will be auto-computed: <strong>{parseInt(stepInputs.expected_qty || 0) - parseInt(stepInputs.qty_received || 0)} units shortage</strong>.
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
                                    onChange={e => setStepInputs({...stepInputs, repairable_qty: parseInt(e.target.value)})}
                                  />
                                </div>
                                <div className="form-group">
                                  <label>Scrap Quantity</label>
                                  <input
                                    type="number"
                                    required
                                    placeholder="e.g. 58"
                                    value={stepInputs.scrap_qty || ''}
                                    onChange={e => setStepInputs({...stepInputs, scrap_qty: parseInt(e.target.value)})}
                                  />
                                </div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                  Total Inspected (Repairable + Scrap): <strong>{parseInt(stepInputs.repairable_qty || 0) + parseInt(stepInputs.scrap_qty || 0)} PCBs</strong>.
                                  {lotProductionStats && parseInt(stepInputs.repairable_qty || 0) + parseInt(stepInputs.scrap_qty || 0) !== lotProductionStats.received_qty && (
                                    <span style={{ color: '#ef4444', display: 'block', marginTop: 4 }}>
                                      ⚠️ Warning: Total must equal lot received count ({lotProductionStats.received_qty})!
                                    </span>
                                  )}
                                </div>
                                {renderRemarkField(2)}
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
                                    onChange={e => setStepInputs({...stepInputs, code_ok: parseInt(e.target.value)})}
                                  />
                                </div>
                                <div className="form-group">
                                  <label>Code Not OK (Failed)</label>
                                  <input
                                    type="number"
                                    required
                                    placeholder="e.g. 10"
                                    value={stepInputs.code_not_ok || ''}
                                    onChange={e => setStepInputs({...stepInputs, code_not_ok: parseInt(e.target.value)})}
                                  />
                                </div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                  Total programmed: <strong>{parseInt(stepInputs.code_ok || 0) + parseInt(stepInputs.code_not_ok || 0)} PCBs</strong>.
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
                                    onChange={e => setStepInputs({...stepInputs, qty_passed: parseInt(e.target.value)})}
                                  />
                                </div>
                                <div className="form-group">
                                  <label>Quantity Failed</label>
                                  <input
                                    type="number"
                                    required
                                    placeholder="e.g. 20"
                                    value={stepInputs.qty_failed || ''}
                                    onChange={e => setStepInputs({...stepInputs, qty_failed: parseInt(e.target.value)})}
                                  />
                                </div>
                                {renderRemarkField(4)}
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
                                    onChange={e => setStepInputs({...stepInputs, debug_ok: parseInt(e.target.value)})}
                                  />
                                </div>
                                <div className="form-group">
                                  <label>Critical Quantity</label>
                                  <input
                                    type="number"
                                    required
                                    placeholder="e.g. 3"
                                    value={stepInputs.critical_qty || ''}
                                    onChange={e => setStepInputs({...stepInputs, critical_qty: parseInt(e.target.value)})}
                                  />
                                </div>
                                <div className="form-group">
                                  <label>Scrap PCBs</label>
                                  <input
                                    type="number"
                                    required
                                    placeholder="e.g. 2"
                                    value={stepInputs.scrap_qty || ''}
                                    onChange={e => setStepInputs({...stepInputs, scrap_qty: parseInt(e.target.value)})}
                                  />
                                </div>
                                {renderRemarkField(5)}
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
                                    onChange={e => setStepInputs({...stepInputs, entry_count: parseInt(e.target.value)})}
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
                                    onChange={e => setStepInputs({...stepInputs, qty_cleaned: parseInt(e.target.value)})}
                                  />
                                </div>
                                <div className="form-group">
                                  <label>QC Reject</label>
                                  <input
                                    type="number"
                                    required
                                    placeholder="e.g. 5"
                                    value={stepInputs.qc_reject || ''}
                                    onChange={e => setStepInputs({...stepInputs, qc_reject: parseInt(e.target.value)})}
                                  />
                                </div>
                                {renderRemarkField(7)}
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
                                    onChange={e => setStepInputs({...stepInputs, qty_passed: parseInt(e.target.value)})}
                                  />
                                </div>
                                <div className="form-group">
                                  <label>Quantity Failed</label>
                                  <input
                                    type="number"
                                    required
                                    placeholder="e.g. 0"
                                    value={stepInputs.qty_failed || ''}
                                    onChange={e => setStepInputs({...stepInputs, qty_failed: parseInt(e.target.value)})}
                                  />
                                </div>
                                {renderRemarkField(8)}
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
                                    onChange={e => setStepInputs({...stepInputs, qty_coated: parseInt(e.target.value)})}
                                  />
                                </div>
                                {renderRemarkField(9)}
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
                                    onChange={e => setStepInputs({...stepInputs, qty_passed: parseInt(e.target.value)})}
                                  />
                                </div>
                                <div className="form-group">
                                  <label>Quantity Failed</label>
                                  <input
                                    type="number"
                                    required
                                    value={stepInputs.qty_failed || ''}
                                    onChange={e => setStepInputs({...stepInputs, qty_failed: parseInt(e.target.value)})}
                                  />
                                </div>
                                {renderRemarkField(10)}
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
                                    onChange={e => setStepInputs({...stepInputs, bubble_packed: parseInt(e.target.value)})}
                                  />
                                </div>
                                <div className="form-group">
                                  <label>Box Packed</label>
                                  <input
                                    type="number"
                                    required
                                    value={stepInputs.box_packed || ''}
                                    onChange={e => setStepInputs({...stepInputs, box_packed: parseInt(e.target.value)})}
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
                                {renderRemarkField(11)}
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
                                    onChange={e => setStepInputs({...stepInputs, entry_count: parseInt(e.target.value)})}
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

                          {/* Recent Log Submissions below the form */}
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
                        /* Render for Team Lead & Managers/Superadmins - Pending Approvals list for Selected Step */
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

                          {/* List pending approvals for selectedStep */}
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

                                    {/* Display exact tracking columns and values in side-by-side grids */}
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

                                    {/* Vetting Sign-off Action buttons */}
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
                                            Confirm Reject
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
                                              <Check size={12} /> Team Lead Sign-off
                                            </button>
                                          )}
                                          
                                          {isManagerPending && isMgrRole && (
                                            <button 
                                              onClick={() => managerApproveProductionLog(log.id)} 
                                              className="btn btn-success" 
                                              style={{ width: 'auto', margin: 0, padding: '6px 14px', background: '#10b981', color: '#fff', fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer' }}
                                            >
                                              <CheckCheck size={12} /> Manager Final Approval
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

                  <div className="widescreen-grid">
                    {/* Left Column: Quality Audit Metrics & Bottleneck Heatmap */}
                    <div className="glass-panel" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
                      <div>
                        <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--color-primary)', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 8, marginBottom: 16 }}>Vetting Center Vitals</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                          <div style={{ padding: 10, background: 'rgba(255,255,255,0.015)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.03)' }}>
                            <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>Cleared Today</span>
                            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#10b981', marginTop: 4 }}>
                              14 <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 500 }}>Panels</span>
                            </div>
                          </div>
                          <div style={{ padding: 10, background: 'rgba(255,255,255,0.015)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.03)' }}>
                            <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>Clearance Rate</span>
                            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#ffd400', marginTop: 4 }}>
                              98.6%
                            </div>
                          </div>
                        </div>
                      </div>

                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 16 }}>
                        <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-blue)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <AlertCircle size={14} /> Quality Hotspots & Reworks
                        </h4>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.4 }}>
                          PCB components experiencing the highest diagnostic reflow or rework reject frequencies:
                        </p>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ padding: 10, background: 'rgba(239, 68, 68, 0.05)', borderRadius: 8, border: '1px solid rgba(239, 68, 68, 0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                            <div>
                              <strong style={{ fontSize: '0.75rem', color: '#fca5a5' }}>Step 7 (QC Rework)</strong>
                              <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: 2 }}>High rate of Solder bridge failures</div>
                            </div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#ef4444' }}>8 reworks</span>
                          </div>

                          <div style={{ padding: 10, background: 'rgba(245, 158, 11, 0.05)', borderRadius: 8, border: '1px solid rgba(245, 158, 11, 0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                            <div>
                              <strong style={{ fontSize: '0.75rem', color: '#fcd34d' }}>Step 14 (Visual QC Vetting)</strong>
                              <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: 2 }}>Awaiting manager final sign-off</div>
                            </div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#f59e0b' }}>3 pending</span>
                          </div>
                        </div>
                      </div>

                      {/* PCB Failure Hotspot Heatmap Matrix */}
                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
                          <LayoutDashboard size={14} /> PCB Defect Heatmap Matrix
                        </h4>
                        <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', lineHeight: 1.4, margin: 0 }}>
                          Failure count by PCB component grid section:
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, textAlign: 'center', fontSize: '0.65rem', marginTop: 4 }}>
                          <div style={{ padding: '8px 2px', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', borderRadius: 6, color: '#fca5a5' }} title="Microcontroller Unit (High Defect Rate)">
                            <strong>MCU</strong>
                            <div style={{ fontSize: '0.55rem', fontWeight: 700, marginTop: 2 }}>8 Fails</div>
                          </div>
                          <div style={{ padding: '8px 2px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid #f59e0b', borderRadius: 6, color: '#fde047' }} title="Power Regulators (Medium Defect Rate)">
                            <strong>POWER</strong>
                            <div style={{ fontSize: '0.55rem', fontWeight: 700, marginTop: 2 }}>3 Fails</div>
                          </div>
                          <div style={{ padding: '8px 2px', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid #10b981', borderRadius: 6, color: '#a7f3d0' }} title="LED Pixel Driver Grid (Low Defect Rate)">
                            <strong>LED</strong>
                            <div style={{ fontSize: '0.55rem', fontWeight: 700, marginTop: 2 }}>1 Fail</div>
                          </div>
                          <div style={{ padding: '8px 2px', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid #10b981', borderRadius: 6, color: '#a7f3d0' }} title="Interface Connectors (Low Defect Rate)">
                            <strong>CONN</strong>
                            <div style={{ fontSize: '0.55rem', fontWeight: 700, marginTop: 2 }}>0 Fails</div>
                          </div>
                        </div>
                      </div>

                      {/* Clearance SLA Breach Risk Monitor */}
                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                          <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
                            <AlertCircle size={14} /> SLA Breach Risk Monitor
                          </h4>
                          <span style={{ fontSize: '0.62rem', color: '#ef4444', background: 'rgba(239, 68, 68, 0.15)', padding: '1px 6px', borderRadius: 4, fontWeight: 700, animation: 'pulse-danger 2s infinite' }}>RISK HIGH</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.7rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, padding: '6px 10px', background: 'rgba(239, 68, 68, 0.08)', borderRadius: 6, border: '1px solid rgba(239, 68, 68, 0.15)' }}>
                            <span style={{ fontFamily: 'monospace', color: '#fca5a5', fontWeight: 700 }}>ESRP2P5918E26128R0100</span>
                            <span style={{ color: '#ef4444', fontWeight: 800 }}>42 mins ago</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, padding: '6px 10px', background: 'rgba(255, 255, 255, 0.01)', borderRadius: 6, border: '1px solid rgba(255, 255, 255, 0.02)' }}>
                            <span style={{ fontFamily: 'monospace', color: '#fff' }}>ESRP2P5919E26128R0382</span>
                            <span style={{ color: 'var(--text-muted)' }}>18 mins ago</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Vetting Clearance Queue */}
                    <div className="glass-panel" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
                      <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--color-primary)', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 8 }}>
                        Pending Clearance Queue ({approvalsData.length})
                      </h3>

                      <div style={{ flex: 1, overflowY: 'auto', maxHeight: '420px', paddingRight: 4, display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {approvalsData.length === 0 ? (
                          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                            <CheckCircle size={36} color="#ffd400" style={{ display: 'block', margin: '0 auto 12px auto', opacity: 0.8 }} />
                            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fff', marginBottom: 6 }}>Clearance Queue Clear</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 0, margin: 0 }}>
                              No pending shop floor logs are currently awaiting your verification approval.
                            </p>
                          </div>
                        ) : (
                          approvalsData.map(log => (
                            <div key={log.id} style={{ padding: 16, borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.015)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
                                <div>
                                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>ENGINEER: {log.engineer_name}</span>
                                  <h4 style={{ fontSize: '0.9rem', fontWeight: 800, margin: '2px 0 0 0' }}>{log.barcode}</h4>
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

                                {((user.role === 'Team Lead' && log.approval_status === 'Pending Team Lead') ||
                                  (['Superadmin', 'Manager'].includes(user.role) && log.approval_status === 'Pending Manager')) && (
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
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
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

                  <div className="widescreen-grid equal-cols">
                    {/* Left Column: Podium & Yield Stats unified in a single glass-panel */}
                    <div className="glass-panel" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
                      {leaderboardData.length >= 3 ? (
                        <>
                          <div>
                            <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--color-primary)', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 8, marginBottom: 20 }}>Monthly Top Performers</h3>
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 10, height: 160, background: 'rgba(255,255,255,0.01)', borderRadius: 16, padding: 10 }}>
                              
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
                          </div>
                          
                          {/* Live stats highlight card inside Left Panel */}
                          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-blue)', margin: 0 }}>Shop Floor Yield Stats</h4>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4, margin: 0 }}>
                              Scores are auto-computed based on step completion speed, quantity processed, and quality vetting approvals with zero rework cycles.
                            </p>
                          </div>
                        </>
                      ) : (
                        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0' }}>
                          Recalculating performer scores...
                        </div>
                      )}
                    </div>

                    {/* Right Column: Full Leaderboard list unified in a single glass-panel */}
                    <div className="glass-panel" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--color-primary)', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 8 }}>Employee Leaderboard</h3>
                      <div className="leaderboard-list" style={{ flex: 1, overflowY: 'auto', maxHeight: '480px', paddingRight: 4, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {leaderboardData.map((leader, index) => {
                          const rankClass = index === 0 ? 'rank-1' : index === 1 ? 'rank-2' : index === 2 ? 'rank-3' : 'rank-other';
                          return (
                            <div key={leader.id} className="leader-item glass-panel" style={{ background: 'rgba(255,255,255,0.01)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.02)', margin: 0 }}>
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
                </div>
              )}

              {view === 'users' && user.role === 'Superadmin' && (
                <div>
                  <div className="app-header">
                    <div>
                      <span className="app-subtitle">Administrative Controls</span>
                      <h1 className="app-title"><Users size={20} color="#ffd400" /> User Management Control Center</h1>
                    </div>
                    <button onClick={fetchAdminUsers} style={{ background: 'none', border: 'none', color: '#ffd400', cursor: 'pointer' }} title="Refresh accounts directory">
                      <RefreshCw size={18} className={adminUsersLoading ? 'spin' : ''} />
                    </button>
                  </div>

                  <div className="widescreen-grid">
                    {/* Left Column: Create New Account Form */}
                    <div className="glass-panel" style={{ padding: 20, height: 'fit-content' }}>
                      <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--color-primary)', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 8, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Plus size={16} /> Provision New Team Member
                      </h3>
                      
                      <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div style={{ display: 'flex', gap: 12 }}>
                          <div className="form-group" style={{ flex: 1 }}>
                            <label>First Name</label>
                            <input 
                              type="text" 
                              required 
                              placeholder="e.g. Mayuri"
                              value={newUserForm.firstName || ''}
                              onChange={e => setNewUserForm({...newUserForm, firstName: e.target.value})}
                              style={{ width: '100%' }}
                            />
                          </div>
                          <div className="form-group" style={{ flex: 1 }}>
                            <label>Last Name</label>
                            <input 
                              type="text" 
                              required 
                              placeholder="e.g. Sharma"
                              value={newUserForm.lastName || ''}
                              onChange={e => setNewUserForm({...newUserForm, lastName: e.target.value})}
                              style={{ width: '100%' }}
                            />
                          </div>
                        </div>

                        {(() => {
                          const previewFirstName = newUserForm.firstName?.trim() || '';
                          const previewLastName = newUserForm.lastName?.trim() || '';
                          const capitalizeWord = (str) => {
                            if (!str) return '';
                            return str.charAt(0).toUpperCase() + str.slice(1);
                          };
                          const previewFormattedFirstName = previewFirstName.split(' ').map(capitalizeWord).join(' ');
                          const previewFormattedLastName = previewLastName.split(' ').map(capitalizeWord).join(' ');
                          const previewName = (previewFirstName || previewLastName) 
                            ? `${previewFormattedFirstName} ${previewFormattedLastName}`.trim() 
                            : '';

                          const previewCleanFirstName = previewFirstName.toLowerCase().replace(/\s+/g, '');
                          const previewFirstLetter = previewLastName ? previewLastName.charAt(0).toLowerCase() : '';
                          const previewEmail = previewFirstName 
                            ? `${previewCleanFirstName}.${previewFirstLetter || '?' }@electrolytesoln.com` 
                            : '';
                          const defaultPassword = 'Electrolyte2026!';
                          
                          if (!previewFirstName && !previewLastName) return null;

                          return (
                            <div className="glass-panel" style={{
                              padding: '16px',
                              background: 'rgba(255, 212, 0, 0.02)',
                              borderColor: 'rgba(255, 212, 0, 0.15)',
                              borderRadius: '12px',
                              marginTop: '2px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '12px'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#ffd400', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 5 }}>
                                  <ShieldCheck size={14} color="#ffd400" /> Automated Vitals Preview
                                </span>
                                <span style={{ fontSize: '0.7rem', padding: '2px 8px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '12px', fontWeight: 700 }}>
                                  Ready to Sync
                                </span>
                              </div>
                              
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, fontSize: '0.8rem', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '6px' }}>
                                  <span style={{ color: 'var(--text-muted)' }}>Display Name:</span>
                                  <span style={{ fontWeight: 700, color: '#fff' }}>{previewName || '—'}</span>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, fontSize: '0.8rem', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '6px' }}>
                                  <span style={{ color: 'var(--text-muted)' }}>Login Email:</span>
                                  <span style={{ fontWeight: 700, color: '#ffd400', fontFamily: 'monospace' }}>{previewEmail || '—'}</span>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, fontSize: '0.8rem' }}>
                                  <span style={{ color: 'var(--text-muted)' }}>Login Password:</span>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontWeight: 700, color: '#fff', fontFamily: 'monospace' }}>
                                      {showPassword ? defaultPassword : '••••••••••••••••'}
                                    </span>
                                    <button 
                                      type="button" 
                                      onClick={() => setShowPassword(!showPassword)} 
                                      style={{ background: 'none', border: 'none', color: '#ffd400', cursor: 'pointer', padding: '0 4px', fontSize: '0.7rem', fontWeight: 700 }}
                                    >
                                      {showPassword ? 'HIDE' : 'SHOW'}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                        <div className="form-group">
                          <label>Access Role</label>
                          <select
                            value={newUserForm.role}
                            onChange={e => setNewUserForm({...newUserForm, role: e.target.value})}
                            style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.4)', color: '#fff', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}
                          >
                            <option value="Employee">Employee (Operations Terminal Entry Only)</option>
                            <option value="Team Lead">Team Lead (Operation Entry + Step clearance Level 1)</option>
                            <option value="Manager">Manager (Operation Entry + final Step approvals)</option>
                            <option value="Superadmin">Superadmin (All privileges + User Management)</option>
                          </select>
                        </div>

                        <div className="form-group">
                          <label>Starting Attendance Rating (%)</label>
                          <input 
                            type="number" 
                            step="0.1"
                            min="0"
                            max="100"
                            required 
                            placeholder="e.g. 95.0"
                            value={newUserForm.attendance_rate}
                            onChange={e => setNewUserForm({...newUserForm, attendance_rate: e.target.value})}
                          />
                        </div>

                        <button 
                          type="submit" 
                          className="btn btn-primary" 
                          disabled={isSubmittingUser}
                          style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                        >
                          {isSubmittingUser ? (
                            <>
                              <RefreshCw size={14} className="spin" /> Provisioning Account...
                            </>
                          ) : (
                            <>
                              <Plus size={14} /> Provision Team Member
                            </>
                          )}
                        </button>
                      </form>
                    </div>

                    {/* Right Column: Accounts Directory */}
                    <div className="glass-panel" style={{ padding: 20 }}>
                      <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--color-primary)', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 8, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Activity size={16} /> Active System Accounts ({adminUsers.length})
                      </h3>

                      {adminUsersLoading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '60px 0', flexDirection: 'column', gap: 12 }}>
                          <RefreshCw className="spin" size={24} color="#ffd400" />
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Refreshing Directory...</span>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '600px', overflowY: 'auto', paddingRight: '4px' }}>
                          {adminUsers.map((item) => {
                            // Determine role color
                            let badgeClass = 'badge-success'; // Employee
                            if (item.role === 'Team Lead') badgeClass = 'badge-warning';
                            else if (item.role === 'Manager') badgeClass = 'badge-info';
                            else if (item.role === 'Superadmin') badgeClass = 'badge-danger';

                            const isSelf = item.id === user.id;

                            return (
                              <div 
                                key={item.id} 
                                className="leader-item glass-panel" 
                                style={{ 
                                  background: item.is_active ? 'rgba(255,255,255,0.01)' : 'rgba(239, 68, 68, 0.02)', 
                                  borderRadius: 12, 
                                  border: item.is_active ? '1px solid rgba(255,255,255,0.02)' : '1px solid rgba(239, 68, 68, 0.08)',
                                  margin: 0,
                                  opacity: item.is_active ? 1 : 0.65,
                                  padding: 12
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', justifyContent: 'space-between' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <img src={item.avatar} alt={item.name} className="leader-avatar" style={{ width: 36, height: 36, border: '1.5px solid rgba(255,255,255,0.05)' }} />
                                    <div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span className="leader-name" style={{ fontSize: '0.8rem', fontWeight: 800 }}>{item.name}</span>
                                        <span className={`badge ${badgeClass}`} style={{ fontSize: '0.52rem', padding: '2px 6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                          {item.role}
                                        </span>
                                        {isSelf && (
                                          <span style={{ fontSize: '0.55rem', background: 'rgba(255,255,255,0.08)', color: '#fff', padding: '1px 4px', borderRadius: 4 }}>
                                            You
                                          </span>
                                        )}
                                      </div>
                                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', marginTop: 2 }}>
                                        {item.email} • Attendance: {parseFloat(item.attendance_rate)}%
                                      </span>
                                    </div>
                                  </div>

                                  <div>
                                    <button
                                      onClick={() => handleToggleUserStatus(item.id)}
                                      disabled={isSelf}
                                      style={{
                                        background: item.is_active ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                                        border: `1px solid ${item.is_active ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
                                        color: item.is_active ? '#10b981' : '#ef4444',
                                        padding: '4px 10px',
                                        borderRadius: '30px',
                                        cursor: isSelf ? 'not-allowed' : 'pointer',
                                        fontSize: '0.62rem',
                                        fontWeight: 800,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px',
                                        opacity: isSelf ? 0.4 : 1
                                      }}
                                      title={isSelf ? "You cannot deactivate your own account" : `Click to ${item.is_active ? 'deactivate' : 'activate'} this user`}
                                    >
                                      {item.is_active ? 'Active' : 'Inactive'}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

        </main>

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

            {user.role === 'Superadmin' && (
              <button 
                onClick={() => setView('users')} 
                className={`nav-item ${view === 'users' ? 'active' : ''}`}
              >
                <Users />
                Users
              </button>
            )}
          </div>
        )}


      {/* MODAL: Lot Panel History Audit */}
      {showHistoryModal && selectedLotHistory && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="glass-panel" style={{ width: '90%', maxWidth: 460, maxHeight: '80vh', overflowY: 'auto', padding: 20, borderColor: '#ffd400', background: '#111827' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
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
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, padding: 10, background: 'rgba(255,255,255,0.02)', borderRadius: 8, fontSize: '0.78rem' }}>
                    <div>
                      <div style={{ fontWeight: 800 }}>{p.barcode}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>Sr No {p.sr_no} • {p.side} Side • Operator: {p.engineer_name || 'Unassigned'}</div>
                    </div>
                    <span className={`badge ${p.status === 'Scrap' ? 'badge-danger' : p.current_step === 12 ? 'badge-success' : 'badge-warning'}`}>
                      {p.status === 'Scrap' ? 'Scrap' : p.current_step === 12 ? 'Dispatched' : `Step ${p.current_step}`}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
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
