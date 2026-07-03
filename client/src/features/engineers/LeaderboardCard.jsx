import React from 'react';
import { Trophy } from 'lucide-react';

const LeaderboardCard = ({ leaderboardData }) => {
  if (!leaderboardData || leaderboardData.length < 3) {
    return (
      <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0' }}>
        Recalculating Monthly Performers...
      </div>
    );
  }

  return (
    <div>
      <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--color-primary)', borderBottom: '1px solid var(--card-border)', paddingBottom: 8, marginBottom: 20 }}>Monthly Top Performers</h3>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 10, height: 160, background: 'var(--card-bg)', borderRadius: 16, padding: 10 }}>
        
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
  );
};

export default LeaderboardCard;
