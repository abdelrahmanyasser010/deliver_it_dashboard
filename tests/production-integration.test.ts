import { describe, expect, it } from 'vitest';
import { parseCsv, validateImportRow } from '../src/features/shipments/csvImport';
import { firstAllowedRoute, canAccessRoute } from '../src/context/workspaceAccess';
import { workspaceRole } from '../src/context/WorkspaceContext';
import { driverFromApi, financialStatus, minor, shipmentFromApi, shipmentStatus, taskStatus } from '../src/infrastructure/api/mappers';

describe('CSV import validation', () => {
  it('parses quoted CSV cells and rejects duplicate shipment codes without inventing missing customer data', () => {
    const [row] = parseCsv('code,customerName,phone,address,total\nSHP-1,"أحمد، محمد",01012345678,"القاهرة، مصر الجديدة",500');
    expect(row.customerName).toBe('أحمد، محمد');
    const result = validateImportRow(row, 2, new Set(['SHP-1']));
    expect(result.errors).toHaveLength(0);
    expect(result.duplicate).toBe(true);
  });

  it('requires recipient, phone, address and amount instead of filling fake production values', () => {
    const result = validateImportRow({ code: 'SHP-2' }, 2, new Set());
    expect(result.errors.length).toBeGreaterThanOrEqual(4);
  });
});

describe('dashboard access model', () => {
  it('maps company roles to the correct workspace shell', () => {
    expect(workspaceRole(['auditor'], ['reports.view'])).toBe('accounting');
    expect(workspaceRole(['dispatcher'], ['drivers.read'])).toBe('operations');
    expect(workspaceRole(['customer_service'], ['conversations.read'])).toBe('support');
    expect(workspaceRole(['accountant'], ['settlements.read'])).toBe('accounting');
  });

  it('opens only routes backed by the user permissions', () => {
    expect(canAccessRoute('operations', '/shipments')).toBe(true);
    expect(canAccessRoute('operations', '/accounting')).toBe(false);
    expect(firstAllowedRoute('operations')).toBe('/operations');
    expect(canAccessRoute('accounting', '/reports')).toBe(true);
    expect(canAccessRoute('support', '/barcode')).toBe(false);
  });
});

describe('backend DTO mapping', () => {
  it('treats money values as minor units and preserves the resource version', () => {
    expect(minor(12550)).toBe(125.5);
    const shipment = shipmentFromApi({
      id: 'shipment-1', tracking_number: 'D-100', recipient_name: 'Test', recipient_phone: '01012345678',
      operational_status: 'out_for_delivery', task_status: 'needs_status_approval', financial_status: 'awaiting_collection',
      expected_collection_minor: 12550, delivery_fee_minor: 1500, discount_minor: 250,
      merchant_id: 'merchant-1', version: 7, created_at: '2026-08-07T10:00:00Z', updated_at: '2026-08-07T11:00:00Z',
    });
    expect(shipment.expectedCollection).toBe(125.5);
    expect(shipment.deliveryFee).toBe(15);
    expect(shipment.discount).toBe(2.5);
    expect(shipment.version).toBe(7);
  });

  it('maps official backend states without relying on demo labels', () => {
    expect(shipmentStatus('assigned_to_driver')).toBe('deliveredToDriver');
    expect(shipmentStatus('out_for_delivery')).toBe('inTransit');
    expect(taskStatus('needs_driver_assignment')).toBe('needsDriverAssignment');
    expect(financialStatus('partially_collected')).toBe('partiallyCollected');
  });


  it('preserves driver tenant master-data and restricted state from real API projections', () => {
    const driver = driverFromApi({
      id: 'driver-1', name: 'Driver', phone: '01012345678', status: 'restricted', availability: 'offline',
      code: 'DRV-1', branch_id: 'branch-1', branch_name: 'القاهرة',
      service_area_ids: '["zone-1","zone-2"]', metadata: '{"zone_id":"zone-1","task_types":["pickup","delivery"]}',
      max_batch_shipments: 8, max_open_tasks: 12, shift_status: 'on_shift', version: 3,
    });
    expect(driver.accountStatus).toBe('restricted');
    expect(driver.zoneId).toBe('zone-1');
    expect(driver.serviceAreaIds).toEqual(['zone-1', 'zone-2']);
    expect(driver.taskTypes).toEqual(['pickup', 'delivery']);
    expect(driver.branchId).toBe('branch-1');
    expect(driver.onShift).toBe(true);
  });
});
