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
export type ExpenseKind = 'fixed' | 'per_person' | 'per_unit';
export const EXPENSE_KINDS: { id: ExpenseKind; label: string; desc: string; icon: string }[] = [
  { id: 'fixed',      label: 'Importo fisso',  desc: 'Costo definito, non dipende dal numero di invitati',      icon: 'tag' },
  { id: 'per_person', label: 'A persona',      desc: 'Prezzo × numero invitati (previsti / confermati)',        icon: 'users' },
  { id: 'per_unit',   label: 'A quantità',     desc: 'Prezzo × unità (bomboniere, centrotavola, camere…)',     icon: 'grid' },
];

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
}
export function generateSchedule(
  scheme: 'acconto50' | 'thirds' | 'single',
  total: number,
  weddingDate: string | null,
): SchedulePayment[] {
  const today = new Date(); today.setHours(0,0,0,0);
  const plus7 = new Date(today); plus7.setDate(plus7.getDate() + 7);
  const wed = weddingDate ? new Date(weddingDate) : new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());
  const before30 = new Date(wed); before30.setDate(before30.getDate() - 30);

  const iso = (d: Date) => d.toISOString().slice(0, 10);

  if (scheme === 'acconto50') {
    return [
      { description: 'Acconto 50%', amount: Math.round(total * 0.5), due_date: iso(plus7) },
      { description: 'Saldo',       amount: total - Math.round(total * 0.5), due_date: iso(before30) },
    ];
  }
  if (scheme === 'thirds') {
    const third = Math.round(total / 3);
    return [
      { description: 'Acconto',      amount: third,            due_date: iso(plus7) },
      { description: 'Seconda rata', amount: third,            due_date: iso(before30) },
      { description: 'Saldo',        amount: total - 2 * third, due_date: iso(wed) },
    ];
  }
  return [{ description: 'Pagamento unico', amount: total, due_date: iso(wed) }];
}
