export type ReportTab = 'orderValue' | 'operations' | 'drivers' | 'governorates' | 'delays';
export type AccountingStatus = 'open' | 'readyToClose' | 'closed';

export interface OrderValueDailyPoint {
  day: string;
  orders: number;
  orderValue: number;
  shippingFees: number;
  returns: number;
}

export interface DriverPerformanceReport {
  driverId: string;
  driverName: string;
  zone: string;
  assigned: number;
  delivered: number;
  returned: number;
  delayed: number;
  collectedCash: number;
  successRate: number;
}

export interface GovernorateReport {
  governorate: string;
  total: number;
  delivered: number;
  inTransit: number;
  returned: number;
  delayed: number;
  avgDeliveryHours: number;
}

export interface StatusFunnelStep {
  label: string;
  count: number;
  tone: 'info' | 'success' | 'warning' | 'danger';
}

export interface DelayAlert {
  id: string;
  shipmentId: string;
  merchantName: string;
  driverName?: string;
  governorate: string;
  reason: string;
  lateByHours: number;
  severity: 'medium' | 'high';
}

export interface ReportsSnapshot {
  orderValueTrend: OrderValueDailyPoint[];
  driverPerformance: DriverPerformanceReport[];
  governorates: GovernorateReport[];
  funnel: StatusFunnelStep[];
  delays: DelayAlert[];
}

export interface MonthlyCloseSummary {
  month: string;
  status: AccountingStatus;
  grossOrderValue: number;
  codCollected: number;
  shippingRevenue: number;
  returnFees: number;
  merchantPayouts: number;
  driverRemittances: number;
  driverEarnings: number;
  operatingExpenses: number;
  netCompanyRevenue: number;
  cashVariance: number;
}

export interface BudgetLine {
  label: string;
  actual: number;
  budget: number;
}

export interface LedgerEntry {
  id: string;
  date: string;
  account: string;
  description: string;
  debit: number;
  credit: number;
  status: 'pending' | 'posted';
}

export interface MonthlyCloseChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

export interface AccountingSnapshot {
  closeSummary: MonthlyCloseSummary;
  budget: BudgetLine[];
  ledger: LedgerEntry[];
  checklist: MonthlyCloseChecklistItem[];
}
