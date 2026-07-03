import React from 'react';
import { AlertCircle } from 'lucide-react';

const ToastNotification = ({ notification }) => {
  if (!notification) return null;

  return (
    <div 
      className={`badge ${notification.type === 'danger' ? 'badge-danger' : notification.type === 'warning' ? 'badge-warning' : 'badge-success'}`}
      style={{
        position: 'fixed',
        top: '80px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        justifyContent: 'center',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
        padding: '12px 24px',
        width: 'auto',
        maxWidth: '90%',
        minWidth: 260,
        background: 'rgba(17, 24, 39, 0.95)',
        backdropFilter: 'blur(16px)',
        border: `1.5px solid ${
          notification.type === 'danger' 
            ? 'var(--color-danger)' 
            : notification.type === 'warning' 
              ? 'var(--color-warning)' 
              : 'var(--color-primary)'
        }`,
        borderRadius: '30px',
        fontSize: '0.8rem',
        fontWeight: 800,
        color: 'var(--text-main)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        animation: 'none'
      }}
    >
      <AlertCircle size={14} color={
        notification.type === 'danger' 
          ? 'var(--color-danger)' 
          : notification.type === 'warning' 
            ? 'var(--color-warning)' 
            : 'var(--color-primary)'
      } />
      {notification.message}
    </div>
  );
};

export default ToastNotification;
