import React from 'react';

const RejectionModal = ({ isOpen, onClose, onSubmit, rejectionReason, setRejectionReason }) => {
  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'var(--input-bg)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div className="glass-panel" style={{ width: '90%', maxWidth: 400, padding: 20, borderColor: '#ef4444', background: '#111827' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: 12, color: '#ef4444' }}>Quality Clearance Rejection</h3>
        
        <form onSubmit={onSubmit}>
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
            <button type="submit" className="btn" style={{ background: '#ef4444', color: 'var(--text-main)' }}>Submit Rejection</button>
            <button 
              type="button" 
              onClick={onClose} 
              className="btn btn-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RejectionModal;
