import React from 'react';

const ApprovalsQueueItem = ({ log, user, onTLApprove, onManagerApprove, onReject }) => {
  return (
    <div style={{ padding: 16, borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.015)' }}>
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
        {user?.role === 'Team Lead' && log.approval_status === 'Pending Team Lead' && (
          <button 
            onClick={() => onTLApprove(log.id)}
            className="btn"
            style={{ flex: 1, padding: 8, margin: 0, fontSize: '0.72rem' }}
          >
            TL Vetting OK
          </button>
        )}

        {['Superadmin', 'Manager'].includes(user?.role) && log.approval_status === 'Pending Manager' && (
          <button 
            onClick={() => onManagerApprove(log.id)}
            className="btn"
            style={{ flex: 1, padding: 8, margin: 0, fontSize: '0.72rem', background: '#38bdf8', color: '#000' }}
          >
            Final Commit
          </button>
        )}

        {((user?.role === 'Team Lead' && log.approval_status === 'Pending Team Lead') ||
          (['Superadmin', 'Manager'].includes(user?.role) && log.approval_status === 'Pending Manager')) && (
          <button 
            onClick={() => onReject(log.id)}
            className="btn btn-secondary"
            style={{ flex: 0.6, padding: 8, margin: 0, fontSize: '0.72rem', borderColor: 'rgba(239, 68, 68, 0.4)', color: '#ef4444' }}
          >
            Reject
          </button>
        )}
      </div>
    </div>
  );
};

export default ApprovalsQueueItem;
