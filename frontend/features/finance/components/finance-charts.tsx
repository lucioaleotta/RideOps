"use client";

import { CategorySummaryItem, MonthlyFinancePoint, YearComparison } from '../../../types/finance';
import { formatCurrencyEUR } from '../../../lib/currency';

function maxValue(values: number[]) {
  const max = Math.max(...values, 0);
  return max <= 0 ? 1 : max;
}

export function FinanceMonthlyBars({ series }: { series: MonthlyFinancePoint[] }) {
  const highest = maxValue(series.flatMap((item) => [item.revenue, item.costs, Math.abs(item.net)]));

  return (
    <article className="dashboard-card">
      <h3>Istogramma mensile Ricavi/Costi/Netto</h3>
      <div style={{ display: 'grid', gap: 8 }}>
        {series.map((item) => (
          <div key={item.month} style={{ display: 'grid', gap: 4 }}>
            <strong>Mese {item.month}</strong>
            <div className="finance-bars-row">
              <div className="finance-bar revenue" style={{ width: `${(item.revenue / highest) * 100}%` }}>R {formatCurrencyEUR(item.revenue)}</div>
            </div>
            <div className="finance-bars-row">
              <div className="finance-bar cost" style={{ width: `${(item.costs / highest) * 100}%` }}>C {formatCurrencyEUR(item.costs)}</div>
            </div>
            <div className="finance-bars-row">
              <div className={`finance-bar ${item.net >= 0 ? 'net-positive' : 'net-negative'}`} style={{ width: `${(Math.abs(item.net) / highest) * 100}%` }}>
                N {formatCurrencyEUR(item.net)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

export function FinanceCategoryDistribution({ items }: { items: CategorySummaryItem[] }) {
  const highest = maxValue(items.map((item) => item.total));

  return (
    <article className="dashboard-card">
      <h3>Distribuzione costi per categoria</h3>
      <div style={{ display: 'grid', gap: 10 }}>
        {items.length === 0 && <p>Nessun costo disponibile nel periodo.</p>}
        {items.map((item) => (
          <div key={item.category}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
              <span>{item.category}</span>
              <strong>{formatCurrencyEUR(item.total)}</strong>
            </div>
            <div className="finance-bars-row">
              <div className="finance-bar category" style={{ width: `${(item.total / highest) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

export function FinanceYearComparisonChart({ comparison }: { comparison: YearComparison }) {
  const months = Array.from({ length: 12 }, (_, index) => index + 1);
  const currentMap = new Map(comparison.currentYear.map((item) => [item.month, item.net]));
  const previousMap = new Map(comparison.comparedYear.map((item) => [item.month, item.net]));
  const highest = maxValue(months.flatMap((month) => [Math.abs(currentMap.get(month) ?? 0), Math.abs(previousMap.get(month) ?? 0)]));

  return (
    <article className="dashboard-card">
      <h3>Confronto netto {comparison.year} vs {comparison.compareWith}</h3>
      <div style={{ display: 'grid', gap: 8 }}>
        {months.map((month) => {
          const current = currentMap.get(month) ?? 0;
          const previous = previousMap.get(month) ?? 0;

          return (
            <div key={month} style={{ display: 'grid', gap: 4 }}>
              <strong>M{month}</strong>
              <div className="finance-bars-row">
                <div className="finance-bar revenue" style={{ width: `${(Math.abs(current) / highest) * 100}%` }}>
                  {comparison.year}: {formatCurrencyEUR(current)}
                </div>
              </div>
              <div className="finance-bars-row">
                <div className="finance-bar cost" style={{ width: `${(Math.abs(previous) / highest) * 100}%` }}>
                  {comparison.compareWith}: {formatCurrencyEUR(previous)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}
