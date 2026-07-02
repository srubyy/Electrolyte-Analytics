import React from 'react';

const CloggedStepCard = ({ step, onClick }) => {
  const isClogged = step.count > 10;
  
  return (
    <div 
      className={`pipeline-step ${isClogged ? 'active-step' : ''}`}
      onClick={onClick}
      style={{ cursor: step.count > 0 ? 'pointer' : 'default' }}
    >
      <div className="step-info">
        <span className="step-number">{step.step_no}</span>
        <span className="step-name">{step.step_name}</span>
      </div>
      <span className="step-count" style={{
        color: isClogged ? '#fff' : step.count > 0 ? '#ffd400' : '#475569',
        background: isClogged ? '#ef4444' : 'rgba(255,255,255,0.03)'
      }}>
        {step.count}
      </span>
    </div>
  );
};

export default CloggedStepCard;
