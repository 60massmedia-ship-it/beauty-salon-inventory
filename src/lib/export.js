export function csvEscape(value) {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

export function buildCsv(rows) {
  return rows.map((row) => row.map(csvEscape).join(',')).join(String.fromCharCode(10));
}

export function downloadBlob(filename, body, type) {
  const blob = new Blob([body], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function exportJson(filename, data) {
  downloadBlob(filename, JSON.stringify(data, null, 2), 'application/json');
}

export function exportCsv(filename, rows) {
  downloadBlob(filename, '\uFEFF' + buildCsv(rows), 'text/csv;charset=utf-8;');
}
