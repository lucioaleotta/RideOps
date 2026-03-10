"use client";

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  FinancialTransaction,
  FinancialTransactionCategory,
  FinancialTransactionType,
  SaveFinancialTransactionPayload
} from '../../../types/finance';

type FormProps = {
  initial: FinancialTransaction | null;
  onSubmit: (payload: SaveFinancialTransactionPayload) => Promise<void>;
  onCancel: () => void;
  submitting: boolean;
};

const allCategories: FinancialTransactionCategory[] = [
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

const revenueCategories: FinancialTransactionCategory[] = ['SERVIZIO', 'SERVIZIO_ESTERNO', 'EXTRA', 'ALTRO_RICAVO'];

export function FinanceTransactionForm({ initial, onSubmit, onCancel, submitting }: FormProps) {
  const [transactionType, setTransactionType] = useState<FinancialTransactionType>(initial?.transactionType ?? 'COSTO');
  const [category, setCategory] = useState<FinancialTransactionCategory>(initial?.category ?? 'CARBURANTE');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [amount, setAmount] = useState(initial?.amount != null ? String(initial.amount) : '');
  const [currency, setCurrency] = useState(initial?.currency ?? 'EUR');
  const [transactionDate, setTransactionDate] = useState(initial?.transactionDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10));
  const [serviceId, setServiceId] = useState(initial?.serviceId != null ? String(initial.serviceId) : '');
  const [vehicleId, setVehicleId] = useState(initial?.vehicleId != null ? String(initial.vehicleId) : '');
  const [driverId, setDriverId] = useState(initial?.driverId != null ? String(initial.driverId) : '');
  const [deadlineOccurrenceId, setDeadlineOccurrenceId] = useState(initial?.deadlineOccurrenceId != null ? String(initial.deadlineOccurrenceId) : '');
  const [notes, setNotes] = useState(initial?.notes ?? '');

  const allowedCategories = useMemo(
    () => (transactionType === 'RICAVO' ? revenueCategories : allCategories.filter((item) => !revenueCategories.includes(item))),
    [transactionType]
  );

  useEffect(() => {
    if (!allowedCategories.includes(category)) {
      setCategory(allowedCategories[0]);
    }
  }, [allowedCategories, category]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit({
      transactionType,
      category,
      description,
      amount: Number(amount),
      currency,
      transactionDate,
      serviceId: serviceId ? Number(serviceId) : null,
      vehicleId: vehicleId ? Number(vehicleId) : null,
      driverId: driverId ? Number(driverId) : null,
      deadlineOccurrenceId: deadlineOccurrenceId ? Number(deadlineOccurrenceId) : null,
      notes: notes.trim() || null
    });
  }

  return (
    <form onSubmit={submit} className="form-grid">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <label>
          Tipo
          <select className="form-input" value={transactionType} onChange={(event) => setTransactionType(event.target.value as FinancialTransactionType)}>
            <option value="RICAVO">Ricavo</option>
            <option value="COSTO">Costo</option>
          </select>
        </label>

        <label>
          Categoria
          <select className="form-input" value={category} onChange={(event) => setCategory(event.target.value as FinancialTransactionCategory)}>
            {allowedCategories.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>

        <label>
          Data
          <input type="date" className="form-input" value={transactionDate} onChange={(event) => setTransactionDate(event.target.value)} required />
        </label>

        <label>
          Importo
          <input type="number" min="0.01" step="0.01" className="form-input" value={amount} onChange={(event) => setAmount(event.target.value)} required />
        </label>
      </div>

      <label>
        Descrizione
        <input className="form-input" value={description} onChange={(event) => setDescription(event.target.value)} required />
      </label>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        <label>
          Valuta
          <input className="form-input" value={currency} onChange={(event) => setCurrency(event.target.value.toUpperCase())} maxLength={3} required />
        </label>

        <label>
          Service ID
          <input className="form-input" value={serviceId} onChange={(event) => setServiceId(event.target.value)} />
        </label>

        <label>
          Vehicle ID
          <input className="form-input" value={vehicleId} onChange={(event) => setVehicleId(event.target.value)} />
        </label>

        <label>
          Driver ID
          <input className="form-input" value={driverId} onChange={(event) => setDriverId(event.target.value)} />
        </label>

        <label>
          Occurrence ID
          <input className="form-input" value={deadlineOccurrenceId} onChange={(event) => setDeadlineOccurrenceId(event.target.value)} />
        </label>
      </div>

      <label>
        Note
        <textarea className="form-input" value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} />
      </label>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="submit" className="primary-button" disabled={submitting}>{submitting ? 'Salvataggio...' : 'Salva'}</button>
        <button type="button" className="logout-button" onClick={onCancel} disabled={submitting}>Cancella</button>
      </div>
    </form>
  );
}
