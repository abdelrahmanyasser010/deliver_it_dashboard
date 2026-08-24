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

function numberValue(row: Record<string, string>, keys: string[]) {
  const raw = getCsvValue(row, keys).replace(/,/g, '');
  return raw === '' ? Number.NaN : Number(raw);
}

export function validateImportRow(data: Record<string, string>, rowNumber: number, existingCodes: Set<string>): CsvPreviewRow {
  const errors: string[] = [];
  const merchantId = getCsvValue(data, ['merchant_id', 'merchantId', 'معرف التاجر']);
  const customer = getCsvValue(data, ['recipient_name', 'customerName', 'العميل', 'name']);
  const phone = getCsvValue(data, ['recipient_phone', 'phone', 'customerPhone', 'الهاتف']);
  const governorate = getCsvValue(data, ['governorate', 'المحافظة']);
  const city = getCsvValue(data, ['city', 'المدينة']);
  const address = getCsvValue(data, ['address_line', 'address', 'العنوان']);
  const itemName = getCsvValue(data, ['item_name', 'item', 'المنتج']);
  const quantity = numberValue(data, ['quantity', 'الكمية']);
  const minorPrice = numberValue(data, ['unit_price_minor']);
  const currencyPrice = numberValue(data, ['unit_price', 'price', 'total', 'المبلغ', 'amount']);
  const code = getCsvValue(data, ['external_order_number', 'code', 'trackingNumber', 'كود', 'البوليصة']);

  if (!merchantId) errors.push('merchant_id مطلوب عند الاستيراد من لوحة الإدارة');
  if (!customer) errors.push('اسم المستلم مطلوب');
  if (!/^01\d{9}$/.test(phone.replace(/\s/g, ''))) errors.push('رقم الهاتف غير صحيح');
  if (!governorate) errors.push('المحافظة مطلوبة');
  if (!city) errors.push('المدينة مطلوبة');
  if (!address) errors.push('العنوان مطلوب');
  if (!itemName) errors.push('اسم الصنف مطلوب');
  if (!Number.isFinite(quantity) || quantity < 1 || !Number.isInteger(quantity)) errors.push('الكمية يجب أن تكون رقمًا صحيحًا أكبر من صفر');
  if ((!Number.isFinite(minorPrice) || minorPrice < 0) && (!Number.isFinite(currencyPrice) || currencyPrice < 0)) errors.push('سعر الصنف مطلوب');
  return { rowNumber, data, errors, duplicate: Boolean(code && existingCodes.has(code)) };
}

const canonicalHeaders = [
  'merchant_id','merchant_branch_id','external_order_number','recipient_name','recipient_phone','governorate','city','address_line','zone_id','landmark',
  'payment_type','customer_shipping_fee_minor','discount_minor','priority','notes','item_sku','item_name','quantity','unit_price_minor','weight_grams',
] as const;

function normalizedRow(row: Record<string, string>) {
  const directMinor = numberValue(row, ['unit_price_minor']);
  const currencyPrice = numberValue(row, ['unit_price', 'price', 'total', 'المبلغ', 'amount']);
  const shippingMinor = numberValue(row, ['customer_shipping_fee_minor']);
  const shippingCurrency = numberValue(row, ['deliveryFee', 'customer_shipping_fee', 'رسوم الشحن']);
  const discountMinor = numberValue(row, ['discount_minor']);
  const discountCurrency = numberValue(row, ['discount', 'الخصم']);
  const paymentRaw = getCsvValue(row, ['payment_type', 'paymentType', 'طريقة الدفع']).toLowerCase();
  const paymentType = ['prepaid','مدفوع','مدفوع مسبقا','مدفوع مسبقًا'].includes(paymentRaw) ? 'prepaid' : 'cash_on_delivery';
  return {
    merchant_id: getCsvValue(row, ['merchant_id','merchantId','معرف التاجر']),
    merchant_branch_id: getCsvValue(row, ['merchant_branch_id','merchantBranchId','معرف فرع التاجر']),
    external_order_number: getCsvValue(row, ['external_order_number','code','trackingNumber','كود','البوليصة']),
    recipient_name: getCsvValue(row, ['recipient_name','customerName','العميل','name']),
    recipient_phone: getCsvValue(row, ['recipient_phone','phone','customerPhone','الهاتف']).replace(/\s/g,''),
    governorate: getCsvValue(row, ['governorate','المحافظة']),
    city: getCsvValue(row, ['city','المدينة']),
    address_line: getCsvValue(row, ['address_line','address','العنوان']),
    zone_id: getCsvValue(row, ['zone_id','zoneId']),
    landmark: getCsvValue(row, ['landmark','علامة مميزة']),
    payment_type: paymentType,
    customer_shipping_fee_minor: String(Number.isFinite(shippingMinor) ? Math.max(0,Math.round(shippingMinor)) : Number.isFinite(shippingCurrency) ? Math.max(0,Math.round(shippingCurrency*100)) : 0),
    discount_minor: String(Number.isFinite(discountMinor) ? Math.max(0,Math.round(discountMinor)) : Number.isFinite(discountCurrency) ? Math.max(0,Math.round(discountCurrency*100)) : 0),
    priority: getCsvValue(row, ['priority','الأولوية']) || 'normal',
    notes: getCsvValue(row, ['notes','ملاحظات']),
    item_sku: getCsvValue(row, ['item_sku','sku']),
    item_name: getCsvValue(row, ['item_name','item','المنتج']),
    quantity: String(Math.max(1, Math.round(numberValue(row, ['quantity','الكمية']) || 1))),
    unit_price_minor: String(Number.isFinite(directMinor) ? Math.max(0,Math.round(directMinor)) : Math.max(0,Math.round(currencyPrice*100))),
    weight_grams: getCsvValue(row, ['weight_grams','الوزن بالجرام']),
  } satisfies Record<(typeof canonicalHeaders)[number], string>;
}

function csvCell(value: string) { return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value; }

export function buildServerImportFile(preview: CsvPreview) {
  const rows = preview.rows.filter((row) => row.errors.length === 0 && !row.duplicate).map((row) => normalizedRow(row.data));
  const lines = [canonicalHeaders.join(','), ...rows.map((row) => canonicalHeaders.map((header) => csvCell(row[header] ?? '')).join(','))];
  const fileName = preview.fileName.replace(/\.csv$/i, '') + '-normalized.csv';
  return new File([`\uFEFF${lines.join('\r\n')}`], fileName, { type: 'text/csv' });
}

export const serverImportColumnMapping = Object.fromEntries(canonicalHeaders.map((header) => [header, header]));
