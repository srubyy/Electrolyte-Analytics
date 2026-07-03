import React from 'react';
import { ShieldAlert } from 'lucide-react';

const StationChecklist = ({ 
  esdWristStrap, 
  setEsdWristStrap, 
  ionizerOn, 
  setIonizerOn, 
  esdMatGrounded, 
  setEsdMatGrounded 
}) => {
  const isSafe = esdWristStrap && ionizerOn && esdMatGrounded;

  return (
    <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 16 }}>
      <h4 style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
        <ShieldAlert size={14} color='var(--color-primary)' /> ESD Station Safety Readiness
      </h4>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '0.72rem', color: esdWristStrap ? '#fff' : 'var(--text-muted)' }}>
          <input 
            type="checkbox" 
            checked={esdWristStrap} 
            onChange={e => setEsdWristStrap(e.target.checked)} 
            style={{ width: 14, height: 14, cursor: 'pointer', accentColor: 'var(--color-primary)' }} 
          />
          <span>ESD Wrist Strap Connected (Tested &lt;1.0 MΩ)</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '0.72rem', color: ionizerOn ? '#fff' : 'var(--text-muted)' }}>
          <input 
            type="checkbox" 
            checked={ionizerOn} 
            onChange={e => setIonizerOn(e.target.checked)} 
            style={{ width: 14, height: 14, cursor: 'pointer', accentColor: 'var(--color-primary)' }} 
          />
          <span>Clean Air Ionizer Operational</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '0.72rem', color: esdMatGrounded ? '#fff' : 'var(--text-muted)' }}>
          <input 
            type="checkbox" 
            checked={esdMatGrounded} 
            onChange={e => setEsdMatGrounded(e.target.checked)} 
            style={{ width: 14, height: 14, cursor: 'pointer', accentColor: 'var(--color-primary)' }} 
          />
          <span>Anti-Static Desk Mat Properly Grounded</span>
        </label>
      </div>

      <div style={{ 
        marginTop: 10, 
        padding: '6px 12px', 
        borderRadius: 6, 
        background: isSafe ? 'rgba(16, 185, 129, 0.06)' : 'rgba(245, 158, 11, 0.05)',
        border: isSafe ? '1px solid rgba(16, 185, 129, 0.15)' : '1px solid rgba(245, 158, 11, 0.1)',
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        gap: 6,
        fontSize: '0.62rem', 
        fontWeight: 800, 
        color: isSafe ? '#10b981' : '#f59e0b',
        transition: 'all 0.3s'
      }}>
        {isSafe ? (
          <>🛡️ STATION SAFE • ESD IPC COMPLIANT</>
        ) : (
          <>⚠️ STATION WARNING • RUN READINESS CHECKLIST</>
        )}
      </div>
    </div>
  );
};

export default StationChecklist;
