export function formatCLP(amount: number): string {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(amount);
}

export function formatCurrency(amount: number, currency = 'CLP'): string {
  if (currency === 'CLP') return formatCLP(amount);
  if (currency === 'USD') return `US$ ${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)}`;
  if (currency === 'EUR') return `€ ${new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2 }).format(amount)}`;
  return `${currency} ${amount.toLocaleString()}`;
}

export function formatDate(date: string): string {
  return new Date(date + 'T12:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatShortDate(date: string): string {
  return new Date(date + 'T12:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function monthStartISO(): string {
  return new Date().toISOString().slice(0, 7) + '-01';
}
