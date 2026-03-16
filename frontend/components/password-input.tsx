"use client";

import { InputHTMLAttributes, useState } from 'react';

type PasswordInputProps = InputHTMLAttributes<HTMLInputElement>;

export function PasswordInput({ className = 'form-input', ...props }: PasswordInputProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="password-input-wrap">
      <input {...props} type={isVisible ? 'text' : 'password'} className={className} />
      <button
        type="button"
        className="password-toggle-button"
        aria-label={isVisible ? 'Nascondi password' : 'Mostra password'}
        aria-pressed={isVisible}
        onClick={() => setIsVisible((prev) => !prev)}
      >
        {isVisible ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 3l18 18" />
            <path d="M10.58 10.58a2 2 0 102.83 2.83" />
            <path d="M9.88 5.08A10.94 10.94 0 0112 5c5 0 9.27 3.11 11 7-1.02 2.29-2.8 4.23-5.08 5.42" />
            <path d="M6.61 6.61C4.62 7.87 3.09 9.79 2 12c1.73 3.89 6 7 10 7 1.41 0 2.77-.31 4-.88" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}
