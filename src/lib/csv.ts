/**
 * Quotes a single field. Anything containing a comma, a quote or a newline has to
 * be wrapped, and embedded quotes doubled — otherwise one customer called
 * "Smith, Jones & Co" silently shifts every later column in the row.
 */
function cell(value: unknown): string {
  if (value === null || value === undefined) return "";

  const text = value instanceof Date ? value.toISOString().slice(0, 10) : String(value);

  // A leading =, +, - or @ is treated as a formula by Excel and Sheets, which is
  // a well-known way to smuggle something nasty into a spreadsheet. Prefix it so
  // it is read as text.
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;

  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(cell).join(","), ...rows.map((row) => row.map(cell).join(","))];
  // CRLF and a BOM: without them Excel mangles accented characters and treats the
  // whole file as one line on some Windows setups.
  return `﻿${lines.join("\r\n")}\r\n`;
}

export function csvFilename(prefix: string, now = new Date()) {
  return `${prefix}-${now.toISOString().slice(0, 10)}.csv`;
}
