import type { DriverFinancialAdjustment, OperationalExpense } from './entities';
import type { Shipment } from '../logistics/entities';
import type { PricingPolicySettings } from '../settings/entities';

export function rateForShipment(shipment: Shipment, pricing: PricingPolicySettings) {
  const rates = pricing.governorateRates ?? [];
  return rates.find((rate) => shipment.governorate.includes(rate.governorate) || rate.governorate.includes(shipment.governorate))
    ?? rates[0];
}

export function merchantShippingFee(shipment: Shipment, pricing: PricingPolicySettings) {
  return shipment.pricingSnapshot?.merchantDeliveryFee
    ?? shipment.pricingSnapshot?.shippingFee
    ?? shipment.deliveryFee
    ?? rateForShipment(shipment, pricing)?.merchantDeliveryFee
    ?? rateForShipment(shipment, pricing)?.deliveryFee
    ?? 0;
}

export function driverDeliveryCost(shipment: Shipment, pricing: PricingPolicySettings) {
  return shipment.pricingSnapshot?.driverDeliveryCost
    ?? rateForShipment(shipment, pricing)?.driverDeliveryCost
    ?? Math.round(merchantShippingFee(shipment, pricing) * 0.65);
}

export function shipmentShippingProfit(shipment: Shipment, pricing: PricingPolicySettings) {
  if (!['delivered', 'partiallyDelivered'].includes(shipment.status)) return 0;
  return Math.max(0, merchantShippingFee(shipment, pricing) - driverDeliveryCost(shipment, pricing));
}

export function shippingRevenue(shipments: Shipment[], pricing: PricingPolicySettings) {
  return shipments
    .filter((shipment) => ['delivered', 'partiallyDelivered'].includes(shipment.status))
    .reduce((sum, shipment) => sum + merchantShippingFee(shipment, pricing), 0);
}

export function deliveryCost(shipments: Shipment[], pricing: PricingPolicySettings) {
  return shipments
    .filter((shipment) => ['delivered', 'partiallyDelivered'].includes(shipment.status))
    .reduce((sum, shipment) => sum + driverDeliveryCost(shipment, pricing), 0);
}

export function approvedOperationalExpenses(expenses: OperationalExpense[]) {
  return expenses
    .filter((expense) => expense.status === 'approved')
    .reduce((sum, expense) => sum + expense.amount, 0);
}

export function approvedDriverAdjustmentCost(adjustments: DriverFinancialAdjustment[]) {
  return adjustments
    .filter((adjustment) => adjustment.status === 'approved' && ['bonus', 'reimbursement', 'advance'].includes(adjustment.type))
    .reduce((sum, adjustment) => sum + adjustment.amount, 0);
}
