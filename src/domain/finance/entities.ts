export type MerchantSettlementStatus = 'draft' | 'underReview' | 'approved' | 'paid' | 'reconciled' | 'disputed' | 'cancelled';

export interface SettlementLine {
  shipmentId: string;
  merchantId: string;
  grossCollection: number;
  shippingFee: number;
  driverDeliveryCost?: number;
  returnFee: number;
  discount: number;
  adjustment: number;
  netPayable: number;
}

export interface MerchantSettlement {
  id: string;
  merchantId: string;
  merchantName: string;
  periodStart: string;
  periodEnd: string;
  status: MerchantSettlementStatus;
  shipmentIds: string[];
  lines: SettlementLine[];
  grossCollection: number;
  shippingFees: number;
  returnFees: number;
  discounts: number;
  adjustments: number;
  netPayable: number;
  createdAt: string;
  approvedAt?: string;
  paidAt?: string;
  paymentReference?: string;
}

export interface FinancialLedgerEntry {
  id: string;
  date: string;
  account: string;
  description: string;
  debit: number;
  credit: number;
  status: 'pending' | 'posted' | 'reversed';
  sourceType: 'shipment' | 'driverRemittance' | 'settlement' | 'adjustment' | 'operationalExpense' | 'driverAdjustment';
  sourceId: string;
}

export type OperationalExpenseCategory = 'rent' | 'utilities' | 'salaries' | 'fuel' | 'maintenance' | 'packaging' | 'marketing' | 'software' | 'other';

export interface OperationalExpense {
  id: string;
  date: string;
  category: OperationalExpenseCategory;
  description: string;
  amount: number;
  paymentMethod: 'cash' | 'bank' | 'wallet';
  status: 'pending' | 'approved';
  createdBy: string;
}

export type DriverAdjustmentType = 'bonus' | 'deduction' | 'reimbursement' | 'advance';

export interface DriverFinancialAdjustment {
  id: string;
  driverId: string;
  driverName: string;
  date: string;
  type: DriverAdjustmentType;
  amount: number;
  description: string;
  status: 'pending' | 'approved';
  createdBy: string;
}
