export type FinancialTransactionType = 'RICAVO' | 'COSTO';

export type FinancialTransactionCategory =
  | 'SERVIZIO'
  | 'SERVIZIO_ESTERNO'
  | 'EXTRA'
  | 'ALTRO_RICAVO'
  | 'CARBURANTE'
  | 'BOLLO'
  | 'ASSICURAZIONE'
  | 'REVISIONE'
  | 'TAGLIANDO'
  | 'MANUTENZIONE_ORDINARIA'
  | 'MANUTENZIONE_STRAORDINARIA'
  | 'PEDAGGIO'
  | 'PARCHEGGIO'
  | 'COMMISSIONE'
  | 'ALTRO_COSTO';

export type FinancialTransaction = {
  id: number;
  transactionType: FinancialTransactionType;
  category: FinancialTransactionCategory;
  description: string;
  amount: number;
  currency: string;
  transactionDate: string;
  serviceId: number | null;
  vehicleId: number | null;
  driverId: number | null;
  deadlineOccurrenceId: number | null;
  notes: string | null;
  autoCreated: boolean;
  voided: boolean;
  voidedAt: string | null;
  voidReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type FinanceKpiSummary = {
  totalServices: number;
  totalRevenue: number;
  totalCosts: number;
  gross: number;
  net: number;
  averageRevenuePerService: number;
  averageCostPerService: number;
};

export type MonthlyFinancePoint = {
  month: number;
  revenue: number;
  costs: number;
  gross: number;
  net: number;
};

export type YearlyFinancePoint = {
  year: number;
  revenue: number;
  costs: number;
  gross: number;
  net: number;
};

export type CategorySummaryItem = {
  category: FinancialTransactionCategory;
  total: number;
};

export type YearComparison = {
  year: number;
  compareWith: number;
  currentYear: MonthlyFinancePoint[];
  comparedYear: MonthlyFinancePoint[];
};

export type FinanceDashboard = {
  year: number;
  month: number;
  monthKpis: FinanceKpiSummary;
  yearKpis: FinanceKpiSummary;
  monthlySeries: MonthlyFinancePoint[];
  categoryCosts: CategorySummaryItem[];
  comparison: YearComparison;
};

export type SaveFinancialTransactionPayload = {
  transactionType: FinancialTransactionType;
  category: FinancialTransactionCategory;
  description: string;
  amount: number;
  currency: string;
  transactionDate: string;
  serviceId?: number | null;
  vehicleId?: number | null;
  driverId?: number | null;
  deadlineOccurrenceId?: number | null;
  notes?: string | null;
};
