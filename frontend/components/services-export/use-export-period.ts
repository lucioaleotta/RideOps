import { useMemo, useState } from 'react';

export type ExportQuickPeriod = '1m' | '3m' | '6m' | '12m' | 'custom';

export type ExportServiceLike = {
  id: number;
  startAt: string;
};

function toDateInputValue(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function fromDateInputValue(value: string) {
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function shiftMonthsBack(baseDate: Date, months: number) {
  const next = new Date(baseDate);
  next.setMonth(next.getMonth() - months);
  return next;
}

function buildQuickRange(period: Exclude<ExportQuickPeriod, 'custom'>) {
  const to = new Date();
  const monthsByPeriod: Record<Exclude<ExportQuickPeriod, 'custom'>, number> = {
    '1m': 1,
    '3m': 3,
    '6m': 6,
    '12m': 12
  };
  const from = shiftMonthsBack(to, monthsByPeriod[period]);
  return {
    fromDate: toDateInputValue(from),
    toDate: toDateInputValue(to)
  };
}

export function useExportPeriod(services: ExportServiceLike[]) {
  const initialRange = buildQuickRange('3m');
  const [quickPeriod, setQuickPeriod] = useState<ExportQuickPeriod>('3m');
  const [fromDate, setFromDate] = useState(initialRange.fromDate);
  const [toDate, setToDate] = useState(initialRange.toDate);

  function applyQuickPeriod(period: Exclude<ExportQuickPeriod, 'custom'>) {
    const range = buildQuickRange(period);
    setQuickPeriod(period);
    setFromDate(range.fromDate);
    setToDate(range.toDate);
  }

  function updateFromDate(nextValue: string) {
    setQuickPeriod('custom');
    setFromDate(nextValue);
  }

  function updateToDate(nextValue: string) {
    setQuickPeriod('custom');
    setToDate(nextValue);
  }

  const validation = useMemo(() => {
    const from = fromDateInputValue(fromDate);
    const to = fromDateInputValue(toDate);

    if (!from || !to) {
      return { isValid: false, message: 'Seleziona un intervallo valido' };
    }

    if (from > to) {
      return { isValid: false, message: 'La data iniziale deve precedere la data finale' };
    }

    const monthsDiff = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
    if (monthsDiff > 24) {
      return { isValid: false, message: 'Intervallo massimo consentito: 24 mesi' };
    }

    return { isValid: true, message: '' };
  }, [fromDate, toDate]);

  const preview = useMemo(() => {
    const from = fromDateInputValue(fromDate);
    const to = fromDateInputValue(toDate);
    if (!from || !to) {
      return { count: 0, label: '-' };
    }

    const toInclusive = new Date(to);
    toInclusive.setHours(23, 59, 59, 999);

    const count = services.filter((service) => {
      const startAt = new Date(service.startAt);
      if (Number.isNaN(startAt.getTime())) {
        return false;
      }
      return startAt >= from && startAt <= toInclusive;
    }).length;

    const rangeLabel = `${from.toLocaleDateString('it-IT')} - ${to.toLocaleDateString('it-IT')}`;

    return { count, label: rangeLabel };
  }, [services, fromDate, toDate]);

  return {
    quickPeriod,
    fromDate,
    toDate,
    preview,
    isValid: validation.isValid,
    validationMessage: validation.message,
    applyQuickPeriod,
    updateFromDate,
    updateToDate
  };
}
