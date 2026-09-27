const inrFmt = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

export function formatINR(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '₹0';
  return inrFmt.format(n);
}

export function cn(...parts) {
  return parts.filter(Boolean).join(' ');
}

export function todayISO() {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

export function timeNow() {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function displayDate(iso) {
  if (!iso) return '—';
  return iso;
}