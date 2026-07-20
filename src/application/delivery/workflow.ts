import type { Shipment, ShipmentFinancialStatus, ShipmentStatus, ShipmentTaskStatus } from '../../domain/logistics/entities';

export const shipmentTransitions: Record<ShipmentStatus, ShipmentStatus[]> = {
  draft: ['readyToShip'],
  readyToShip: ['receivedAtOffice'],
  receivedAtOffice: ['deliveredToDriver', 'returned'],
  deliveredToDriver: ['inTransit', 'returned'],
  inTransit: ['delivered', 'postponed', 'failedToDeliver', 'returned'],
  delivered: [],
  postponed: ['inTransit', 'failedToDeliver', 'returned'],
  failedToDeliver: ['inTransit', 'postponed', 'returned'],
  returned: [],
};

export function canTransition(current: ShipmentStatus, next: ShipmentStatus) {
  return shipmentTransitions[current].includes(next);
}

export function deriveShipmentStateAfterTransition(shipment: Shipment, next: ShipmentStatus) {
  let taskStatus: ShipmentTaskStatus = 'none';
  let financialStatus: ShipmentFinancialStatus = shipment.financialStatus;
  let collectedCash = shipment.collectedCash;

  if (next === 'readyToShip') taskStatus = 'needsPickup';
  if (next === 'receivedAtOffice') taskStatus = 'needsDriverAssignment';
  if (next === 'failedToDeliver' || next === 'postponed') taskStatus = 'needsCustomerService';
  if (next === 'returned') taskStatus = 'needsReturnProcessing';
  if (next === 'delivered') {
    if (shipment.paymentType === 'cashOnDelivery') {
      collectedCash = shipment.expectedCollection;
      financialStatus = 'collected';
    } else financialStatus = 'notDue';
  }

  return { taskStatus, financialStatus, collectedCash, exceptionReason: undefined };
}
