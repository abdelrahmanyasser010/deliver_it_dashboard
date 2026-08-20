import type { Shipment } from '../../../domain/logistics/entities';

export interface PrintValidationError {
  shipmentId: string;
  field: string;
  message: string;
}

export function validateShipmentsForPrinting(shipments: Shipment[]): {
  validShipments: Shipment[];
  invalidShipments: Array<{ shipment: Shipment; errors: PrintValidationError[] }>;
} {
  const validShipments: Shipment[] = [];
  const invalidShipments: Array<{ shipment: Shipment; errors: PrintValidationError[] }> = [];

  for (const shipment of shipments) {
    const errors: PrintValidationError[] = [];

    if (!shipment.id && !shipment.trackingNumber) {
      errors.push({
        shipmentId: shipment.id,
        field: 'trackingNumber',
        message: 'رقم الشحنة أو رقم التتبع مفقود',
      });
    }

    if (!shipment.customerName || !shipment.customerName.trim()) {
      errors.push({
        shipmentId: shipment.id,
        field: 'customerName',
        message: 'اسم المستلم مفقود',
      });
    }

    if (!shipment.customerPhone || !shipment.customerPhone.trim()) {
      errors.push({
        shipmentId: shipment.id,
        field: 'customerPhone',
        message: 'رقم هاتف المستلم مفقود',
      });
    }

    if (!shipment.address || !shipment.address.trim()) {
      errors.push({
        shipmentId: shipment.id,
        field: 'address',
        message: 'عنوان التسليم مفقود',
      });
    }

    if (errors.length > 0) {
      invalidShipments.push({ shipment, errors });
    } else {
      validShipments.push(shipment);
    }
  }

  return { validShipments, invalidShipments };
}
