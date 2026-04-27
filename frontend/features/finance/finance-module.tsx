"use client";

import { useEffect, useMemo, useState } from 'react';
import { AddIcon, ArrowLeftIcon, ArrowRightIcon, ButtonContent, FilterIcon, SearchIcon } from '../../components/action-icons';
import { StatusNotice } from '../../components/status-notice';
import { formatCurrencyEUR } from '../../lib/currency';
import {
  createFinanceTransaction,
  getFinanceDashboard,
  listFinanceTransactions,
  updateFinanceTransaction,
  voidFinanceTransaction
} from '../../lib/api/finance';
import {
  FinancialTransaction,
  FinancialTransactionCategory,
  FinancialTransactionType,
  SaveFinancialTransactionPayload
} from '../../types/finance';
import { FinanceCategoryDistribution, FinanceMonthlyBars, FinanceYearComparisonChart } from './components/finance-charts';
import { FinanceSubnav } from './components/finance-subnav';
import { FinanceTransactionForm } from './components/finance-transaction-form';
import { FinanceTransactionsTable } from './components/finance-transactions-table';
import { FilterDropdown } from '../../components/filter-dropdown';
const financeCategories: FinancialTransactionCategory[] = [
  'SERVIZIO',
  'SERVIZIO_ESTERNO',
  'EXTRA',
  'ALTRO_RICAVO',
  'CARBURANTE',
  'BOLLO',
  'ASSICURAZIONE',
  'REVISIONE',
  'TAGLIANDO',
  'MANUTENZIONE_ORDINARIA',
  'MANUTENZIONE_STRAORDINARIA',
  'PEDAGGIO',
  'PARCHEGGIO',
  'COMMISSIONE',
  'ALTRO_COSTO'
];

type FinanceStatusFilter = '' | 'AUTO' | 'MANUALE' | 'ANNULLATO';

const PAGE_SIZE = 25;

function toTitleCase(str: string): string {
  return str.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function getTransactionStatus(item: FinancialTransaction): Exclude<FinanceStatusFilter, ''> {
  if (item.voided) {
    return 'ANNULLATO';
  }
  return item.autoCreated ? 'AUTO' : 'MANUALE';
}

export function FinanceModule({ section = 'overview' }: { section?: 'overview' | 'movements' }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [filterType, setFilterType] = useState<FinancialTransactionType | ''>('');
  const [filterStatus, setFilterStatus] = useState<FinanceStatusFilter>('');
  const [filterCategory, setFilterCategory] = useState<FinancialTransactionCategory | ''>('');
  const [descriptionQuery, setDescriptionQuery] = useState('');
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editing, setEditing] = useState<FinancialTransaction | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const showOverview = section === 'overview';
  const showMovements = section === 'movements';

  async function loadDashboard() {
    setLoading(true);
    setError(null);

    try {
      const nextDashboard = await getFinanceDashboard(year, month);
      setDashboard(nextDashboard);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore caricamento dashboard finance');
    } finally {
      setLoading(false);
    }
  }

  async function loadTransactions() {
    setLoading(true);
    setError(null);

    try {
      const nextTransactions = await listFinanceTransactions({
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        type: filterType || undefined,
        category: filterCategory || undefined,
        sortBy: 'transactionDate',
        direction: 'desc'
      });

      setTransactions(nextTransactions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore caricamento movimenti finance');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!showOverview) {
      return;
    }

    loadDashboard();
  }, [year, month, showOverview]);

  useEffect(() => {
    if (!showMovements) {
      return;
    }

    loadTransactions();
  }, [showMovements, fromDate, toDate, filterType, filterCategory]);

  async function onSave(payload: SaveFinancialTransactionPayload) {
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      if (editing) {
        await updateFinanceTransaction(editing.id, payload);
        setSuccess('Movimento aggiornato con successo');
      } else {
        await createFinanceTransaction(payload);
        setSuccess('Movimento creato con successo');
      }

      setEditing(null);
      setFormOpen(false);
      await loadTransactions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Salvataggio fallito');
    } finally {
      setSubmitting(false);
    }
  }

  async function onVoid(item: FinancialTransaction) {
    const reason = window.prompt('Motivo annullamento movimento:');
    if (!reason) {
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      await voidFinanceTransaction(item.id, reason);
      setSuccess('Movimento annullato');
      await loadTransactions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Annullamento fallito');
    }
  }

  const monthlyCards = useMemo(() => {
    if (!dashboard) return [];

    return [
      { label: 'Numero servizi', value: String(dashboard.monthKpis.totalServices) },
      { label: 'Totale ricavi', value: formatCurrencyEUR(dashboard.monthKpis.totalRevenue) },
      { label: 'Totale costi', value: formatCurrencyEUR(dashboard.monthKpis.totalCosts) },
      { label: 'Lordo', value: formatCurrencyEUR(dashboard.monthKpis.gross) },
      { label: 'Netto', value: formatCurrencyEUR(dashboard.monthKpis.net) }
    ];
  }, [dashboard]);

  const yearlySummary = useMemo(() => {
    if (!dashboard) return null;

    return (
      <article className="dashboard-card">
        <h3 style={{ marginTop: 0 }}>Resoconto annuo {year}</h3>
        <p style={{ marginTop: 0, color: '#4f6b8a' }}>
          Risultato annuo (netto): <strong style={{ color: dashboard.yearKpis.net >= 0 ? '#1b8a3f' : '#c62828' }}>{formatCurrencyEUR(dashboard.yearKpis.net)}</strong>
        </p>
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          <div>
            <small style={{ color: '#4f6b8a' }}>Servizi anno</small>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{dashboard.yearKpis.totalServices}</div>
          </div>
          <div>
            <small style={{ color: '#4f6b8a' }}>Ricavi anno</small>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{formatCurrencyEUR(dashboard.yearKpis.totalRevenue)}</div>
          </div>
          <div>
            <small style={{ color: '#4f6b8a' }}>Costi anno</small>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{formatCurrencyEUR(dashboard.yearKpis.totalCosts)}</div>
          </div>
          <div>
            <small style={{ color: '#4f6b8a' }}>Media ricavo/servizio</small>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{formatCurrencyEUR(dashboard.yearKpis.averageRevenuePerService)}</div>
          </div>
          <div>
            <small style={{ color: '#4f6b8a' }}>Media costo/servizio</small>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{formatCurrencyEUR(dashboard.yearKpis.averageCostPerService)}</div>
          </div>
        </div>
      </article>
    );
  }, [dashboard, year]);

  const filteredTransactions = useMemo(() => {
    const normalizedQuery = descriptionQuery.trim().toLocaleLowerCase();

    return transactions.filter((item) => {
      if (filterStatus && getTransactionStatus(item) !== filterStatus) {
        return false;
      }
      if (normalizedQuery.length > 0 && !item.description.toLocaleLowerCase().includes(normalizedQuery)) {
        return false;
      }
      return true;
    });
  }, [transactions, filterStatus, descriptionQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / PAGE_SIZE));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [fromDate, toDate, filterType, filterStatus, filterCategory, descriptionQuery]);

  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredTransactions.slice(start, start + PAGE_SIZE);
  }, [filteredTransactions, currentPage]);

  const hasActiveFilters = Boolean(fromDate || toDate || filterType || filterStatus || filterCategory || descriptionQuery.trim());

  function clearAllFilters() {
    setFromDate('');
    setToDate('');
    setFilterType('');
    setFilterStatus('');
    setFilterCategory('');
    setDescriptionQuery('');
  }

  return (
    <section style={{ display: 'grid', gap: 16 }}>
      <header style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
        <div>
          <h1 style={{ marginBottom: 4 }}>Modulo Finanziario</h1>
          <p style={{ margin: 0, color: '#4f6b8a' }}>
            {showOverview
              ? 'KPI mese/anno e confronto evolutivo.'
              : 'Ledger unico movimenti con filtri, ordinamento e gestione operativa.'}
          </p>
        </div>

        {showOverview && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <label>
              Anno
              <input className="form-input" type="number" value={year} onChange={(event) => setYear(Number(event.target.value))} />
            </label>
            <label>
              Mese
              <input className="form-input" type="number" min={1} max={12} value={month} onChange={(event) => setMonth(Number(event.target.value))} />
            </label>
          </div>
        )}

        {showMovements && (
          <button
            type="button"
            className="primary-button"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <ButtonContent icon={<AddIcon />}>Nuovo movimento</ButtonContent>
          </button>
        )}
      </header>

      <FinanceSubnav active={section} />

      {error && <StatusNotice tone="error">{error}</StatusNotice>}
      {success && <StatusNotice tone="success">{success}</StatusNotice>}
      {loading && <p>Caricamento dati finanziari...</p>}

      {!loading && showOverview && dashboard && (
        <>
          <article className="dashboard-card">
            <h3 style={{ marginTop: 0 }}>Risultato mensile {month}/{year}</h3>
            <p style={{ margin: 0, color: '#4f6b8a' }}>KPI del mese selezionato.</p>
            <div className="dashboard-grid" style={{ marginTop: 12 }}>
              {monthlyCards.map((item) => (
                <article key={item.label} className="dashboard-card">
                  <h3 style={{ marginTop: 0 }}>{item.label}</h3>
                  <strong style={{ fontSize: 24 }}>{item.value}</strong>
                </article>
              ))}
            </div>
          </article>
          {yearlySummary}

          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
            <FinanceMonthlyBars series={dashboard.monthlySeries} />
            <FinanceCategoryDistribution items={dashboard.categoryCosts} />
            <FinanceYearComparisonChart comparison={dashboard.comparison} />
          </div>

        </>
      )}

      {!loading && showMovements && (
        <>
          <article className="dashboard-card finance-movements-filters-card portal-filters-surface">
            <div className="finance-movements-filters-header">
              <h3 style={{ margin: 0 }}>Filtri movimenti</h3>
              <button
                type="button"
                className="finance-movements-filters-toggle"
                onClick={() => setMobileFiltersOpen((prev) => !prev)}
                aria-expanded={mobileFiltersOpen}
              >
                <ButtonContent icon={<FilterIcon />}>{mobileFiltersOpen ? 'Nascondi filtri' : 'Mostra filtri'}</ButtonContent>
              </button>
            </div>

            <div className={`finance-movements-filters-body${mobileFiltersOpen ? '' : ' is-hidden-mobile'}`}>
            <div className="finance-movements-filters-row">
              <label className="finance-movements-filter-field finance-movements-filter-search">
                <span className="finance-movements-filter-search-icon" aria-hidden="true"><SearchIcon /></span>
                <input
                  type="text"
                  className="form-input"
                  value={descriptionQuery}
                  onChange={(event) => setDescriptionQuery(event.target.value)}
                  placeholder="Cerca per descrizione..."
                  aria-label="Ricerca descrizione"
                />
              </label>

              <div className="finance-movements-filter-field">
                <FilterDropdown
                  label="Tipo"
                  value={filterType}
                  options={[
                    { value: '', label: 'Tipo' },
                    { value: 'RICAVO', label: 'Ricavo' },
                    { value: 'COSTO', label: 'Costo' },
                  ]}
                  onChange={(v) => setFilterType(v as FinancialTransactionType | '')}
                />
              </div>

              <div className="finance-movements-filter-field">
                <FilterDropdown
                  label="Stato"
                  value={filterStatus}
                  options={[
                    { value: '', label: 'Stato' },
                    { value: 'AUTO', label: 'Auto' },
                    { value: 'MANUALE', label: 'Manuale' },
                    { value: 'ANNULLATO', label: 'Annullato' },
                  ]}
                  onChange={(v) => setFilterStatus(v as FinanceStatusFilter)}
                />
              </div>

              <div className="finance-movements-filter-field">
                <FilterDropdown
                  label="Categoria"
                  value={filterCategory}
                  options={[
                    { value: '', label: 'Categoria' },
                    ...financeCategories.map((cat) => ({ value: cat, label: toTitleCase(cat) })),
                  ]}
                  onChange={(v) => setFilterCategory(v as FinancialTransactionCategory | '')}
                />
              </div>
            </div>

            <div className="finance-movements-filters-row finance-movements-filters-row-dates">
              <label className="finance-movements-filter-field">
                <input type="date" className="form-input" value={fromDate} onChange={(event) => setFromDate(event.target.value)} aria-label="Data inizio" />
              </label>
              <label className="finance-movements-filter-field">
                <input type="date" className="form-input" value={toDate} onChange={(event) => setToDate(event.target.value)} aria-label="Data fine" />
              </label>
            </div>

            {hasActiveFilters && (
              <div className="finance-movements-active-filters">
                {filterType && (
                  <button type="button" className="finance-movements-filter-chip" onClick={() => setFilterType('')}>
                    Tipo: {filterType}
                    <span aria-hidden="true">×</span>
                  </button>
                )}
                {filterStatus && (
                  <button type="button" className="finance-movements-filter-chip" onClick={() => setFilterStatus('')}>
                    Stato: {filterStatus}
                    <span aria-hidden="true">×</span>
                  </button>
                )}
                {filterCategory && (
                  <button type="button" className="finance-movements-filter-chip" onClick={() => setFilterCategory('')}>
                    Categoria: {toTitleCase(filterCategory)}
                    <span aria-hidden="true">×</span>
                  </button>
                )}
                {fromDate && (
                  <button type="button" className="finance-movements-filter-chip" onClick={() => setFromDate('')}>
                    Dal: {fromDate}
                    <span aria-hidden="true">×</span>
                  </button>
                )}
                {toDate && (
                  <button type="button" className="finance-movements-filter-chip" onClick={() => setToDate('')}>
                    Al: {toDate}
                    <span aria-hidden="true">×</span>
                  </button>
                )}
                {descriptionQuery.trim() && (
                  <button type="button" className="finance-movements-filter-chip" onClick={() => setDescriptionQuery('')}>
                    Ricerca: {descriptionQuery.trim()}
                    <span aria-hidden="true">×</span>
                  </button>
                )}

                <button type="button" className="finance-movements-filters-clear-all" onClick={clearAllFilters}>
                  Pulisci filtri
                </button>
              </div>
            )}
            </div>{/* end finance-movements-filters-body */}
          </article>

          <article className="dashboard-card">
            <h3 style={{ margin: 0 }}>Movimenti finanziari</h3>

            <div style={{ marginTop: 14 }}>
              <FinanceTransactionsTable
                items={paginatedTransactions}
                onEdit={(item) => {
                  setEditing(item);
                  setFormOpen(true);
                  setSuccess(null);
                }}
                onVoid={onVoid}
              />
            </div>

            <div className="services-list-footer">
              <div className="services-list-footer-size">
                <span>Mostra</span>
                <select className="services-list-pagesize-select" value={PAGE_SIZE} disabled aria-label="Numero risultati per pagina">
                  <option value={25}>25</option>
                </select>
                <span>di {filteredTransactions.length} risultati</span>
              </div>
              <div className="services-list-footer-pagination">
                <button
                  type="button"
                  className="services-list-page-btn"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  aria-label="Pagina precedente"
                >
                  <ButtonContent icon={<ArrowLeftIcon />}>Prec</ButtonContent>
                </button>
                <span className="services-list-page-info">Pagina {currentPage} di {totalPages}</span>
                <button
                  type="button"
                  className="services-list-page-btn"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  aria-label="Pagina successiva"
                >
                  <ButtonContent icon={<ArrowRightIcon />}>Succ</ButtonContent>
                </button>
              </div>
            </div>
          </article>

          {formOpen && (
            <div
              className="services-modal-backdrop"
              role="dialog"
              aria-modal="true"
              aria-label={editing ? `Modifica movimento ${editing.id}` : 'Nuovo movimento'}
              onClick={() => {
                setEditing(null);
                setFormOpen(false);
              }}
            >
              <article className="services-modal" onClick={(event) => event.stopPropagation()}>
                <div className="services-modal-header">
                  <h3 className="services-modal-title">{editing ? `Modifica movimento #${editing.id}` : 'Nuovo movimento'}</h3>
                  <button
                    type="button"
                    className="services-modal-close"
                    onClick={() => {
                      setEditing(null);
                      setFormOpen(false);
                    }}
                    aria-label="Chiudi modale movimento"
                  >
                    ×
                  </button>
                </div>
                <div className="services-modal-body">
                  <FinanceTransactionForm
                    initial={editing}
                    onSubmit={onSave}
                    onCancel={() => {
                      setEditing(null);
                      setFormOpen(false);
                    }}
                    submitting={submitting}
                  />
                </div>
              </article>
            </div>
          )}
        </>
      )}
    </section>
  );
}
