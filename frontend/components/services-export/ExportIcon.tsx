import { useRef, useState } from 'react';
import { downloadServicesExport, ExportFileFormat } from '../../services/exportService';
import { ExportServiceLike } from './use-export-period';
import { ExportPopover } from './ExportPopover';
import { ExportBottomSheet } from './ExportBottomSheet';

type ExportIconProps = {
  services: ExportServiceLike[];
  onBeforeExport: () => void;
  onExportError: (message: string) => void;
  onExportSuccess: (message: string) => void;
};

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 4.5v9.5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <path d="m8.5 10.8 3.5 3.7 3.5-3.7" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="4.5" y="17" width="15" height="2.5" rx="1.2" fill="currentColor" />
    </svg>
  );
}

export function ExportIcon({ services, onBeforeExport, onExportError, onExportSuccess }: ExportIconProps) {
  const [open, setOpen] = useState(false);
  const [loadingFormat, setLoadingFormat] = useState<ExportFileFormat | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  async function onExport(params: { from: string; to: string; format: ExportFileFormat }) {
    if (loadingFormat) {
      return;
    }

    onBeforeExport();
    setLoadingFormat(params.format);

    try {
      await downloadServicesExport({
        from: params.from,
        to: params.to,
        format: params.format,
        onLoadingChange: (loading) => {
          if (!loading) {
            setLoadingFormat(null);
          }
        }
      });

      onExportSuccess(params.format === 'csv' ? 'Download CSV avviato' : 'Download Excel avviato');
      setOpen(false);
    } catch (error) {
      setLoadingFormat(null);
      onExportError(error instanceof Error ? error.message : 'Download export fallito');
    }
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={`services-export-icon-btn ${loadingFormat ? 'is-loading' : ''}`}
        aria-label="Esporta lista servizi"
        title="Esporta in Excel o CSV"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="services-export-icon" aria-hidden="true"><DownloadIcon /></span>
      </button>

      <ExportPopover
        open={open}
        anchorRef={buttonRef}
        services={services}
        loadingFormat={loadingFormat}
        onClose={() => setOpen(false)}
        onExport={onExport}
      />

      <ExportBottomSheet
        open={open}
        services={services}
        loadingFormat={loadingFormat}
        onClose={() => setOpen(false)}
        onExport={onExport}
      />
    </>
  );
}
