import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export default function CustomSelect({ value, onChange, children, style, className, required }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Extract options from children (which are <option> tags)
  const options = React.Children.toArray(children)
    .filter(child => child && child.type === 'option')
    .map(child => ({
      value: child.props.value !== undefined ? child.props.value : child.props.children,
      label: child.props.children
    }));

  const selectedOption = options.find(opt => opt.value === value) || options[0];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (selectedValue) => {
    if (onChange) {
      onChange({ target: { value: selectedValue } });
    }
    setIsOpen(false);
  };

  return (
    <div 
      ref={dropdownRef}
      className={`custom-select-container ${className || ''}`}
      style={{ position: 'relative', width: style?.width || '100%' }}
    >
      <div 
        className="custom-select-trigger" 
        onClick={() => setIsOpen(!isOpen)}
        style={style}
      >
        <span className="custom-select-value">
          {selectedOption ? selectedOption.label : 'Select...'}
        </span>
        <ChevronDown size={16} className={`custom-select-icon ${isOpen ? 'open' : ''}`} />
      </div>
      
      {isOpen && (
        <div className="custom-select-menu">
          {options.map((opt, idx) => (
            <div 
              key={idx}
              className={`custom-select-option ${opt.value === value ? 'selected' : ''}`}
              onClick={() => handleSelect(opt.value)}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
      
      {/* Hidden input for native required validation support */}
      {required && (
        <input 
          type="text"
          value={value || ''}
          onChange={() => {}}
          required={required}
          style={{ position: 'absolute', opacity: 0, height: 0, width: 0, zIndex: -1 }}
        />
      )}
    </div>
  );
}
