"use client";

import { useEffect, useMemo, useState } from 'react';
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
import { FinanceTransactionForm } from './components/finance-transaction-form';
import { FinanceTransactionsTable } from './components/finance-transactions-table';

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

type ServiceFilterOption = {
  id: number;
  label: string;
};

type VehicleFilterOption = {
  id: number;
  label: string;
};

type ServiceListItem = {
  id: number;
  startAt: string;
  pickupLocation: string;
  destination: string;
};

type VehicleListItem = {
  id: number;
  plate: string;
};

export function FinanceModule() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [filterType, setFilterType] = useState<FinancialTransactionType | ''>('');
  const [filterCategory, setFilterCategory] = useState<FinancialTransactionCategory | ''>('');
  const [filterServiceId, setFilterServiceId] = useState<number | ''>('');
  const [filterVehicleId, setFilterVehicleId] = useState<number | ''>('');
  const [sortBy, setSortBy] = useState<'transactionDate' | 'amount' | 'category'>('transactionDate');
  const [direction, setDirection] = useState<'asc' | 'desc'>('desc');
  const [serviceOptions, setServiceOptions] = useState<ServiceFilterOption[]>([]);
  const [vehicleOptions, setVehicleOptions] = useState<VehicleFilterOption[]>([]);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editing, setEditing] = useState<FinancialTransaction | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  async function loadAll() {
    setLoading(true);
    setError(null);

    try {
      const [nextDashboard, nextTransactions] = await Promise.all([
        getFinanceDashboard(year, month),
        listFinanceTransactions({
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
          type: filterType || undefined,
          category: filterCategory || undefined,
          serviceId: filterServiceId || undefined,
          vehicleId: filterVehicleId || undefined,
          sortBy,
          direction
        })
      ]);

      setDashboard(nextDashboard);
      setTransactions(nextTransactions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore caricamento modulo finance');
    } finally {
      setLoading(false);
    }
  }

  async function loadFilterOptions() {
    try {
      const [servicesResponse, vehiclesResponse] = await Promise.all([
        fetch('/api/services', { cache: 'no-store' }),
        fetch('/api/fleet/vehicles', { cache: 'no-store' })
      ]);

      if (servicesResponse.ok) {
        const services = (await servicesResponse.json().catch(() => [])) as ServiceListItem[];
        setServiceOptions(
          services
            .map((service) => ({
              id: service.id,
              label: `#${service.id} - ${service.pickupLocation} -> ${service.destination} (${new Date(service.startAt).toLocaleDateString('it-IT')})`
            }))
            .sort((left, right) => right.id - left.id)
        );
      }

      if (vehiclesResponse.ok) {
        const vehicles = (await vehiclesResponse.json().catch(() => [])) as VehicleListItem[];
        setVehicleOptions(
          vehicles
            .map((vehicle) => ({ id: vehicle.id, label: vehicle.plate }))
            .sort((left, right) => left.label.localeCompare(right.label))
        );
      }
    } catch {
      // Options are non-blocking for loading the finance module.
    }
  }

  useEffect(() => {
    loadAll();
  }, [year, month]);

  useEffect(() => {
    loadFilterOptions();
  }, []);

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
      await loadAll();
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
      await loadAll();
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

  return (
    <section style={{ display: 'grid', gap: 16 }}>
      <header style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
        <div>
          <h1 style={{ marginBottom: 4 }}>Modulo Finanziario</h1>
          <p style={{ margin: 0, color: '#4f6b8a' }}>Ledger unico movimenti, KPI mese/anno e confronto evolutivo.</p>
        </div>

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
      </header>

      <article className="dashboard-card">
        <h3>Filtri movimenti</h3>
        <div style={{ display: 'flex', gap: 8, alignItems: 'end', flexWrap: 'wrap' }}>
          <label>
            Dal
            <input type="date" className="form-input" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
          </label>
          <label>
            Al
            <input type="date" className="form-input" value={toDate} onChange={(event) => setToDate(event.target.value)} />
          </label>
          <label>
            Tipo
            <select className="form-input" value={filterType} onChange={(event) => setFilterType(event.target.value as FinancialTransactionType | '')}>
              <option value="">Tutti</option>
              <option value="RICAVO">Ricavo</option>
              <option value="COSTO">Costo</option>
            </select>
          </label>
          <label>
            Categoria
            <select
              className="form-input"
              value={filterCategory}
              onChange={(event) => setFilterCategory(event.target.value as FinancialTransactionCategory | '')}
            >
              <option value="">Tutte</option>
              {financeCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
          <label>
            Servizio
            <select
              className="form-input"
              value={filterServiceId}
              onChange={(event) => setFilterServiceId(event.target.value ? Number(event.target.value) : '')}
            >
              <option value="">Tutti</option>
              {serviceOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Veicolo
            <select
              className="form-input"
              value={filterVehicleId}
              onChange={(event) => setFilterVehicleId(event.target.value ? Number(event.target.value) : '')}
            >
              <option value="">Tutti</option>
              {vehicleOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Ordina per
            <select className="form-input" value={sortBy} onChange={(event) => setSortBy(event.target.value as 'transactionDate' | 'amount' | 'category')}>
              <option value="transactionDate">Data</option>
              <option value="amount">Importo</option>
              <option value="category">Categoria</option>
            </select>
          </label>
          <label>
            Direzione
            <select className="form-input" value={direction} onChange={(event) => setDirection(event.target.value as 'asc' | 'desc')}>
              <option value="desc">Discendente</option>
              <option value="asc">Ascendente</option>
            </select>
          </label>
          <button type="button" className="primary-button" onClick={loadAll}>Applica filtri</button>
          <button
            type="button"
            className="logout-button"
            onClick={() => {
              setFromDate('');
              setToDate('');
              setFilterType('');
              setFilterCategory('');
              setFilterServiceId('');
              setFilterVehicleId('');
              setSortBy('transactionDate');
              setDirection('desc');
              setTimeout(() => loadAll(), 0);
            }}
          >
            Reset
          </button>
        </div>
      </article>

      {error && <p className="error-text">{error}</p>}
      {success && <p className="success-text">{success}</p>}
      {loading && <p>Caricamento dati finanziari...</p>}

      {!loading && dashboard && (
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

          <article className="dashboard-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h3 style={{ margin: 0 }}>Movimenti finanziari</h3>
              <button
                type="button"
                className="primary-button"
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                Nuovo movimento
              </button>
            </div>

            {formOpen && (
              <div style={{ marginTop: 12 }}>
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
            )}

            <div style={{ marginTop: 14 }}>
              <FinanceTransactionsTable
                items={transactions}
                onEdit={(item) => {
                  setEditing(item);
                  setFormOpen(true);
                  setSuccess(null);
                }}
                onVoid={onVoid}
              />
            </div>
          </article>
        </>
      )}
    </section>
  );
}
