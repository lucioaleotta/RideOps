"use client";

import { Fragment, useEffect, useMemo, useState } from 'react';
import { ButtonContent } from '../../../components/action-icons';
import { StatusNotice } from '../../../components/status-notice';
import { formatCurrencyEUR } from '../../../lib/currency';
import {
  downloadFinancePartnerPaymentsReport,
  listFinancePartnerPaymentsReport
} from '../../../lib/api/finance';
import { PartnerPaymentReportRow } from '../../../types/finance';

type PartnerItem = {
  id: number;
  ragioneSociale: string;
  deleted: boolean;
};

type QuickPeriod = '1m' | '3m' | '6m' | '12m' | 'custom';
type ExportFormat = 'csv' | 'xlsx';

type GroupedPartnerRows = {
  partnerId: number;
  partnerName: string;
  rows: PartnerPaymentReportRow[];
  subtotal: number;
};

function shiftMonthsBack(baseDate: Date, months: number) {
  const next = new Date(baseDate);
  next.setMonth(next.getMonth() - months);
  return next;
}

function toDateInputValue(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildQuickRange(period: Exclude<QuickPeriod, 'custom'>) {
  const to = new Date();
  const monthsByPeriod: Record<Exclude<QuickPeriod, 'custom'>, number> = {
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

function parseDateInput(value: string) {
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '-';
  }
  return parsed.toLocaleDateString('it-IT');
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 4.5v9.5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <path d="m8.5 10.8 3.5 3.7 3.5-3.7" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="4.5" y="17" width="15" height="2.5" rx="1.2" fill="currentColor" />
    </svg>
  );
}

export function FinancePartnerPaymentsReport() {
  const initialRange = useMemo(() => buildQuickRange('3m'), []);
  const [quickPeriod, setQuickPeriod] = useState<QuickPeriod>('3m');
  const [fromDate, setFromDate] = useState(initialRange.fromDate);
  const [toDate, setToDate] = useState(initialRange.toDate);
  const [partnerFilter, setPartnerFilter] = useState<number | ''>('');

  const [rows, setRows] = useState<PartnerPaymentReportRow[]>([]);
  const [partners, setPartners] = useState<PartnerItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(null);

  const dateValidation = useMemo(() => {
    const from = parseDateInput(fromDate);
    const to = parseDateInput(toDate);

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

  useEffect(() => {
    let mounted = true;

    async function loadPartners() {
      const response = await fetch('/api/partners', { cache: 'no-store' });
      const payload = (await response.json().catch(() => [])) as PartnerItem[] | { message?: string };

      if (!response.ok || !Array.isArray(payload)) {
        throw new Error((payload as { message?: string }).message ?? 'Errore caricamento partner');
      }

      if (mounted) {
        setPartners(payload.filter((partner) => !partner.deleted));
      }
    }

    loadPartners().catch((err) => {
      if (mounted) {
        setError(err instanceof Error ? err.message : 'Errore caricamento partner');
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadReport() {
      if (!dateValidation.isValid) {
        if (mounted) {
          setRows([]);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const data = await listFinancePartnerPaymentsReport({
          from: fromDate,
          to: toDate,
          partnerId: partnerFilter || undefined
        });

        if (mounted) {
          setRows(data);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Errore caricamento report pagamenti partner');
          setRows([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadReport();

    return () => {
      mounted = false;
    };
  }, [fromDate, toDate, partnerFilter, dateValidation.isValid]);

  const totals = useMemo(() => {
    const totalAmount = rows.reduce((acc, row) => acc + row.amount, 0);
    const partnerCount = new Set(rows.map((row) => row.partnerId)).size;

    return {
      totalAmount,
      servicesCount: rows.length,
      partnerCount
    };
  }, [rows]);

  const groupedRows = useMemo(() => {
    const groups = new Map<number, GroupedPartnerRows>();

    rows.forEach((row) => {
      const current = groups.get(row.partnerId);
      if (!current) {
        groups.set(row.partnerId, {
          partnerId: row.partnerId,
          partnerName: row.partnerName,
          rows: [row],
          subtotal: row.amount
        });
        return;
      }

      current.rows.push(row);
      current.subtotal += row.amount;
    });

    return Array.from(groups.values()).sort((a, b) => a.partnerName.localeCompare(b.partnerName, 'it-IT'));
  }, [rows]);

  const chartSeries = useMemo(() => {
    if (partnerFilter) {
      const monthTotals = new Map<string, number>();
      rows.forEach((row) => {
        const date = new Date(row.serviceDate);
        if (Number.isNaN(date.getTime())) {
          return;
        }
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthTotals.set(key, (monthTotals.get(key) ?? 0) + row.amount);
      });

      return Array.from(monthTotals.entries())
        .map(([monthKey, total]) => ({
          key: monthKey,
          label: monthKey,
          total
        }))
        .sort((a, b) => a.key.localeCompare(b.key));
    }

    const byPartner = new Map<number, { label: string; total: number }>();

    rows.forEach((row) => {
      const current = byPartner.get(row.partnerId);
      if (!current) {
        byPartner.set(row.partnerId, { label: row.partnerName, total: row.amount });
        return;
      }
      current.total += row.amount;
    });

    return Array.from(byPartner.values())
      .sort((a, b) => b.total - a.total)
      .map((item) => ({
        key: item.label,
        label: item.label,
        total: item.total
      }));
  }, [rows, partnerFilter]);

  const chartMax = useMemo(() => {
    const max = Math.max(0, ...chartSeries.map((item) => item.total));
    return max <= 0 ? 1 : max;
  }, [chartSeries]);

  function applyQuickPeriod(period: Exclude<QuickPeriod, 'custom'>) {
    const range = buildQuickRange(period);
    setQuickPeriod(period);
    setFromDate(range.fromDate);
    setToDate(range.toDate);
  }

  function onChangeFromDate(value: string) {
    setQuickPeriod('custom');
    setFromDate(value);
  }

  function onChangeToDate(value: string) {
    setQuickPeriod('custom');
    setToDate(value);
  }

  async function exportReport(format: ExportFormat) {
    if (exportingFormat || rows.length === 0 || !dateValidation.isValid) {
      return;
    }

    setExportingFormat(format);
    setError(null);
    setSuccess(null);

    try {
      await downloadFinancePartnerPaymentsReport({
        from: fromDate,
        to: toDate,
        partnerId: partnerFilter || undefined,
        format
      });
      setSuccess(format === 'csv' ? 'Export CSV completato' : 'Export Excel completato');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export non riuscito');
    } finally {
      setExportingFormat(null);
    }
  }

  return (
    <section className="finance-partner-report" aria-label="Report conciliazione pagamenti partner">
      <header className="finance-partner-report-header">
        <div>
          <h2 className="finance-partner-report-title">Report conciliazione pagamenti partner</h2>
          <p className="finance-partner-report-subtitle">Elenco servizi svolti per partner nel periodo selezionato.</p>
        </div>
      </header>

      {error && <StatusNotice tone="error">{error}</StatusNotice>}
      {success && <StatusNotice tone="success">{success}</StatusNotice>}

      <article className="dashboard-card portal-filters-surface finance-partner-filters-card">
        <div className="finance-partner-filters-grid">
          <label>
            Partner
            <select
              className="form-input"
              value={partnerFilter}
              onChange={(event) => setPartnerFilter(event.target.value ? Number(event.target.value) : '')}
              aria-label="Filtro partner"
            >
              <option value="">Tutti i partner</option>
              {partners.map((partner) => (
                <option key={partner.id} value={partner.id}>{partner.ragioneSociale}</option>
              ))}
            </select>
          </label>

          <div className="finance-partner-period-wrap" aria-label="Preset periodo">
            <button type="button" className={`finance-partner-period-btn ${quickPeriod === '1m' ? 'is-active' : ''}`} onClick={() => applyQuickPeriod('1m')}>1 mese</button>
            <button type="button" className={`finance-partner-period-btn ${quickPeriod === '3m' ? 'is-active' : ''}`} onClick={() => applyQuickPeriod('3m')}>3 mesi</button>
            <button type="button" className={`finance-partner-period-btn ${quickPeriod === '6m' ? 'is-active' : ''}`} onClick={() => applyQuickPeriod('6m')}>6 mesi</button>
            <button type="button" className={`finance-partner-period-btn ${quickPeriod === '12m' ? 'is-active' : ''}`} onClick={() => applyQuickPeriod('12m')}>12 mesi</button>
          </div>

          <label>
            Da
            <input
              type="date"
              className="form-input"
              value={fromDate}
              onChange={(event) => onChangeFromDate(event.target.value)}
              aria-label="Data inizio periodo"
            />
          </label>

          <label>
            A
            <input
              type="date"
              className="form-input"
              value={toDate}
              onChange={(event) => onChangeToDate(event.target.value)}
              aria-label="Data fine periodo"
            />
          </label>

          <div className="finance-partner-export-actions">
            <button
              type="button"
              className="services-list-topbar-btn"
              onClick={() => exportReport('xlsx')}
              disabled={!dateValidation.isValid || rows.length === 0 || exportingFormat !== null}
            >
              <ButtonContent icon={<DownloadIcon />}>{exportingFormat === 'xlsx' ? 'Excel...' : 'Excel'}</ButtonContent>
            </button>
            <button
              type="button"
              className="services-list-topbar-btn"
              onClick={() => exportReport('csv')}
              disabled={!dateValidation.isValid || rows.length === 0 || exportingFormat !== null}
            >
              <ButtonContent icon={<DownloadIcon />}>{exportingFormat === 'csv' ? 'CSV...' : 'CSV'}</ButtonContent>
            </button>
          </div>
        </div>

        {!dateValidation.isValid && (
          <p className="services-export-error" style={{ marginTop: 10 }}>{dateValidation.message}</p>
        )}
      </article>

      {loading && <p>Caricamento report...</p>}

      {!loading && dateValidation.isValid && (
        <>
          <div className="dashboard-grid finance-partner-kpi-grid">
            <article className="dashboard-card finance-partner-kpi-card">
              <p>Totale periodo</p>
              <strong>{formatCurrencyEUR(totals.totalAmount)}</strong>
            </article>
            <article className="dashboard-card finance-partner-kpi-card">
              <p>Servizi</p>
              <strong>{totals.servicesCount}</strong>
            </article>
            <article className="dashboard-card finance-partner-kpi-card">
              <p>Partner coinvolti</p>
              <strong>{totals.partnerCount}</strong>
            </article>
          </div>

          <article className="dashboard-card finance-partner-chart-card" aria-label={partnerFilter ? 'Andamento mensile partner selezionato' : 'Totale importo per partner'}>
            <h3>{partnerFilter ? 'Andamento mensile' : 'Fatturato per partner'}</h3>
            {chartSeries.length === 0 && <p>Nessun dato disponibile nel periodo filtrato.</p>}
            <div className="finance-partner-bars" role="img" aria-label={partnerFilter ? 'Grafico andamento mensile importi' : 'Grafico importi per partner'}>
              {chartSeries.map((item) => (
                <div key={item.key} className="finance-partner-bar-row">
                  <div className="finance-partner-bar-head">
                    <span>{item.label}</span>
                    <strong>{formatCurrencyEUR(item.total)}</strong>
                  </div>
                  <div className="finance-bars-row">
                    <div className="finance-bar net-positive" style={{ width: `${(item.total / chartMax) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="dashboard-card finance-partner-table-card">
            <h3>Elenco servizi raggruppato per partner</h3>

            <div className="finance-partner-table-wrap finance-partner-table-desktop">
              <table className="finance-partner-table">
                <thead>
                  <tr>
                    <th>ID corsa</th>
                    <th>Data corsa</th>
                    <th>Driver + Targa</th>
                    <th>Tipologia</th>
                    <th>Pickup -&gt; Destinazione</th>
                    <th className="finance-partner-th-amount">Importo</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedRows.map((group) => (
                    <Fragment key={`group-${group.partnerId}`}>
                      <tr className="finance-partner-group-row">
                        <td colSpan={6}>{group.partnerName}</td>
                      </tr>
                      {group.rows.map((row) => (
                        <tr key={`service-${row.serviceId}`}>
                          <td>{row.rideCode}</td>
                          <td>{formatDate(row.serviceDate)}</td>
                          <td>{row.driverName} / {row.vehiclePlate}</td>
                          <td>{row.serviceType}</td>
                          <td>{row.route}</td>
                          <td className="finance-partner-td-amount">{formatCurrencyEUR(row.amount)}</td>
                        </tr>
                      ))}
                      <tr className="finance-partner-subtotal-row">
                        <td colSpan={5}>Subtotale {group.partnerName}</td>
                        <td className="finance-partner-td-amount">{formatCurrencyEUR(group.subtotal)}</td>
                      </tr>
                    </Fragment>
                  ))}
                  <tr className="finance-partner-total-row">
                    <td colSpan={5}>Totale complessivo</td>
                    <td className="finance-partner-td-amount">{formatCurrencyEUR(totals.totalAmount)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="finance-partner-mobile-list">
              {groupedRows.map((group) => (
                <article key={`mobile-${group.partnerId}`} className="finance-partner-mobile-group">
                  <h4>{group.partnerName}</h4>
                  {group.rows.map((row) => (
                    <div key={`mobile-row-${row.serviceId}`} className="finance-partner-mobile-row">
                      <div>
                        <strong>{row.rideCode}</strong>
                        <p>{formatDate(row.serviceDate)}</p>
                        <p>{row.serviceType} - {row.driverName} / {row.vehiclePlate}</p>
                        <p>{row.route}</p>
                      </div>
                      <strong className="finance-partner-mobile-amount">{formatCurrencyEUR(row.amount)}</strong>
                    </div>
                  ))}
                  <div className="finance-partner-mobile-subtotal">
                    <span>Subtotale</span>
                    <strong>{formatCurrencyEUR(group.subtotal)}</strong>
                  </div>
                </article>
              ))}

              <div className="finance-partner-mobile-total">
                <span>Totale complessivo</span>
                <strong>{formatCurrencyEUR(totals.totalAmount)}</strong>
              </div>
            </div>
          </article>
        </>
      )}
    </section>
  );
}
