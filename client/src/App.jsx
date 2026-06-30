import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';

// Import Shared components
import NavigationHeader from './shared/NavigationHeader';
import BottomNavigation from './shared/BottomNavigation';
import ToastNotification from './shared/ToastNotification';

// Import Pages
import AuthPage from './pages/Auth/AuthPage';
import DashboardPage from './pages/Dashboard/DashboardPage';
import LotsPage from './pages/Lots/LotsPage';
import WorkflowsPage from './pages/Workflows/WorkflowsPage';
import ReportsPage from './pages/Reports/ReportsPage';
import EngineersPage from './pages/Engineers/EngineersPage';
import SettingsPage from './pages/Settings/SettingsPage';

function App() {
  const { user, loading } = useAuth();
  const [view, setView] = useState('dashboard');
  const [barcodeSearch, setBarcodeSearch] = useState('');
  const [notification, setNotification] = useState(null);

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  useEffect(() => {
    if (user) {
      if (user.role === 'Employee') {
        setView('repair');
      } else {
        setView('dashboard');
      }
    }
  }, [user]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#0b0f19', color: '#ffd400', fontFamily: 'sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ border: '4px solid rgba(255, 212, 0, 0.1)', borderLeftColor: '#ffd400', borderRadius: '50%', width: 40, height: 40, animation: 'spin 1s linear infinite', margin: '0 auto 16px auto' }}></div>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
          <div>Initializing System...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <ToastNotification notification={notification} />
        <AuthPage showToast={showToast} />
      </>
    );
  }

  return (
    <div className="app-layout">
      {/* Top desktop header bar */}
      <NavigationHeader view={view} setView={setView} showToast={showToast} />
      
      {/* Main Container Area */}
      <main className="app-main-content">
        <ToastNotification notification={notification} />
        
        {view === 'dashboard' && (
          <DashboardPage 
            setView={setView} 
            setBarcodeSearch={setBarcodeSearch} 
            showToast={showToast} 
          />
        )}
        {view === 'stock' && (
          <LotsPage showToast={showToast} />
        )}
        {view === 'repair' && (
          <WorkflowsPage 
            barcodeSearch={barcodeSearch} 
            setBarcodeSearch={setBarcodeSearch} 
            showToast={showToast} 
          />
        )}
        {view === 'approvals' && user.role !== 'Employee' && (
          <ReportsPage showToast={showToast} />
        )}
        {view === 'leaderboard' && (
          <EngineersPage showToast={showToast} />
        )}
        {view === 'users' && user.role === 'Superadmin' && (
          <SettingsPage showToast={showToast} />
        )}
      </main>
      
      {/* Bottom mobile navigation menu */}
      <BottomNavigation view={view} setView={setView} />
    </div>
  );
}

export default App;
