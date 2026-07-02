import { RefObject, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ExportFileFormat } from '../../services/exportService';
import { ExportServiceLike, useExportPeriod } from './use-export-period';

type ExportPopoverProps = {
  open: boolean;
  anchorRef: RefObject<HTMLElement>;
  services: ExportServiceLike[];
  loadingFormat: ExportFileFormat | null;
  onClose: () => void;
  onExport: (params: { from: string; to: string; format: ExportFileFormat }) => Promise<void>;
};

type PopoverPlacement = 'above' | 'below';

export function ExportPopover({
  open,
  anchorRef,
  services,
  loadingFormat,
  onClose,
  onExport
}: ExportPopoverProps) {
  const [isDesktop, setIsDesktop] = useState(typeof window === 'undefined' ? true : window.innerWidth >= 768);
  const [position, setPosition] = useState({ top: 0, left: 0, placement: 'below' as PopoverPlacement });
  const popoverRef = useRef<HTMLDivElement | null>(null);

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
      setIsDesktop(window.innerWidth >= 768);
    }

    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useLayoutEffect(() => {
    if (!open || !isDesktop || !anchorRef.current) {
      return;
    }

    const rect = anchorRef.current.getBoundingClientRect();
    const popoverWidth = Math.min(400, window.innerWidth - 24);
    const measuredHeight = popoverRef.current?.offsetHeight ?? 0;
    const estimatedHeight = measuredHeight > 0 ? measuredHeight : 320;
    const maxLeft = Math.max(12, window.innerWidth - popoverWidth - 12);
    const availableBelow = window.innerHeight - rect.bottom - 12;
    const availableAbove = rect.top - 12;
    const shouldOpenAbove = availableBelow < estimatedHeight + 12 && availableAbove > availableBelow;

    const top = shouldOpenAbove
      ? Math.max(12, Math.round(rect.top - estimatedHeight - 8))
      : Math.min(window.innerHeight - 12, Math.round(rect.bottom + 8));

    setPosition({
      top,
      left: Math.min(maxLeft, Math.max(12, Math.round(rect.right - popoverWidth))),
      placement: shouldOpenAbove ? 'above' : 'below'
    });
  }, [open, isDesktop, anchorRef]);

  useEffect(() => {
    if (!open || !isDesktop) {
      return;
    }

    function onOutside(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      if (!target) {
        return;
      }
      if (target.closest('.services-export-popover')) {
        return;
      }
      if (anchorRef.current && anchorRef.current.contains(target)) {
        return;
      }
      onClose();
    }

    function onEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('mousedown', onOutside);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('keydown', onEscape);
    };
  }, [open, isDesktop, onClose, anchorRef]);

  const quickButtons = useMemo(
    () => [
      { key: '1m', label: 'Ultimo mese' },
      { key: '3m', label: 'Ultimi 3 mesi' },
      { key: '6m', label: 'Ultimi 6 mesi' },
      { key: '12m', label: 'Ultimo anno' }
    ] as const,
    []
  );

  if (!open || !isDesktop) {
    return null;
  }

  return (
    <div
      ref={popoverRef}
      className="services-export-popover"
      data-placement={position.placement}
      style={{ top: position.top, left: position.left }}
      role="dialog"
      aria-label="Esporta lista servizi"
    >
      <h4 className="services-export-title">Esporta lista servizi</h4>

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

      <div className="services-export-date-row">
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

      <div className="services-export-actions">
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
  );
}
