import React, { useState, useEffect } from 'react';
import { Users, RefreshCw, Plus, ShieldCheck, Activity, ToggleLeft, ToggleRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const SettingsPage = ({ showToast }) => {
  const { user, apiFetch } = useAuth();
  
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminUsersLoading, setAdminUsersLoading] = useState(false);
  
  const [newUserForm, setNewUserForm] = useState({ firstName: '', lastName: '', role: 'Employee', attendance_rate: '95.0' });
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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

  useEffect(() => {
    if (user && user.role === 'Superadmin') {
      fetchAdminUsers();
    }
  }, [user]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!user || user.role !== 'Superadmin') return;
    
    const firstName = newUserForm.firstName?.trim() || '';
    const lastName = newUserForm.lastName?.trim() || '';
    
    if (!firstName || !lastName) {
      showToast('Both First Name and Last Name are required.', 'danger');
      return;
    }
    
    const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);
    const formattedFirstName = firstName.split(' ').map(capitalize).join(' ');
    const formattedLastName = lastName.split(' ').map(capitalize).join(' ');
    const name = `${formattedFirstName} ${formattedLastName}`;
    
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

  return (
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

            {(previewFirstName || previewLastName) && (
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
            )}

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
                let badgeClass = 'badge-success';
                if (item.role === 'Team Lead') badgeClass = 'badge-warning';
                else if (item.role === 'Manager') badgeClass = 'badge-info';
                else if (item.role === 'Superadmin') badgeClass = 'badge-danger';

                const isSelf = item.id === user?.id;

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
  );
};

export default SettingsPage;
