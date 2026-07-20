export type MerchantSettlementStatus = 'draft' | 'underReview' | 'approved' | 'paid' | 'reconciled' | 'disputed' | 'cancelled';

export interface SettlementLine {
  shipmentId: string;
  merchantId: string;
  grossCollection: number;
  shippingFee: number;
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
  sourceType: 'shipment' | 'driverRemittance' | 'settlement' | 'adjustment';
  sourceId: string;
}
