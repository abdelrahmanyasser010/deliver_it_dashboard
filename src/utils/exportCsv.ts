type CsvValue = string | number | boolean | null | undefined;

export function downloadCsv<T extends object>(filename: string, rows: T[]) {
  if (rows.length === 0) return;

  const normalizedRows = rows as Array<Record<string, CsvValue>>;
  const headers = Object.keys(normalizedRows[0]);
  const csv = [
    headers.join(','),
    ...normalizedRows.map((row) => headers.map((header) => escapeCsvCell(row[header])).join(',')),
  ].join('\n');

  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function escapeCsvCell(value: CsvValue) {
  const text = String(value ?? '');
  if (!/[",\n]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}
