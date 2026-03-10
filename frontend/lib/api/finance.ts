import {
  CategorySummaryItem,
  FinanceDashboard,
  FinanceKpiSummary,
  FinancialTransaction,
  FinancialTransactionCategory,
  FinancialTransactionType,
  MonthlyFinancePoint,
  SaveFinancialTransactionPayload,
  YearComparison,
  YearlyFinancePoint
} from '../../types/finance';

type ListFilters = {
  fromDate?: string;
  toDate?: string;
  type?: FinancialTransactionType;
  category?: FinancialTransactionCategory;
  serviceId?: number;
  vehicleId?: number;
  sortBy?: string;
  direction?: 'asc' | 'desc';
};

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => ({}))) as T | { message?: string };
  if (!response.ok) {
    throw new Error((payload as { message?: string }).message ?? 'Request failed');
  }
  return payload as T;
}

export async function listFinanceTransactions(filters: ListFilters = {}): Promise<FinancialTransaction[]> {
  const query = new URLSearchParams();

  if (filters.fromDate) query.set('fromDate', filters.fromDate);
  if (filters.toDate) query.set('toDate', filters.toDate);
  if (filters.type) query.set('type', filters.type);
  if (filters.category) query.set('category', filters.category);
  if (filters.serviceId) query.set('serviceId', String(filters.serviceId));
  if (filters.vehicleId) query.set('vehicleId', String(filters.vehicleId));
  if (filters.sortBy) query.set('sortBy', filters.sortBy);
  if (filters.direction) query.set('direction', filters.direction);

  const target = query.size > 0 ? `/api/finance/transactions?${query.toString()}` : '/api/finance/transactions';
  return parseResponse<FinancialTransaction[]>(await fetch(target, { cache: 'no-store' }));
}

export async function createFinanceTransaction(payload: SaveFinancialTransactionPayload): Promise<FinancialTransaction> {
  return parseResponse<FinancialTransaction>(await fetch('/api/finance/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }));
}

export async function updateFinanceTransaction(id: number, payload: SaveFinancialTransactionPayload): Promise<FinancialTransaction> {
  return parseResponse<FinancialTransaction>(await fetch(`/api/finance/transactions/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }));
}

export async function voidFinanceTransaction(id: number, reason: string): Promise<FinancialTransaction> {
  return parseResponse<FinancialTransaction>(await fetch(`/api/finance/transactions/${id}/void`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason })
  }));
}

export async function getFinanceDashboard(year: number, month: number): Promise<FinanceDashboard> {
  return parseResponse<FinanceDashboard>(await fetch(`/api/finance/dashboard?year=${year}&month=${month}`, { cache: 'no-store' }));
}

export async function getMonthlySummary(year: number): Promise<MonthlyFinancePoint[]> {
  return parseResponse<MonthlyFinancePoint[]>(await fetch(`/api/finance/summary/monthly?year=${year}`, { cache: 'no-store' }));
}

export async function getYearlySummary(): Promise<YearlyFinancePoint[]> {
  return parseResponse<YearlyFinancePoint[]>(await fetch('/api/finance/summary/yearly', { cache: 'no-store' }));
}

export async function getCostByCategory(year: number, month?: number): Promise<CategorySummaryItem[]> {
  const query = new URLSearchParams({ year: String(year) });
  if (month) query.set('month', String(month));
  return parseResponse<CategorySummaryItem[]>(await fetch(`/api/finance/costs/by-category?${query.toString()}`, { cache: 'no-store' }));
}

export async function getServiceStats(year: number, month?: number): Promise<FinanceKpiSummary> {
  const query = new URLSearchParams({ year: String(year) });
  if (month) query.set('month', String(month));
  return parseResponse<FinanceKpiSummary>(await fetch(`/api/finance/services/stats?${query.toString()}`, { cache: 'no-store' }));
}

export async function getFinanceComparison(year: number, compareWith: number): Promise<YearComparison> {
  return parseResponse<YearComparison>(await fetch(`/api/finance/comparison?year=${year}&compareWith=${compareWith}`, { cache: 'no-store' }));
}
