import React, { useState, useEffect } from 'react';
import { Trophy, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

// Import feature components
import LeaderboardCard from '../../features/engineers/LeaderboardCard';
import PerformerListItem from '../../features/engineers/PerformerListItem';

const EngineersPage = ({ showToast }) => {
  const { user, apiFetch } = useAuth();
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/leaderboard');
      if (res.ok) {
        const data = await res.json();
        setLeaderboardData(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchLeaderboard();
    }
  }, [user]);

  return (
    <div>
      <div className="app-header">
        <div>
          <span className="app-subtitle">Live Performer Scores</span>
          <h1 className="app-title"><Trophy size={20} color="#ffd400" /> Leaderboard</h1>
        </div>
        <button 
          onClick={() => { fetchLeaderboard(); showToast("Leaderboard recalculated!"); }} 
          style={{ background: 'none', border: 'none', color: '#ffd400', cursor: 'pointer' }}
          disabled={loading}
        >
          <RefreshCw size={18} className={loading ? 'spin' : ''} />
        </button>
      </div>

      <div className="widescreen-grid equal-cols">
        {/* Left Column: Monthly Top Performers Podium */}
        <div className="glass-panel" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <LeaderboardCard leaderboardData={leaderboardData} />
          
          {leaderboardData.length >= 3 && (
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-blue)', margin: 0 }}>Shop Floor Yield Stats</h4>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4, margin: 0 }}>
                Scores are auto-computed based on step completion speed, quantity processed, and quality vetting approvals with zero rework cycles.
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Full Leaderboard List */}
        <div className="glass-panel" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--color-primary)', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 8 }}>
            Employee Leaderboard
          </h3>
          <div className="leaderboard-list" style={{ flex: 1, overflowY: 'auto', maxHeight: '480px', paddingRight: 4, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {leaderboardData.map((leader, index) => (
              <PerformerListItem key={leader.id} leader={leader} index={index} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EngineersPage;
