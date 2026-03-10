"use client";

import { formatCurrencyEUR } from '../../../lib/currency';
import { FinancialTransaction } from '../../../types/finance';

type TableProps = {
  items: FinancialTransaction[];
  onEdit: (item: FinancialTransaction) => void;
  onVoid: (item: FinancialTransaction) => void;
};

export function FinanceTransactionsTable({ items, onEdit, onVoid }: TableProps) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #dce8f5', padding: '8px 6px' }}>Data</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #dce8f5', padding: '8px 6px' }}>Tipo</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #dce8f5', padding: '8px 6px' }}>Categoria</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #dce8f5', padding: '8px 6px' }}>Descrizione</th>
            <th style={{ textAlign: 'right', borderBottom: '1px solid #dce8f5', padding: '8px 6px' }}>Importo</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #dce8f5', padding: '8px 6px' }}>Stato</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #dce8f5', padding: '8px 6px' }}>Azioni</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td style={{ borderBottom: '1px solid #eef4fb', padding: '8px 6px' }}>{item.transactionDate}</td>
              <td style={{ borderBottom: '1px solid #eef4fb', padding: '8px 6px' }}>{item.transactionType}</td>
              <td style={{ borderBottom: '1px solid #eef4fb', padding: '8px 6px' }}>{item.category}</td>
              <td style={{ borderBottom: '1px solid #eef4fb', padding: '8px 6px' }}>{item.description}</td>
              <td style={{ borderBottom: '1px solid #eef4fb', padding: '8px 6px', textAlign: 'right', color: item.transactionType === 'RICAVO' ? '#1b8a3f' : '#c62828' }}>
                {formatCurrencyEUR(item.amount)}
              </td>
              <td style={{ borderBottom: '1px solid #eef4fb', padding: '8px 6px' }}>
                {item.voided ? 'ANNULLATO' : item.autoCreated ? 'AUTO' : 'MANUALE'}
              </td>
              <td style={{ borderBottom: '1px solid #eef4fb', padding: '8px 6px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button type="button" className="logout-button" onClick={() => onEdit(item)} disabled={item.voided}>Modifica</button>
                <button type="button" className="logout-button" onClick={() => onVoid(item)} disabled={item.voided}>Annulla</button>
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={7} style={{ padding: 12, color: '#4f6b8a' }}>Nessun movimento trovato.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
