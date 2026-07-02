import React from 'react';
import { LayoutDashboard, Package, Wrench, ShieldCheck, Trophy, Users, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NavigationHeader = ({ view, setView, showToast }) => {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
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
  );
};

export default NavigationHeader;
