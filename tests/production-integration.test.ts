import { describe, expect, it } from 'vitest';
import { parseCsv, validateImportRow } from '../src/features/shipments/csvImport';
import { firstAllowedRoute, canAccessRoute, workspaceRoleFromRoles } from '../src/context/workspaceAccess';
import { financialStatus, minor, shipmentFromApi, shipmentStatus, taskStatus } from '../src/infrastructure/api/mappers';

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
    expect(workspaceRoleFromRoles(['auditor'])).toBe('accounting');
    expect(workspaceRoleFromRoles(['dispatcher'])).toBe('operations');
    expect(workspaceRoleFromRoles(['customer_service'])).toBe('support');
  });

  it('opens only routes backed by the user permissions', () => {
    const roles = ['dispatcher'];
    const permissions = ['shipments.manage', 'drivers.manage'];
    expect(canAccessRoute(roles, permissions, '/shipments')).toBe(true);
    expect(canAccessRoute(roles, permissions, '/accounting')).toBe(false);
    expect(firstAllowedRoute(roles, permissions)).toBe('/shipments');
    expect(canAccessRoute(['auditor'], ['reports.view'], '/')).toBe(true);
    expect(canAccessRoute(['warehouse_operator'], ['shipments.manage', 'intake.manage'], '/')).toBe(false);
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
});
