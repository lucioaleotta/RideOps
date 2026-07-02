export type ExportFileFormat = 'csv' | 'xlsx';

export type DownloadExportParams = {
  from: string;
  to: string;
  format: ExportFileFormat;
  onLoadingChange?: (loading: boolean) => void;
};

function extractFilenameFromDisposition(contentDisposition: string | null) {
  if (!contentDisposition) {
    return null;
  }
  const match = /filename\*=UTF-8''([^;]+)|filename="?([^\";]+)"?/i.exec(contentDisposition);
  if (!match) {
    return null;
  }
  const encodedName = match[1] ?? match[2];
  if (!encodedName) {
    return null;
  }
  return decodeURIComponent(encodedName);
}

function fallbackFilename(from: string, to: string, format: ExportFileFormat) {
  const fromMonth = from.slice(0, 7);
  const toMonth = to.slice(0, 7);
  return `servizi_${fromMonth}_${toMonth}.${format}`;
}

export async function downloadServicesExport(params: DownloadExportParams) {
  const { from, to, format, onLoadingChange } = params;

  onLoadingChange?.(true);
  try {
    const query = new URLSearchParams({ from, to, format });
    const response = await fetch(`/api/servizi/export?${query.toString()}`, {
      method: 'GET',
      cache: 'no-store'
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({ message: 'Export non riuscito' }));
      throw new Error((payload as { message?: string }).message ?? 'Export non riuscito');
    }

    const blob = await response.blob();
    const filename = extractFilenameFromDisposition(response.headers.get('content-disposition'))
      ?? fallbackFilename(from, to, format);

    const objectUrl = URL.createObjectURL(blob);
    try {
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } finally {
    onLoadingChange?.(false);
  }
}
