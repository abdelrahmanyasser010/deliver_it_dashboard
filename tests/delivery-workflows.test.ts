import { beforeEach, describe, expect, it } from 'vitest';
import { reduceDeliveryCommand } from '../src/application/delivery/reducer';
import type { DeliveryState } from '../src/application/delivery/types';
import { mockDeliveryGateway } from '../src/infrastructure/delivery/mockDeliveryGateway';

let base: DeliveryState;
beforeEach(async () => { base = await mockDeliveryGateway.load(); });

describe('shipment workflow', () => {
  it('rejects an invalid direct transition', () => {
    const shipment = { ...base.shipments[0], status: 'draft' as const };
    const state = { ...base, shipments: [shipment, ...base.shipments.slice(1)] };
    const output = reduceDeliveryCommand(state, { type: 'shipment/transition', shipmentIds: [shipment.id], nextStatus: 'delivered', reason: 'invalid test' });
    expect(output.result.ok).toBe(false);
    expect(output.state.shipments.find((item) => item.id === shipment.id)?.status).toBe('draft');
  });

  it('respects driver capacity and reports partial failures', () => {
    const driver = { ...base.drivers[0], capacity: 1, activeLoad: 0, status: 'active' as const };
    const candidates = base.shipments.slice(0, 2).map((shipment) => ({ ...shipment, driverId: undefined, driverName: undefined, status: 'receivedAtOffice' as const, taskStatus: 'needsDriverAssignment' as const }));
    const state = { ...base, drivers: [driver, ...base.drivers.slice(1)], shipments: [...candidates, ...base.shipments.slice(2)] };
    const output = reduceDeliveryCommand(state, { type: 'shipment/assignDriver', shipmentIds: candidates.map((item) => item.id), driverId: driver.id });
    expect(output.result.ok).toBe(true);
    expect(output.result.errors).toHaveLength(1);
    expect(output.state.shipments.filter((item) => candidates.some((candidate) => candidate.id === item.id) && item.driverId === driver.id)).toHaveLength(1);
  });
});

describe('connected operational workflows', () => {
  it('closes a complete barcode batch and updates the shipment', () => {
    const shipment = { ...base.shipments[0], status: 'readyToShip' as const, taskStatus: 'needsPickup' as const };
    const batch = { id: 'BAR-TEST', merchantId: shipment.merchantId, merchantName: shipment.merchantName, expectedShipmentIds: [shipment.id], scannedShipmentIds: [shipment.id], unexpectedShipmentIds: [], duplicateScans: [], status: 'open' as const, createdAt: new Date().toISOString(), operatorName: 'Test' };
    const state = { ...base, shipments: [shipment, ...base.shipments.slice(1)], barcodeBatches: [batch] };
    const output = reduceDeliveryCommand(state, { type: 'barcode/close', batchId: batch.id });
    expect(output.result.ok).toBe(true);
    expect(output.state.barcodeBatches[0].status).toBe('closed');
    expect(output.state.shipments.find((item) => item.id === shipment.id)?.status).toBe('receivedAtOffice');
    expect(output.state.shipments.find((item) => item.id === shipment.id)?.taskStatus).toBe('needsDriverAssignment');
  });

  it('resolves an unassigned exception by assigning a real driver', () => {
    const shipment = { ...base.shipments[0], status: 'receivedAtOffice' as const, taskStatus: 'needsDriverAssignment' as const, driverId: undefined, driverName: undefined };
    const driver = { ...base.drivers[0], status: 'active' as const, capacity: 20, activeLoad: 0 };
    const state = { ...base, shipments: [shipment, ...base.shipments.slice(1)], drivers: [driver, ...base.drivers.slice(1)] };
    const output = reduceDeliveryCommand(state, { type: 'exception/resolve', shipmentId: shipment.id, resolution: 'تعيين مندوب', driverId: driver.id });
    expect(output.result.ok).toBe(true);
    expect(output.state.shipments.find((item) => item.id === shipment.id)?.driverId).toBe(driver.id);
    expect(output.state.shipments.find((item) => item.id === shipment.id)?.taskStatus).toBe('none');
  });
});

describe('financial workflow', () => {
  it('creates, approves and pays a settlement while updating shipment and ledger', () => {
    const shipment = { ...base.shipments[0], status: 'delivered' as const, financialStatus: 'remitted' as const, settlementStatus: 'unsettled' as const, collectedCash: base.shipments[0].expectedCollection, remittedCash: base.shipments[0].expectedCollection, settlementId: undefined };
    let state = { ...base, shipments: [shipment, ...base.shipments.slice(1)], settlements: [] };
    const created = reduceDeliveryCommand(state, { type: 'settlement/create', shipmentIds: [shipment.id] });
    expect(created.result.ok).toBe(true);
    const settlementId = created.result.createdId!;
    state = created.state;
    const approved = reduceDeliveryCommand(state, { type: 'settlement/approve', settlementId });
    expect(approved.result.ok).toBe(true);
    const paid = reduceDeliveryCommand(approved.state, { type: 'settlement/pay', settlementId, paymentReference: 'BANK-TEST' });
    expect(paid.result.ok).toBe(true);
    expect(paid.state.shipments.find((item) => item.id === shipment.id)?.financialStatus).toBe('settled');
    expect(paid.state.settlements.find((item) => item.id === settlementId)?.status).toBe('paid');
    expect(paid.state.ledgerEntries.filter((entry) => entry.sourceId === settlementId)).toHaveLength(2);
  });
});

describe('master data', () => {
  it('creates a driver with zero active load regardless of form values', () => {
    const driver = { ...base.drivers[0], id: 'DRV-NEW', shipmentsCount: 12, activeLoad: 12, capacity: 20 };
    const output = reduceDeliveryCommand(base, { type: 'driver/upsert', driver });
    const stored = output.state.drivers.find((item) => item.id === driver.id);
    expect(stored?.shipmentsCount).toBe(0);
    expect(stored?.activeLoad).toBe(0);
    expect(stored?.capacity).toBe(20);
  });
});

describe('CSV import validation', () => {
  it('parses quoted commas and validates duplicate shipment codes', async () => {
    const { parseCsv, validateImportRow } = await import('../src/features/shipments/csvImport');
    const [row] = parseCsv('code,customerName,phone,address,total\nSHP-1,"أحمد، محمد",01012345678,"القاهرة، مصر الجديدة",500');
    expect(row.customerName).toBe('أحمد، محمد');
    const result = validateImportRow(row, 2, new Set(['SHP-1']));
    expect(result.errors).toHaveLength(0);
    expect(result.duplicate).toBe(true);
  });
});
