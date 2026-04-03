import React, { useState, useRef, useEffect } from 'react';
import { COUNTRIES, AFRICAN_COUNTRIES, DESTINATION_COUNTRIES } from '../data/countries';
import './CountrySelect.css';

export default function CountrySelect({ value, onChange, label, placeholder, filter, required }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  const list = filter === 'african' ? AFRICAN_COUNTRIES
             : filter === 'destination' ? DESTINATION_COUNTRIES
             : COUNTRIES;

  const filtered = search
    ? list.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.code.toLowerCase().includes(search.toLowerCase()))
    : list;

  const selected = list.find(c => c.name === value || c.code === value);

  useEffect(() => {
    function handleClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function select(country) {
    onChange(country.name);
    setOpen(false);
    setSearch('');
  }

  return (
    <div className="fg country-select" ref={ref}>
      {label && <label>{label}{required && ' *'}</label>}
      <div className={`cs-trigger ${open ? 'cs-open' : ''}`} onClick={() => setOpen(!open)}>
        {selected ? (
          <span className="cs-selected">
            <span className="cs-flag">{selected.flag}</span>
            {selected.name}
          </span>
        ) : (
          <span className="cs-placeholder">{placeholder || 'Select country…'}</span>
        )}
        <span className="cs-arrow">{open ? '▲' : '▼'}</span>
      </div>

      {open && (
        <div className="cs-dropdown">
          <input
            className="cs-search"
            type="text"
            placeholder="Search countries…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
          <div className="cs-list">
            {filtered.length === 0 && (
              <div className="cs-empty">No countries found</div>
            )}
            {/* Group by region */}
            {['Africa', 'Europe', 'North America', 'Asia', 'Middle East', 'Oceania', 'South America', 'Caribbean'].map(region => {
              const regionItems = filtered.filter(c => c.region === region);
              if (!regionItems.length) return null;
              return (
                <div key={region}>
                  <div className="cs-region">{region}</div>
                  {regionItems.map(c => (
                    <div
                      key={c.code}
                      className={`cs-item ${c.name === value ? 'cs-item-active' : ''}`}
                      onClick={() => select(c)}
                    >
                      <span className="cs-flag">{c.flag}</span>
                      <span>{c.name}</span>
                      <span className="cs-code">{c.code}</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
