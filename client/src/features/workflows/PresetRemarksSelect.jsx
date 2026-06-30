import React from 'react';

export const REMARK_PRESETS = {
  2: [
    "No visible physical damage or corrosion",
    "Minor oxidation on pads, salvageable",
    "PCB physically cracked, designated for scrap",
    "Liquid damage detected, corrosion on power rail",
    "Lot inspection complete"
  ],
  4: [
    "All parameters within standard limits",
    "High failed rate due to programming issues",
    "Minor calibration failures",
    "IC response timeout detected",
    "Failed board sent to Debug station"
  ],
  5: [
    "Replaced faulty oscillator IC",
    "Power line short circuit repaired",
    "Minor solder bridging resolved",
    "Critical microcontroller defect - board scrapped",
    "PCB restored and functional"
  ],
  7: [
    "Flux residues completely removed via ultrasonic cleaning",
    "Surface contamination cleared",
    "Isopropyl Alcohol (IPA) clean cycle done",
    "Board rejected due to solder mask peeling"
  ],
  8: [
    "IPC-A-610 Class 2 standards verified",
    "Flux completely cleared, board pristine",
    "Minor solder bridge caught and reworked",
    "Solder joint voids found under QFN"
  ],
  9: [
    "Conformal coating applied uniformly",
    "Silicone thermal paste applied",
    "Serial labels verified and affixed"
  ],
  10: [
    "Passes high-voltage burn-in test",
    "All parameters within 100% IPC standards",
    "Failed board sent to rework loop"
  ],
  11: [
    "Antistatic ESD bubble wrap pack completed",
    "Standard corrugated carton box pack",
    "Bulk shipment box prepared"
  ]
};

const PresetRemarksSelect = ({ stepNo, stepInputs, setStepInputs }) => {
  const presets = REMARK_PRESETS[stepNo] || ["Log entry updated", "Standard procedure complete"];
  const currentRemark = stepInputs.remarks || '';
  
  const isPreset = presets.includes(currentRemark) || currentRemark === '';

  return (
    <div className="form-group" style={{ marginTop: 12 }}>
      <label>Remarks</label>
      <select
        value={isPreset ? currentRemark : 'custom'}
        onChange={e => {
          const val = e.target.value;
          if (val === 'custom') {
            setStepInputs(prev => ({ ...prev, remarks: '' }));
          } else {
            setStepInputs(prev => ({ ...prev, remarks: val }));
          }
        }}
        style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', color: '#fff', borderRadius: 8, width: '100%', cursor: 'pointer', marginBottom: 8 }}
      >
        <option value="">-- Select Standard Remark --</option>
        {presets.map((preset, idx) => (
          <option key={idx} value={preset}>{preset}</option>
        ))}
        <option value="custom">Custom Write-in...</option>
      </select>
      
      {(!isPreset || currentRemark === '' || stepInputs.remarks === undefined) && (
        <input
          type="text"
          required
          placeholder="Type custom remark here..."
          value={stepInputs.remarks || ''}
          onChange={e => setStepInputs(prev => ({ ...prev, remarks: e.target.value }))}
          style={{ width: '100%', padding: '8px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', color: '#fff', borderRadius: 8 }}
        />
      )}
    </div>
  );
};

export default PresetRemarksSelect;
