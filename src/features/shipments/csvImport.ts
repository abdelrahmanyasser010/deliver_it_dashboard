import type { Shipment } from '../../domain/logistics/entities';

export interface CsvPreviewRow {
  rowNumber: number;
  data: Record<string, string>;
  errors: string[];
  duplicate: boolean;
}

export interface CsvPreview {
  fileName: string;
  rows: CsvPreviewRow[];
}

export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && quoted && next === '"') { cell += '"'; index += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) { row.push(cell.trim()); cell = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = '';
    } else cell += char;
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  const [headers = [], ...dataRows] = rows;
  return dataRows.map((values) => Object.fromEntries(headers.map((header, index) => [header.replace(/^\uFEFF/, '').trim(), values[index] ?? ''])));
}

export function getCsvValue(row: Record<string, string>, keys: string[]) {
  for (const key of keys) if (row[key]?.trim()) return row[key].trim();
  return '';
}

export function validateImportRow(data: Record<string, string>, rowNumber: number, existingCodes: Set<string>): CsvPreviewRow {
  const errors: string[] = [];
  const customer = getCsvValue(data, ['customerName', 'العميل', 'name']);
  const phone = getCsvValue(data, ['phone', 'customerPhone', 'الهاتف']);
  const address = getCsvValue(data, ['address', 'العنوان']);
  const amountText = getCsvValue(data, ['total', 'المبلغ', 'amount']);
  const code = getCsvValue(data, ['code', 'trackingNumber', 'كود', 'البوليصة']);
  const amount = Number(amountText);
  if (!customer) errors.push('اسم العميل مطلوب');
  if (!/^01\d{9}$/.test(phone.replace(/\s/g, ''))) errors.push('رقم الهاتف غير صحيح');
  if (!address) errors.push('العنوان مطلوب');
  if (!Number.isFinite(amount) || amount < 0) errors.push('المبلغ غير صحيح');
  return { rowNumber, data, errors, duplicate: Boolean(code && existingCodes.has(code)) };
}

export function buildImportedShipment(row: Record<string, string>, index: number): Shipment {
  const externalCode = getCsvValue(row, ['code', 'trackingNumber', 'كود', 'البوليصة']) || `EXT-${String(index + 1).padStart(4, '0')}`;
  const total = Number(getCsvValue(row, ['total', 'المبلغ', 'amount']) || 0);
  const deliveryFee = Number(getCsvValue(row, ['deliveryFee', 'رسوم الشحن']) || 50);
  const now = new Date().toISOString();
  return {
    id: `IMP-${String(index + 1).padStart(4, '0')}`, trackingNumber: externalCode,
    customerName: getCsvValue(row, ['customerName', 'العميل', 'name']) || 'عميل مستورد', customerPhone: getCsvValue(row, ['phone', 'customerPhone', 'الهاتف']) || '01000000000',
    governorate: getCsvValue(row, ['governorate', 'المحافظة']) || 'القاهرة', city: getCsvValue(row, ['city', 'المدينة']) || 'غير محدد', address: getCsvValue(row, ['address', 'العنوان']) || 'عنوان غير محدد',
    status: 'readyToShip', taskStatus: 'needsPickup', financialStatus: 'notDue', priority: 'normal', paymentType: 'cashOnDelivery', total, deliveryFee, discount: 0, collectedCash: 0, expectedCollection: total, remittedCash: 0,
    items: [{ name: getCsvValue(row, ['item', 'المنتج']) || 'شحنة مستوردة', quantity: 1, price: Math.max(0, total - deliveryFee) }],
    merchantId: getCsvValue(row, ['merchantId']) || 'EXT-MERCHANT', merchantName: getCsvValue(row, ['merchantName', 'التاجر']) || 'تاجر مستورد', createdAt: now, lastUpdatedAt: now, statusChangedAt: now,
    expectedDeliveryAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), attemptCount: 0, settlementStatus: 'unsettled',
  };
}
