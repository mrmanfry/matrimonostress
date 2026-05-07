// Vendor data aggregation utilities for the new "Paper" Vendors v2 UI.
// Reads from the real Supabase model (vendors + expense_items + expense_line_items + payments)
// and returns view-friendly shapes.

export type VendorStatusId = 'evaluating' | 'booked' | 'confirmed' | 'rejected';

export const VENDOR_STATUSES: {
  id: VendorStatusId;
  label: string;
  tone: 'info' | 'warn' | 'success' | 'neutral';
  dot: string;
  desc: string;
}[] = [
  { id: 'evaluating', label: 'In valutazione', tone: 'info',    dot: '#1D4ED8', desc: 'Stiamo raccogliendo preventivi' },
  { id: 'booked',     label: 'Opzionato',      tone: 'warn',    dot: '#B45309', desc: 'Preventivo ricevuto, in attesa di conferma' },
  { id: 'confirmed',  label: 'Confermato',     tone: 'success', dot: '#15803D', desc: 'Contratto firmato, acconto versato' },
  { id: 'rejected',   label: 'Rifiutato',      tone: 'neutral', dot: '#8A8071', desc: 'Non procederemo con questo fornitore' },
];

// Map legacy DB statuses to the 4 canonical buckets.
const STATUS_ALIASES: Record<string, VendorStatusId> = {
  evaluating: 'evaluating',
  contacted: 'evaluating',
  quotation_received: 'booked',
  booked: 'booked',
  confirmed: 'confirmed',
  rejected: 'rejected',
};
export function normalizeStatus(s: string | null | undefined): VendorStatusId {
  if (!s) return 'evaluating';
  return STATUS_ALIASES[s] ?? 'evaluating';
}
export function statusById(id: string) {
  return VENDOR_STATUSES.find(s => s.id === normalizeStatus(id)) || VENDOR_STATUSES[0];
}

// ─── Expense kinds (wizard) ───
export type ExpenseKind = 'fixed' | 'per_person' | 'per_audience' | 'per_unit';
export const EXPENSE_KINDS: { id: ExpenseKind; label: string; desc: string; icon: string }[] = [
  { id: 'fixed',        label: 'Importo fisso',     desc: 'Costo definito, non dipende dal numero di invitati',           icon: 'tag' },
  { id: 'per_person',   label: 'A persona (unico)', desc: 'Stesso prezzo per ogni invitato',                              icon: 'users' },
  { id: 'per_audience', label: 'Per fascia',        desc: 'Prezzi distinti per Adulti, Bambini e Staff (con IVA per riga)', icon: 'users' },
  { id: 'per_unit',     label: 'A quantità',        desc: 'Prezzo × unità (bomboniere, centrotavola, camere…)',          icon: 'grid' },
];

// ─── Per-audience pricing (per_audience kind) ───
export interface AudiencePricing {
  enabled: boolean;
  unit_price: number;
  tax_rate: number;          // %
  tax_inclusive: boolean;    // if true → unit_price contains VAT already
}
export interface AudienceMap {
  adults: AudiencePricing;
  children: AudiencePricing;
  staff: AudiencePricing;
}
export function emptyAudienceMap(): AudienceMap {
  return {
    adults:   { enabled: true,  unit_price: 0, tax_rate: 22, tax_inclusive: true },
    children: { enabled: false, unit_price: 0, tax_rate: 22, tax_inclusive: true },
    staff:    { enabled: false, unit_price: 0, tax_rate: 22, tax_inclusive: true },
  };
}
export const AUDIENCE_LABELS: Record<keyof AudienceMap, string> = {
  adults: 'Adulti',
  children: 'Bambini',
  staff: 'Staff',
};
export const AUDIENCE_QTY_TYPE: Record<keyof AudienceMap, 'adults' | 'children' | 'staff'> = {
  adults: 'adults',
  children: 'children',
  staff: 'staff',
};
export function audienceTotal(map: AudienceMap, counts: { adults: number; children: number; staff: number }): number {
  let total = 0;
  (Object.keys(map) as (keyof AudienceMap)[]).forEach(k => {
    const row = map[k];
    if (!row.enabled || row.unit_price <= 0) return;
    const qty = counts[k] || 0;
    const unit = row.tax_inclusive ? row.unit_price : row.unit_price * (1 + (row.tax_rate || 0) / 100);
    total += unit * qty;
  });
  return total;
}

// ─── Types ───
export interface DbPayment {
  id: string;
  expense_item_id: string;
  description: string;
  amount: number;
  status: string;       // 'Da Pagare' | 'Pagato' | 'paid' | 'due'
  due_date: string;     // ISO date
  paid_on_date: string | null;
}
export interface DbLineItem {
  id: string;
  expense_item_id: string;
  description: string;
  unit_price: number;
  quantity_type: string;  // 'fixed' | 'per_adult' | 'per_child' | etc.
  quantity_fixed: number | null;
  tax_rate: number | null;
  price_is_tax_inclusive: boolean;
  discount_percentage: number | null;
}
export interface DbExpenseItem {
  id: string;
  wedding_id: string;
  vendor_id: string | null;
  description: string;
  estimated_amount: number | null;
  fixed_amount: number | null;
  total_amount: number | null;
  expense_type: string | null;     // 'fixed' | 'variable' | etc.
  planned_adults: number | null;
  planned_children: number | null;
  tax_rate: number | null;
  amount_is_tax_inclusive: boolean | null;
}

// ─── Money helpers ───
export const fmtEUR = (n: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n || 0);

export const fmtDateShort = (iso: string) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
};
export const fmtDate = (iso: string) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });
};
export const daysFromToday = (iso: string) => {
  if (!iso) return 0;
  const d = new Date(iso); d.setHours(0,0,0,0);
  const today = new Date(); today.setHours(0,0,0,0);
  return Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

// Compute total committed for an expense item (uses total_amount or estimated_amount as fallback).
export function expenseItemTotal(it: DbExpenseItem, lineItems: DbLineItem[] = []): number {
  // Prefer line items if any (sum)
  if (lineItems.length > 0) {
    return lineItems.reduce((s, li) => {
      const qty = li.quantity_fixed || 1;
      const gross = li.unit_price * qty;
      const discount = li.discount_percentage ? gross * (li.discount_percentage / 100) : 0;
      return s + (gross - discount);
    }, 0);
  }
  return Number(it.total_amount ?? it.fixed_amount ?? it.estimated_amount ?? 0);
}

export interface VendorTotals {
  committed: number;
  paid: number;
  remaining: number;
  pct: number;
  hasVariable: boolean;
}
export function vendorTotals(
  expenseItems: DbExpenseItem[],
  lineItemsByExpenseItem: Record<string, DbLineItem[]>,
  payments: DbPayment[],
): VendorTotals {
  const committed = expenseItems.reduce(
    (s, it) => s + expenseItemTotal(it, lineItemsByExpenseItem[it.id] || []), 0
  );
  const paid = payments
    .filter(p => isPaymentPaid(p.status))
    .reduce((s, p) => s + Number(p.amount), 0);
  const hasVariable = expenseItems.some(it => (it.expense_type ?? '').toLowerCase() === 'variable');
  return {
    committed,
    paid,
    remaining: Math.max(0, committed - paid),
    pct: committed > 0 ? Math.min(100, (paid / committed) * 100) : 0,
    hasVariable,
  };
}

export function isPaymentPaid(status: string | null | undefined): boolean {
  if (!status) return false;
  const s = status.toLowerCase();
  return s === 'pagato' || s === 'paid';
}

export function nextPayment(payments: DbPayment[]): DbPayment | null {
  return [...payments]
    .filter(p => !isPaymentPaid(p.status))
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())[0] || null;
}

export function countsByStatus(vendors: { status: string }[]): Record<VendorStatusId, number> {
  const out: Record<VendorStatusId, number> = { evaluating: 0, booked: 0, confirmed: 0, rejected: 0 };
  vendors.forEach(v => {
    const s = normalizeStatus(v.status);
    out[s] = (out[s] || 0) + 1;
  });
  return out;
}

// ─── Payment schedule generators (used by wizard) ───
export interface SchedulePayment {
  description: string;
  amount: number;
  due_date: string; // ISO
  is_balance?: boolean; // true → calcolato come saldo (totale - somma altre rate)
}

export type ScheduleScheme = 'single' | 'acconto_custom' | 'equal_n' | 'custom';

export interface ScheduleOptions {
  acconto_pct?: number;   // per 'acconto_custom' (default 50)
  n_rate?: number;        // per 'equal_n' (default 3)
}

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

function distributeDates(count: number, weddingDate: string | null): string[] {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const start = new Date(today); start.setDate(start.getDate() + 7);
  const wed = weddingDate ? new Date(weddingDate) : new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());
  const before30 = new Date(wed); before30.setDate(before30.getDate() - 30);
  if (count <= 1) return [isoDate(before30)];
  const span = Math.max(1, before30.getTime() - start.getTime());
  const step = span / (count - 1);
  return Array.from({ length: count }, (_, i) => isoDate(new Date(start.getTime() + step * i)));
}

export function generateSchedule(
  scheme: ScheduleScheme | 'acconto50' | 'thirds',
  total: number,
  weddingDate: string | null,
  opts: ScheduleOptions = {},
): SchedulePayment[] {
  // Backward compat
  if (scheme === 'acconto50') { scheme = 'acconto_custom'; opts = { ...opts, acconto_pct: 50 }; }
  if (scheme === 'thirds')    { scheme = 'equal_n'; opts = { ...opts, n_rate: 3 }; }

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const plus7 = new Date(today); plus7.setDate(plus7.getDate() + 7);
  const wed = weddingDate ? new Date(weddingDate) : new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());
  const before30 = new Date(wed); before30.setDate(before30.getDate() - 30);

  if (scheme === 'single') {
    return [{ description: 'Pagamento unico', amount: total, due_date: isoDate(wed) }];
  }
  if (scheme === 'acconto_custom') {
    const pct = Math.min(99, Math.max(1, opts.acconto_pct ?? 50));
    const acconto = Math.round((total * pct) / 100);
    return [
      { description: `Acconto ${pct}%`, amount: acconto, due_date: isoDate(plus7) },
      { description: 'Saldo', amount: total - acconto, due_date: isoDate(before30), is_balance: true },
    ];
  }
  if (scheme === 'equal_n') {
    const n = Math.max(2, Math.min(12, opts.n_rate ?? 3));
    const dates = distributeDates(n, weddingDate);
    const base = Math.floor(total / n);
    const out: SchedulePayment[] = [];
    let acc = 0;
    for (let i = 0; i < n - 1; i++) {
      out.push({ description: `Rata ${i + 1} di ${n}`, amount: base, due_date: dates[i] });
      acc += base;
    }
    out.push({ description: `Saldo (rata ${n} di ${n})`, amount: total - acc, due_date: dates[n - 1], is_balance: true });
    return out;
  }
  // 'custom' → start with acconto + saldo, the user edits
  return [
    { description: 'Acconto', amount: Math.round(total * 0.3), due_date: isoDate(plus7) },
    { description: 'Saldo', amount: total - Math.round(total * 0.3), due_date: isoDate(before30), is_balance: true },
  ];
}

// Ricalcola il saldo dopo modifiche manuali alle altre rate.
export function rebalanceSchedule(payments: SchedulePayment[], total: number): SchedulePayment[] {
  const balanceIdx = payments.findIndex(p => p.is_balance);
  if (balanceIdx < 0) return payments;
  const others = payments.reduce((s, p, i) => i === balanceIdx ? s : s + (Number(p.amount) || 0), 0);
  const next = [...payments];
  next[balanceIdx] = { ...next[balanceIdx], amount: Math.max(0, total - others) };
  return next;
}

