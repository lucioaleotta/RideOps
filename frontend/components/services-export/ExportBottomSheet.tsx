import { ExportFileFormat } from '../../services/exportService';
import { ExportServiceLike, useExportPeriod } from './use-export-period';
import { TouchEvent, useEffect, useMemo, useRef, useState } from 'react';

type ExportBottomSheetProps = {
  open: boolean;
  services: ExportServiceLike[];
  loadingFormat: ExportFileFormat | null;
  onClose: () => void;
  onExport: (params: { from: string; to: string; format: ExportFileFormat }) => Promise<void>;
};

export function ExportBottomSheet({ open, services, loadingFormat, onClose, onExport }: ExportBottomSheetProps) {
  const [isMobile, setIsMobile] = useState(typeof window === 'undefined' ? false : window.innerWidth < 768);
  const [isRendered, setIsRendered] = useState(open);
  const [isVisible, setIsVisible] = useState(open);
  const [dragOffset, setDragOffset] = useState(0);
  const touchStartY = useRef<number | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);

  const {
    quickPeriod,
    fromDate,
    toDate,
    preview,
    isValid,
    validationMessage,
    applyQuickPeriod,
    updateFromDate,
    updateToDate
  } = useExportPeriod(services);

  useEffect(() => {
    function onResize() {
      setIsMobile(window.innerWidth < 768);
    }

    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (open) {
      setIsRendered(true);
      requestAnimationFrame(() => setIsVisible(true));
      return;
    }

    setIsVisible(false);
    setDragOffset(0);
    const timer = window.setTimeout(() => setIsRendered(false), 220);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open || !isMobile) {
      document.body.style.overflow = '';
      return;
    }

    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();
    return () => {
      document.body.style.overflow = '';
    };
  }, [open, isMobile]);

  useEffect(() => {
    if (!open || !isMobile) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !sheetRef.current) {
        return;
      }

      const focusable = Array.from(
        sheetRef.current.querySelectorAll<HTMLElement>(
          'button, input, [href], select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.hasAttribute('disabled'));

      if (focusable.length === 0) {
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, isMobile, onClose]);

  const quickButtons = useMemo(
    () => [
      { key: '1m', label: 'Ultimo mese' },
      { key: '3m', label: 'Ultimi 3 mesi' },
      { key: '6m', label: 'Ultimi 6 mesi' },
      { key: '12m', label: 'Ultimo anno' }
    ] as const,
    []
  );

  function onTouchStart(event: TouchEvent<HTMLDivElement>) {
    touchStartY.current = event.touches[0]?.clientY ?? null;
  }

  function onTouchMove(event: TouchEvent<HTMLDivElement>) {
    if (touchStartY.current == null) {
      return;
    }

    const nextOffset = (event.touches[0]?.clientY ?? touchStartY.current) - touchStartY.current;
    setDragOffset(Math.max(0, nextOffset));
  }

  function onTouchEnd() {
    if (dragOffset > 90) {
      onClose();
    }
    setDragOffset(0);
    touchStartY.current = null;
  }

  if (!isMobile || !isRendered) {
    return null;
  }

  return (
    <div className={`services-export-sheet-backdrop ${isVisible ? 'is-open' : ''}`} onClick={onClose}>
      <div
        ref={sheetRef}
        className={`services-export-sheet ${isVisible ? 'is-open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Esporta lista servizi"
        onClick={(event) => event.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{ transform: `translateY(${dragOffset}px)` }}
      >
        <div className="services-export-sheet-handle" aria-hidden="true" />

        <div className="services-export-sheet-header">
          <h4 className="services-export-title">Esporta lista servizi</h4>
          <button
            ref={closeButtonRef}
            type="button"
            className="services-export-sheet-close"
            aria-label="Chiudi export"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="services-export-sheet-body">
          <div className="services-export-quick-grid">
            {quickButtons.map((quick) => (
              <button
                key={quick.key}
                type="button"
                className={`services-export-quick-btn ${quickPeriod === quick.key ? 'is-active' : ''}`}
                onClick={() => applyQuickPeriod(quick.key)}
              >
                {quick.label}
              </button>
            ))}
          </div>

          <div className="services-export-divider">oppure scegli un intervallo</div>

          <div className="services-export-date-column">
            <label className="services-export-date-field">
              <span>Da</span>
              <input type="date" value={fromDate} onChange={(event) => updateFromDate(event.target.value)} />
            </label>
            <label className="services-export-date-field">
              <span>A</span>
              <input type="date" value={toDate} onChange={(event) => updateToDate(event.target.value)} />
            </label>
          </div>

          <p className="services-export-preview">~{preview.count} servizi · {preview.label}</p>
          {!isValid && <p className="services-export-error">{validationMessage}</p>}
        </div>

        <div className="services-export-sheet-actions">
          <button
            type="button"
            className="services-export-download-btn"
            onClick={() => onExport({ from: fromDate, to: toDate, format: 'csv' })}
            disabled={!isValid || loadingFormat !== null}
          >
            {loadingFormat === 'csv' ? 'Download CSV...' : 'Scarica CSV'}
          </button>
          <button
            type="button"
            className="services-export-download-btn services-export-download-btn-alt"
            onClick={() => onExport({ from: fromDate, to: toDate, format: 'xlsx' })}
            disabled={!isValid || loadingFormat !== null}
          >
            {loadingFormat === 'xlsx' ? 'Download Excel...' : 'Scarica Excel'}
          </button>
        </div>
      </div>
    </div>
  );
}
