"use client";

import { useEffect, useRef, useState } from 'react';

export type FilterDropdownOption = {
  value: string;
  label: string;
};

export function FilterDropdown({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string;
  value: string;
  options: FilterDropdownOption[];
  onChange: (nextValue: string) => void;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const selectedOption = options.find((option) => option.value === value) ?? options[0];

  return (
    <div className={`services-filter-dropdown ${className ?? ''}`.trim()} ref={containerRef}>
      <button
        type="button"
        className={`services-filter-dropdown-trigger ${isOpen ? 'is-open' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <span className="services-filter-dropdown-value">{selectedOption?.label ?? label}</span>
        <span className="services-filter-dropdown-chevron" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false">
            <path
              d="m6 9 6 6 6-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>

      {isOpen && (
        <div className="services-filter-dropdown-menu" role="listbox" aria-label={label}>
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value || '__all__'}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={`services-filter-dropdown-option ${isSelected ? 'is-selected' : ''}`}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
              >
                <span className="services-filter-dropdown-check" aria-hidden="true">
                  {isSelected ? (
                    <svg viewBox="0 0 24 24" focusable="false">
                      <path
                        d="m5 12 4.2 4.2L19 6.8"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : null}
                </span>
                <span className="services-filter-dropdown-option-label">{option.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
