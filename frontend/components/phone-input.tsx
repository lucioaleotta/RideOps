"use client";

import { KeyboardEvent, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import 'flag-icons/css/flag-icons.min.css';
import './phone-input.css';

export type PhonePrefix = {
  codiceIso2: string;
  nomePaese: string;
  prefisso: string;
  principale: boolean;
};

const DEFAULT_ISO = 'IT';
const POPUP_WIDTH = 320;
const POPUP_HEIGHT = 340;

// Usato finché l'elenco completo non è disponibile o se la chiamata fallisce.
const FALLBACK_PREFIXES: PhonePrefix[] = [
  { codiceIso2: 'IT', nomePaese: 'Italia', prefisso: '+39', principale: true },
  { codiceIso2: 'AT', nomePaese: 'Austria', prefisso: '+43', principale: true },
  { codiceIso2: 'BE', nomePaese: 'Belgio', prefisso: '+32', principale: true },
  { codiceIso2: 'FR', nomePaese: 'Francia', prefisso: '+33', principale: true },
  { codiceIso2: 'DE', nomePaese: 'Germania', prefisso: '+49', principale: true },
  { codiceIso2: 'NL', nomePaese: 'Paesi Bassi', prefisso: '+31', principale: true },
  { codiceIso2: 'PT', nomePaese: 'Portogallo', prefisso: '+351', principale: true },
  { codiceIso2: 'GB', nomePaese: 'Regno Unito', prefisso: '+44', principale: true },
  { codiceIso2: 'ES', nomePaese: 'Spagna', prefisso: '+34', principale: true },
  { codiceIso2: 'US', nomePaese: 'Stati Uniti', prefisso: '+1', principale: true },
  { codiceIso2: 'CH', nomePaese: 'Svizzera', prefisso: '+41', principale: true }
];

let prefixesPromise: Promise<PhonePrefix[]> | null = null;

function loadPrefixes(): Promise<PhonePrefix[]> {
  if (!prefixesPromise) {
    prefixesPromise = Promise.resolve()
      .then(() => fetch('/api/prefissi-telefonici'))
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (!response.ok || !Array.isArray(payload) || payload.length === 0) {
          return FALLBACK_PREFIXES;
        }
        return payload as PhonePrefix[];
      })
      .catch(() => FALLBACK_PREFIXES);
  }
  return prefixesPromise;
}

function digitsOf(value: string) {
  return value.replace(/\D/g, '');
}

/** Separa il prefisso internazionale dal resto di un numero salvato come stringa unica. */
export function parsePhone(value: string, prefixes: PhonePrefix[]): { prefix: PhonePrefix | null; national: string } {
  const trimmed = value.trim();
  if (!trimmed.startsWith('+')) {
    return { prefix: null, national: trimmed };
  }

  const digits = digitsOf(trimmed);
  let best: PhonePrefix | null = null;
  let bestLength = 0;
  for (const candidate of prefixes) {
    const candidateDigits = digitsOf(candidate.prefisso);
    if (!digits.startsWith(candidateDigits)) continue;
    const longer = candidateDigits.length > bestLength;
    const preferred = candidateDigits.length === bestLength && candidate.principale && !best?.principale;
    if (longer || preferred) {
      best = candidate;
      bestLength = candidateDigits.length;
    }
  }
  if (!best) {
    return { prefix: null, national: trimmed };
  }

  let remaining = bestLength;
  let index = 1;
  while (index < trimmed.length && remaining > 0) {
    if (/\d/.test(trimmed[index])) remaining -= 1;
    index += 1;
  }
  return { prefix: best, national: trimmed.slice(index).replace(/^[\s-]+/, '') };
}

/** Unisce prefisso e numero nel formato unico atteso dal backend (es. "+39 3351122334"). */
export function joinPhone(prefix: PhonePrefix, national: string) {
  const cleaned = national.replace(/[^0-9\s-]/g, '').replace(/\s{2,}/g, ' ').replace(/^\s+/, '');
  return cleaned.trim() ? `${prefix.prefisso} ${cleaned}` : '';
}

type PhoneInputProps = {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  name?: string;
};

export function PhoneInput({ value, onChange, required, disabled, placeholder, name }: PhoneInputProps) {
  const [prefixes, setPrefixes] = useState<PhonePrefix[]>(FALLBACK_PREFIXES);
  const parsed = useMemo(() => parsePhone(value, prefixes), [value, prefixes]);
  const [iso, setIso] = useState(parsed.prefix?.codiceIso2 ?? DEFAULT_ISO);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const listId = useId();

  useEffect(() => {
    let cancelled = false;
    loadPrefixes().then((list) => {
      if (!cancelled) setPrefixes(list);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Un valore caricato dall'esterno con un prefisso diverso aggiorna il paese mostrato.
  useEffect(() => {
    if (!parsed.prefix || parsed.prefix.codiceIso2 === iso) return;
    const current = prefixes.find((item) => item.codiceIso2 === iso);
    if (!current || current.prefisso !== parsed.prefix.prefisso) {
      setIso(parsed.prefix.codiceIso2);
    }
  }, [parsed.prefix, prefixes, iso]);

  const current = prefixes.find((item) => item.codiceIso2 === iso) ?? prefixes[0];

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('it-IT');
    if (!needle) return prefixes;
    const needleDigits = digitsOf(needle);
    return prefixes.filter((item) =>
      item.nomePaese.toLocaleLowerCase('it-IT').includes(needle)
      || item.codiceIso2.toLowerCase() === needle
      || (needleDigits !== '' && digitsOf(item.prefisso).startsWith(needleDigits))
    );
  }, [prefixes, query]);

  function openPopup() {
    if (disabled || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const fitsBelow = rect.bottom + POPUP_HEIGHT + 8 <= window.innerHeight;
    setPopupPosition({
      top: fitsBelow ? rect.bottom + 4 : Math.max(8, rect.top - POPUP_HEIGHT - 4),
      left: Math.max(8, Math.min(rect.left, window.innerWidth - POPUP_WIDTH - 8))
    });
    setQuery('');
    setActiveIndex(0);
    setOpen(true);
  }

  function closePopup() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  function selectPrefix(item: PhonePrefix) {
    setIso(item.codiceIso2);
    setOpen(false);
    if (parsed.national.trim()) {
      onChange(joinPhone(item, parsed.national));
    }
    triggerRef.current?.focus();
  }

  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();

    function onMouseDown(event: MouseEvent) {
      const target = event.target as Node;
      if (popupRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onScroll(event: Event) {
      if (popupRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    }
    function onResize() {
      setOpen(false);
    }

    document.addEventListener('mousedown', onMouseDown);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open]);

  function onTriggerKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
      event.preventDefault();
      openPopup();
    }
  }

  function onSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      closePopup();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => Math.min(filtered.length - 1, index + 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => Math.max(0, index - 1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const item = filtered[activeIndex];
      if (item) selectPrefix(item);
    }
  }

  useEffect(() => {
    if (!open) return;
    document.getElementById(`${listId}-option-${activeIndex}`)?.scrollIntoView?.({ block: 'nearest' });
  }, [open, activeIndex, listId]);

  const nationalValue = parsed.prefix ? parsed.national : value;

  return (
    <div className="phone-input">
      <div
        ref={triggerRef}
        className={`phone-input-prefix${disabled ? ' is-disabled' : ''}`}
        role="combobox"
        tabIndex={disabled ? -1 : 0}
        aria-label="Prefisso internazionale"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-disabled={disabled}
        onClick={(event) => {
          // Evita che il click venga inoltrato al campo numero dalla label che contiene il componente.
          event.preventDefault();
          if (open) {
            closePopup();
          } else {
            openPopup();
          }
        }}
        onKeyDown={onTriggerKeyDown}
      >
        <span className={`fi fi-${current.codiceIso2.toLowerCase()} phone-input-flag`} aria-hidden="true" />
        <span className="phone-input-code">{current.prefisso}</span>
        <span className="phone-input-chevron" aria-hidden="true">▾</span>
      </div>
      <input
        className="form-input phone-input-number"
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        name={name}
        value={nationalValue}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        onChange={(event) => onChange(joinPhone(current, event.target.value))}
      />
      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={popupRef}
          className="phone-input-popup"
          style={{ top: popupPosition.top, left: popupPosition.left, width: POPUP_WIDTH }}
          onClick={(event) => event.preventDefault()}
        >
          <input
            ref={searchRef}
            className="phone-input-search"
            type="search"
            placeholder="Cerca paese o prefisso"
            aria-label="Cerca paese o prefisso"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={onSearchKeyDown}
          />
          <ul id={listId} className="phone-input-list" role="listbox" aria-label="Prefissi internazionali">
            {filtered.length === 0 && <li className="phone-input-empty">Nessun risultato</li>}
            {filtered.map((item, index) => (
              <li
                key={item.codiceIso2}
                id={`${listId}-option-${index}`}
                role="option"
                aria-selected={item.codiceIso2 === iso}
                className={`phone-input-option${index === activeIndex ? ' is-active' : ''}`}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => selectPrefix(item)}
              >
                <span className={`fi fi-${item.codiceIso2.toLowerCase()} phone-input-flag`} aria-hidden="true" />
                <span className="phone-input-option-name">{item.nomePaese}</span>
                <span className="phone-input-option-code">{item.prefisso}</span>
              </li>
            ))}
          </ul>
        </div>,
        document.body
      )}
    </div>
  );
}
