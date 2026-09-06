'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string;
}

interface CustomSelectProps {
  value: string | null;
  onChange: (val: string) => void;
  options: SelectOption[];
  placeholder?: string;
  label?: string;
  className?: string;
  disabled?: boolean;
}

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Select an option',
  label,
  className = '',
  disabled = false,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(o => o.value === value);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider">{label}</label>}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
          disabled
            ? 'bg-zinc-900/50 border-zinc-800 text-zinc-600 cursor-not-allowed'
            : 'bg-zinc-900 border-zinc-800 text-zinc-200 hover:border-zinc-700 active:scale-[0.99]'
        }`}
      >
        <span className="flex items-center gap-2 truncate">
          {selectedOption?.icon}
          <span className={selectedOption ? 'text-zinc-100 font-medium' : 'text-zinc-500'}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </span>
        <ChevronDown size={16} className={`text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1.5 w-full bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl py-1 max-h-60 overflow-y-auto animate-fade-in">
          {options.length === 0 ? (
            <div className="px-3 py-2 text-xs text-zinc-500">No options available</div>
          ) : (
            options.map(option => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2 text-sm text-left transition-colors ${
                    isSelected
                      ? 'bg-indigo-600/15 text-indigo-400 font-medium'
                      : 'text-zinc-300 hover:bg-zinc-800/70 hover:text-zinc-100'
                  }`}
                >
                  <span className="flex items-center gap-2 truncate">
                    {option.icon}
                    <span>{option.label}</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    {option.badge && (
                      <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full font-mono">
                        {option.badge}
                      </span>
                    )}
                    {isSelected && <Check size={14} className="text-indigo-400" />}
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
