import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import './LanguageSelector.css';

export default function LanguageSelector() {
  const { currentLanguage, setLanguage, SUPPORTED_LANGUAGES } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const current = SUPPORTED_LANGUAGES.find(l => l.code === currentLanguage) || SUPPORTED_LANGUAGES[0];

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleSelect(code) {
    setLanguage(code);
    setOpen(false);
  }

  return (
    <div className="lang-selector" ref={ref}>
      <button className="lang-btn" onClick={() => setOpen(!open)} aria-label="Select language">
        <span className="lang-flag">{current.flag}</span>
        <span className="lang-code">{current.code.toUpperCase()}</span>
        <span className="lang-chevron">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="lang-dropdown">
          {SUPPORTED_LANGUAGES.map(lang => (
            <button
              key={lang.code}
              className={`lang-option ${lang.code === currentLanguage ? 'lang-option--active' : ''}`}
              onClick={() => handleSelect(lang.code)}
            >
              <span className="lang-flag">{lang.flag}</span>
              <span className="lang-option-name">{lang.name}</span>
              {lang.code === currentLanguage && <span className="lang-check">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
