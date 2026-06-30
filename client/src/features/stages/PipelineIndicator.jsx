import React from 'react';

const STEP_NAMES = [
  "Inward",
  "Segregation",
  "Programming",
  "1st Testing",
  "Debug",
  "Entry",
  "Cleaning",
  "QC After Cleaning",
  "Marking & Coating",
  "Final Testing",
  "Packing",
  "Final Entry"
];

const PipelineIndicator = ({ 
  selectedStep, 
  onSelectStep, 
  onViewStepPanels 
}) => {
  return (
    <div className="pipeline-step-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }}>
      {STEP_NAMES.map((name, index) => {
        const stepNo = index + 1;
        const isActive = selectedStep === stepNo;
        return (
          <div
            key={stepNo}
            onClick={() => onSelectStep(stepNo)}
            style={{
              padding: '10px 8px',
              borderRadius: 8,
              background: isActive ? 'rgba(255, 212, 0, 0.08)' : 'rgba(255,255,255,0.015)',
              border: isActive ? '1px solid #ffd400' : '1px solid rgba(255,255,255,0.03)',
              cursor: 'pointer',
              textAlign: 'center',
              transition: 'all 0.2s',
              boxShadow: isActive ? '0 0 10px rgba(255, 212, 0, 0.15)' : 'none'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
              <span style={{ fontSize: '0.7rem', color: isActive ? '#ffd400' : 'var(--text-muted)', fontWeight: 800 }}>Step {stepNo}</span>
              <span 
                onClick={(e) => {
                  e.stopPropagation();
                  onViewStepPanels(stepNo);
                }}
                style={{
                  fontSize: '0.62rem',
                  color: '#ffd400',
                  background: 'rgba(255, 212, 0, 0.1)',
                  border: '1px solid rgba(255, 212, 0, 0.2)',
                  borderRadius: 4,
                  padding: '1px 5px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontWeight: 700
                }}
                title="View Panels details at this step"
              >
                🔍 Panels
              </span>
            </div>
            <div style={{ fontSize: '0.72rem', fontWeight: isActive ? 800 : 500, color: isActive ? '#fff' : '#cbd5e1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 }}>
              {name}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default PipelineIndicator;
export { STEP_NAMES };
