import React from 'react';
import { X } from 'lucide-react';

const TransactionHistoryModal = ({ isOpen, onClose, selectedLotTransactions, transactionsLotNo }) => {
  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'var(--input-bg)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div className="glass-panel" style={{ width: '90%', maxWidth: 460, maxHeight: '80vh', overflowY: 'auto', padding: 20, borderColor: 'var(--color-primary)', background: '#111827' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-primary)' }}>Lot {transactionsLotNo} - Stock Transaction History</h3>
          <button 
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>
        
        {(!selectedLotTransactions || selectedLotTransactions.length === 0) ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic', textAlign: 'center', padding: 20 }}>No transaction logs recorded for this lot yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'relative', paddingLeft: 12, borderLeft: '2px solid rgba(255,255,255,0.05)', marginLeft: 8 }}>
            {selectedLotTransactions.map(trans => {
              const isCompletionAuto = trans.remarks && trans.remarks.includes('auto-completed');
              const pillColor = trans.transaction_type === 'Inward' ? 'var(--color-primary)' : trans.transaction_type === 'Outward' ? '#10b981' : trans.transaction_type === 'Return' ? '#ef4444' : trans.transaction_type === 'Redispatch' ? '#3b82f6' : '#8b5cf6';
              
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
  );
};

export default TransactionHistoryModal;
