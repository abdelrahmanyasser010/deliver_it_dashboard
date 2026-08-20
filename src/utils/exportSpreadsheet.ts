type ExportValue = string | number | boolean | Date | null | undefined;

export interface ExportColumn<T> {
  key: keyof T | string;
  header: string;
  getValue?: (row: T) => ExportValue;
  width?: number;
}

export interface XlsxExportOptions<T extends object> {
  filename: string;
  rows: T[];
  sheetName?: string;
  columns?: ExportColumn<T>[];
  rtl?: boolean;
}

export function downloadXlsx<T extends object>({ filename, rows, sheetName = 'البيانات', columns, rtl = true }: XlsxExportOptions<T>) {
  if (!rows.length) return;
  const normalizedRows = rows as Array<Record<string, ExportValue>>;
  const resolvedColumns: ExportColumn<T>[] = columns?.length
    ? columns
    : Object.keys(normalizedRows[0]).map((key) => ({ key, header: key }));

  const sheetXml = buildSheetXml(rows, resolvedColumns, rtl);
  const safeSheetName = sanitizeSheetName(sheetName);
  const files: Array<{ name: string; data: Uint8Array }> = [
    { name: '[Content_Types].xml', data: utf8(contentTypesXml()) },
    { name: '_rels/.rels', data: utf8(rootRelsXml()) },
    { name: 'xl/workbook.xml', data: utf8(workbookXml(safeSheetName)) },
    { name: 'xl/_rels/workbook.xml.rels', data: utf8(workbookRelsXml()) },
    { name: 'xl/styles.xml', data: utf8(stylesXml()) },
    { name: 'xl/worksheets/sheet1.xml', data: utf8(sheetXml) },
  ];

  const blob = new Blob([createZip(files)], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  triggerDownload(blob, ensureExtension(filename, '.xlsx'));
}

export function downloadCsv<T extends object>(filename: string, rows: T[], delimiter = ',') {
  if (!rows.length) return;
  const normalizedRows = rows as Array<Record<string, ExportValue>>;
  const headers = Object.keys(normalizedRows[0]);
  const csv = [
    headers.map((header) => escapeCsvCell(header, delimiter)).join(delimiter),
    ...normalizedRows.map((row) => headers.map((header) => escapeCsvCell(row[header], delimiter)).join(delimiter)),
  ].join('\r\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, ensureExtension(filename, '.csv'));
}

function buildSheetXml<T extends object>(rows: T[], columns: ExportColumn<T>[], rtl: boolean) {
  const normalizedRows = rows as Array<Record<string, ExportValue>>;
  const widths = columns.map((column) => {
    const values = normalizedRows.map((row) => String(column.getValue ? column.getValue(row as T) ?? '' : row[String(column.key)] ?? ''));
    const computed = Math.min(55, Math.max(12, column.header.length + 3, ...values.slice(0, 250).map((value) => Math.min(50, value.length + 2))));
    return column.width ?? computed;
  });

  const header = `<row r="1" ht="24" customHeight="1">${columns.map((column, index) => inlineStringCell(cellRef(index, 1), column.header, 1)).join('')}</row>`;
  const body = rows.map((row, rowIndex) => {
    const record = row as Record<string, ExportValue>;
    const cells = columns.map((column, columnIndex) => {
      const value = column.getValue ? column.getValue(row) : record[String(column.key)];
      return valueCell(cellRef(columnIndex, rowIndex + 2), value);
    }).join('');
    return `<row r="${rowIndex + 2}">${cells}</row>`;
  }).join('');

  const lastCell = `${columnName(Math.max(0, columns.length - 1))}${rows.length + 1}`;
  const cols = widths.map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetViews><sheetView workbookViewId="0" rightToLeft="${rtl ? '1' : '0'}"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
  <sheetFormatPr defaultRowHeight="20"/>
  <cols>${cols}</cols>
  <sheetData>${header}${body}</sheetData>
  <autoFilter ref="A1:${lastCell}"/>
</worksheet>`;
}

function valueCell(ref: string, value: ExportValue) {
  if (value === null || value === undefined || value === '') return `<c r="${ref}"/>`;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `<c r="${ref}" s="2" t="n"><v>${excelSerial(value)}</v></c>`;
  }
  if (typeof value === 'number' && Number.isFinite(value)) return `<c r="${ref}" s="3" t="n"><v>${value}</v></c>`;
  if (typeof value === 'boolean') return `<c r="${ref}" t="b"><v>${value ? 1 : 0}</v></c>`;
  return inlineStringCell(ref, String(value), 0);
}

function inlineStringCell(ref: string, value: string, style: number) {
  const preserve = /^\s|\s$|\n/.test(value) ? ' xml:space="preserve"' : '';
  return `<c r="${ref}" s="${style}" t="inlineStr"><is><t${preserve}>${xmlEscape(value)}</t></is></c>`;
}

function excelSerial(date: Date) {
  return (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds()) / 86400000) + 25569;
}

function contentTypesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;
}
function rootRelsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;
}
function workbookXml(sheetName: string) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <bookViews><workbookView/></bookViews>
  <sheets><sheet name="${xmlEscape(sheetName)}" sheetId="1" r:id="rId1"/></sheets>
</workbook>`;
}
function workbookRelsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;
}
function stylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2">
    <font><sz val="11"/><name val="Arial"/></font>
    <font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Arial"/></font>
  </fonts>
  <fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1E293B"/><bgColor indexed="64"/></patternFill></fill></fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="4">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFill="1" applyFont="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="14" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="4" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
  </cellXfs>
</styleSheet>`;
}

function createZip(files: Array<{ name: string; data: Uint8Array }>) {
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;
  const now = new Date();
  const dos = dosDateTime(now);

  for (const file of files) {
    const name = utf8(file.name);
    const crc = crc32(file.data);
    const local = concatBytes(
      u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(dos.time), u16(dos.date),
      u32(crc), u32(file.data.length), u32(file.data.length), u16(name.length), u16(0), name, file.data,
    );
    localParts.push(local);
    const central = concatBytes(
      u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(dos.time), u16(dos.date),
      u32(crc), u32(file.data.length), u32(file.data.length), u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), name,
    );
    centralParts.push(central);
    offset += local.length;
  }

  const centralDirectory = concatBytes(...centralParts);
  const end = concatBytes(
    u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length),
    u32(centralDirectory.length), u32(offset), u16(0),
  );
  return concatBytes(...localParts, centralDirectory, end);
}

function crc32(data: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date: Date) {
  const year = Math.max(1980, date.getFullYear());
  return {
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
  };
}

function columnName(index: number) {
  let value = index + 1;
  let result = '';
  while (value > 0) { value -= 1; result = String.fromCharCode(65 + (value % 26)) + result; value = Math.floor(value / 26); }
  return result;
}
function cellRef(columnIndex: number, row: number) { return `${columnName(columnIndex)}${row}`; }
function xmlEscape(value: string) { return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;'); }
function sanitizeSheetName(value: string) { return (value || 'البيانات').replace(/[\\/?*\[\]:]/g, '-').slice(0, 31); }
function ensureExtension(filename: string, extension: string) { const base = filename.replace(/\.(csv|xlsx?)$/i, ''); return `${base}${extension}`; }
function escapeCsvCell(value: ExportValue, delimiter: string) { const text = value instanceof Date ? value.toISOString() : String(value ?? ''); const escaped = text.replace(/"/g, '""'); return new RegExp(`["\\r\\n${delimiter === '|' ? '\\|' : delimiter}]`).test(text) ? `"${escaped}"` : text; }
function utf8(value: string) { return new TextEncoder().encode(value); }
function u16(value: number) { const data = new Uint8Array(2); new DataView(data.buffer).setUint16(0, value, true); return data; }
function u32(value: number) { const data = new Uint8Array(4); new DataView(data.buffer).setUint32(0, value >>> 0, true); return data; }
function concatBytes(...arrays: Uint8Array[]) { const length = arrays.reduce((sum, item) => sum + item.length, 0); const result = new Uint8Array(length); let offset = 0; for (const item of arrays) { result.set(item, offset); offset += item.length; } return result; }
function triggerDownload(blob: Blob, filename: string) { const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 0); }
