import React from 'react';

const PerformerListItem = ({ leader, index }) => {
  const rankClass = index === 0 ? 'rank-1' : index === 1 ? 'rank-2' : index === 2 ? 'rank-3' : 'rank-other';

  return (
    <div className="leader-item glass-panel" style={{ background: 'var(--card-bg)', borderRadius: 12, border: '1px solid var(--card-border)', margin: 0 }}>
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
};

export default PerformerListItem;
