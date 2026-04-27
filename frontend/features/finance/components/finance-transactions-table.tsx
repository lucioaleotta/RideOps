"use client";

import { useEffect, useState } from 'react';
import { formatCurrencyEUR } from '../../../lib/currency';
import { CancelIcon, EditIcon } from '../../../components/action-icons';
import { FinancialTransaction } from '../../../types/finance';

function toTitleCase(str: string): string {
  return str.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

type TableProps = {
  items: FinancialTransaction[];
  onEdit: (item: FinancialTransaction) => void;
  onVoid: (item: FinancialTransaction) => void;
};

export function FinanceTransactionsTable({ items, onEdit, onVoid }: TableProps) {
  const [rowMenuTransactionId, setRowMenuTransactionId] = useState<number | null>(null);

  useEffect(() => {
    function onDocumentClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      if (target && target.closest('.services-row-menu')) {
        return;
      }
      setRowMenuTransactionId(null);
    }

    function onDocumentKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setRowMenuTransactionId(null);
      }
    }

    document.addEventListener('click', onDocumentClick);
    document.addEventListener('keydown', onDocumentKeyDown);
    return () => {
      document.removeEventListener('click', onDocumentClick);
      document.removeEventListener('keydown', onDocumentKeyDown);
    };
  }, []);

  function getTypeClassName(item: FinancialTransaction) {
    return item.transactionType === 'RICAVO'
      ? 'finance-movements-pill finance-movements-pill-revenue'
      : 'finance-movements-pill finance-movements-pill-cost';
  }

  function getStatusLabel(item: FinancialTransaction) {
    if (item.voided) {
      return 'ANNULLATO';
    }
    return item.autoCreated ? 'AUTO' : 'MANUALE';
  }

  function getStatusClassName(item: FinancialTransaction) {
    if (item.voided) {
      return 'finance-movements-pill finance-movements-pill-voided';
    }
    return item.autoCreated
      ? 'finance-movements-pill finance-movements-pill-auto'
      : 'finance-movements-pill finance-movements-pill-manual';
  }

  return (
    <>
      {/* Desktop table */}
      <div className="finance-movements-table-wrap finance-movements-desktop-table">
        <table className="finance-movements-table">
          <thead>
            <tr>
              <th className="finance-movements-th">Data</th>
              <th className="finance-movements-th">Tipo</th>
              <th className="finance-movements-th">Categoria</th>
              <th className="finance-movements-th">Descrizione</th>
              <th className="finance-movements-th finance-movements-th-amount">Importo</th>
              <th className="finance-movements-th">Stato</th>
              <th className="finance-movements-th finance-movements-th-actions">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td className="finance-movements-td finance-movements-date">{item.transactionDate}</td>
                <td className="finance-movements-td">
                  <span className={getTypeClassName(item)}>{item.transactionType}</span>
                </td>
                <td className="finance-movements-td finance-movements-category">{item.category ? toTitleCase(item.category) : ''}</td>
                <td className="finance-movements-td finance-movements-description">{item.description}</td>
                <td className="finance-movements-td finance-movements-amount-cell">
                  <span className={item.transactionType === 'RICAVO' ? 'finance-movements-amount finance-movements-amount-revenue' : 'finance-movements-amount finance-movements-amount-cost'}>
                    {item.transactionType === 'RICAVO' ? '+' : '-'} {formatCurrencyEUR(Math.abs(item.amount))}
                  </span>
                </td>
                <td className="finance-movements-td">
                  <span className={getStatusClassName(item)}>{getStatusLabel(item)}</span>
                </td>
                <td className="finance-movements-td finance-movements-actions-cell">
                  <div className="services-row-menu">
                    <button
                      type="button"
                      className="services-row-menu-btn"
                      aria-label={`Azioni movimento ${item.id}`}
                      title="Azioni"
                      onClick={() => setRowMenuTransactionId((prev) => (prev === item.id ? null : item.id))}
                    >
                      ...
                    </button>

                    {rowMenuTransactionId === item.id && (
                      <div className="services-row-menu-dropdown">
                        <button
                          type="button"
                          className="services-row-menu-item"
                          onClick={() => {
                            setRowMenuTransactionId(null);
                            onEdit(item);
                          }}
                          disabled={item.voided}
                        >
                          <span className="services-row-menu-item-icon"><EditIcon /></span>
                          Modifica
                        </button>
                        <button
                          type="button"
                          className="services-row-menu-item"
                          onClick={() => {
                            setRowMenuTransactionId(null);
                            onVoid(item);
                          }}
                          disabled={item.voided}
                        >
                          <span className="services-row-menu-item-icon"><CancelIcon /></span>
                          Annulla
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={7} className="finance-movements-empty">Nessun movimento trovato.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <div className="finance-movements-mobile-list">
        {items.length === 0 && (
          <p className="finance-movements-empty">Nessun movimento trovato.</p>
        )}
        {items.map((item) => (
          <article key={item.id} className={`finance-movement-card${item.voided ? ' is-voided' : ''}`}>
            <div className="finance-movement-card-top">
              <div className="finance-movement-card-badges">
                <span className={getTypeClassName(item)}>{item.transactionType}</span>
                <span className={getStatusClassName(item)}>{getStatusLabel(item)}</span>
              </div>
              <span className={item.transactionType === 'RICAVO' ? 'finance-movements-amount finance-movements-amount-revenue' : 'finance-movements-amount finance-movements-amount-cost'}>
                {item.transactionType === 'RICAVO' ? '+' : '-'} {formatCurrencyEUR(Math.abs(item.amount))}
              </span>
            </div>

            <div className="finance-movement-card-desc">{item.description}</div>

            <div className="finance-movement-card-meta">
              <span className="finance-movement-card-date">{item.transactionDate}</span>
              {item.category && (
                <span className="finance-movement-card-category">{toTitleCase(item.category)}</span>
              )}
            </div>

            <div className="finance-movement-card-actions">
              <button
                type="button"
                className="compact-button secondary-button"
                onClick={() => onEdit(item)}
                disabled={item.voided}
                aria-label={`Modifica movimento ${item.id}`}
              >
                <span className="button-icon"><EditIcon /></span>
                <span className="button-label">Modifica</span>
              </button>
              <button
                type="button"
                className="compact-button logout-button"
                onClick={() => onVoid(item)}
                disabled={item.voided}
                aria-label={`Annulla movimento ${item.id}`}
              >
                <span className="button-icon"><CancelIcon /></span>
                <span className="button-label">Annulla</span>
              </button>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
