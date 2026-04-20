// ============================================================================
// Budget aggregations — single source of truth for the unified Budget page.
// Maps the real Supabase model (expense_items, payments, vendors, contributors)
// to the shape the design prototype expects.
// ============================================================================

import { calculateExpenseAmount, type ExpenseItem as CalcExpenseItem, type ExpenseLineItem, type GuestCounts } from './expenseCalculations';

export interface DbVendor {
  id: string;
  name: string;
  category_id: string | null;
  expense_categories?: { id: string; name: string } | null;
}

export interface DbExpenseItem extends CalcExpenseItem {
  description: string;
  vendor_id: string | null;
  category_id: string | null;
  vendors?: { name: string; expense_categories?: { id: string; name: string } | null } | null;
  expense_categories?: { id: string; name: string } | null;
}

export interface DbPayment {
  id: string;
  expense_item_id: string;
  description: string;
  amount: number;
  due_date: string;
  status: string;            // 'Pagato' | 'Da Pagare' | etc.
  paid_on_date: string | null;
}

export interface DbContributor {
  id: string;
  name: string;
  contribution_target: number | null;
}

// ─── UI shapes (mirror prototype) ──────────────────────────────────────────

export interface UiVendor {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  categoryTone: string;
  total: number;          // committed (sum of expense_item totals)
  paid: number;           // sum of paid payments for this vendor
  items: { id: string; desc: string; total: number; paid: number }[];
  payments: UiPayment[];
}

export interface UiPayment {
  id: string;
  vendorId: string;
  vendorName: string;
  categoryId: string;
  desc: string;
  amount: number;
  due: string;            // ISO date
  status: 'paid' | 'due';
}

export interface UiTotals {
  budget: number;
  committed: number;
  paid: number;
  remaining: number;      // budget - committed
  toPay: number;          // committed - paid
}

export interface UiContributor {
  id: string;
  name: string;
  target: number;
  paid: number;
  color: string;
}

// Deterministic palette for categories (paper tokens approximated to hex
// because the design uses sharp accents that map cleanly to specific hues).
const CATEGORY_PALETTE = [
  '#8B5CF6', '#B08A3E', '#1D4ED8', '#15803D', '#B45309',
  '#B91C1C', '#6D3FE0', '#BE185D', '#0F766E', '#6B7280', '#8A8071',
];

export function categoryToneFor(idOrName: string): string {
  let h = 0;
  for (let i = 0; i < idOrName.length; i++) h = (h * 31 + idOrName.charCodeAt(i)) >>> 0;
  return CATEGORY_PALETTE[h % CATEGORY_PALETTE.length];
}

export function buildVendors(
  vendors: DbVendor[],
  items: DbExpenseItem[],
  payments: DbPayment[],
  lineItemsMap: Record<string, ExpenseLineItem[]>,
  mode: 'planned' | 'expected' | 'confirmed',
  guestCounts: GuestCounts | null,
): UiVendor[] {
  const itemsByVendor = new Map<string, DbExpenseItem[]>();
  const itemsWithoutVendor: DbExpenseItem[] = [];
  for (const it of items) {
    if (it.vendor_id) {
      const arr = itemsByVendor.get(it.vendor_id) ?? [];
      arr.push(it);
      itemsByVendor.set(it.vendor_id, arr);
    } else {
      itemsWithoutVendor.push(it);
    }
  }

  const paymentsByItem = new Map<string, DbPayment[]>();
  for (const p of payments) {
    const arr = paymentsByItem.get(p.expense_item_id) ?? [];
    arr.push(p);
    paymentsByItem.set(p.expense_item_id, arr);
  }

  const safeGuestCounts: GuestCounts = guestCounts ?? {
    planned: { adults: 0, children: 0, staff: 0 },
    expected: { adults: 0, children: 0, staff: 0 },
    confirmed: { adults: 0, children: 0, staff: 0 },
  };

  const computeTotals = (vendorItems: DbExpenseItem[]) => {
    let total = 0, paid = 0;
    const uiItems: UiVendor['items'] = [];
    const uiPayments: UiPayment[] = [];

    for (const it of vendorItems) {
      const lines = lineItemsMap[it.id] ?? [];
      const itemTotal = calculateExpenseAmount(it, lines, mode, safeGuestCounts);
      const linkedPayments = paymentsByItem.get(it.id) ?? [];
      const itemPaid = linkedPayments
        .filter(p => p.status === 'Pagato')
        .reduce((s, p) => s + Number(p.amount || 0), 0);
      total += itemTotal;
      paid += itemPaid;
      uiItems.push({ id: it.id, desc: it.description, total: itemTotal, paid: itemPaid });

      for (const p of linkedPayments) {
        uiPayments.push({
          id: p.id,
          vendorId: it.vendor_id ?? '',
          vendorName: '',
          categoryId: it.category_id ?? it.vendors?.expense_categories?.id ?? 'uncategorized',
          desc: p.description,
          amount: Number(p.amount || 0),
          due: p.due_date,
          status: p.status === 'Pagato' ? 'paid' : 'due',
        });
      }
    }
    return { total, paid, uiItems, uiPayments };
  };

  const result: UiVendor[] = [];

  for (const v of vendors) {
    const vendorItems = itemsByVendor.get(v.id) ?? [];
    if (vendorItems.length === 0) continue;
    const cat = v.expense_categories ?? vendorItems[0]?.expense_categories ?? null;
    const categoryId = cat?.id ?? v.category_id ?? 'uncategorized';
    const categoryName = cat?.name ?? 'Senza categoria';
    const { total, paid, uiItems, uiPayments } = computeTotals(vendorItems);
    uiPayments.forEach(p => { p.vendorId = v.id; p.vendorName = v.name; });
    result.push({
      id: v.id, name: v.name, categoryId, categoryName,
      categoryTone: categoryToneFor(categoryId + categoryName),
      total, paid, items: uiItems, payments: uiPayments,
    });
  }

  // Items without a vendor → group as a synthetic "Spese varie" entry per category
  if (itemsWithoutVendor.length) {
    const byCat = new Map<string, DbExpenseItem[]>();
    for (const it of itemsWithoutVendor) {
      const key = it.category_id ?? it.expense_categories?.id ?? 'uncategorized';
      const arr = byCat.get(key) ?? [];
      arr.push(it);
      byCat.set(key, arr);
    }
    for (const [catId, list] of byCat) {
      const cat = list[0]?.expense_categories;
      const categoryName = cat?.name ?? 'Senza categoria';
      const { total, paid, uiItems, uiPayments } = computeTotals(list);
      const synthId = `__cat__${catId}`;
      uiPayments.forEach(p => { p.vendorId = synthId; p.vendorName = `Spese ${categoryName}`; });
      result.push({
        id: synthId,
        name: `Spese ${categoryName}`,
        categoryId: catId, categoryName,
        categoryTone: categoryToneFor(catId + categoryName),
        total, paid, items: uiItems, payments: uiPayments,
      });
    }
  }

  return result;
}

export function buildTotals(budget: number, vendors: UiVendor[]): UiTotals {
  let committed = 0, paid = 0;
  for (const v of vendors) { committed += v.total; paid += v.paid; }
  return {
    budget,
    committed,
    paid,
    remaining: Math.max(0, budget - committed),
    toPay: Math.max(0, committed - paid),
  };
}

export function byCategory(vendors: UiVendor[]) {
  const map = new Map<string, { id: string; label: string; tone: string; committed: number; paid: number }>();
  for (const v of vendors) {
    const cur = map.get(v.categoryId) ?? { id: v.categoryId, label: v.categoryName, tone: v.categoryTone, committed: 0, paid: 0 };
    cur.committed += v.total;
    cur.paid += v.paid;
    map.set(v.categoryId, cur);
  }
  return [...map.values()].filter(c => c.committed > 0).sort((a, b) => b.committed - a.committed);
}

export function allPayments(vendors: UiVendor[]): UiPayment[] {
  return vendors.flatMap(v => v.payments);
}

export function upcomingPayments(vendors: UiVendor[]): UiPayment[] {
  return allPayments(vendors)
    .filter(p => p.status === 'due')
    .sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime());
}

export function nextPayment(vendors: UiVendor[], today = new Date()): UiPayment | null {
  const t = today.getTime();
  return upcomingPayments(vendors).find(p => new Date(p.due).getTime() >= t) ?? null;
}

export function buildContributors(rows: DbContributor[], paymentsAll: UiPayment[]): UiContributor[] {
  // We can't split per-contributor without payment_allocations; show targets and
  // even-split paid amount as a sensible default. Real split is computed elsewhere.
  const totalPaid = paymentsAll.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const palette = ['#8B5CF6', '#B08A3E', '#1D4ED8', '#15803D', '#BE185D'];
  const validRows = rows.filter(r => (r.contribution_target ?? 0) > 0 || rows.length <= 4);
  const totalTarget = validRows.reduce((s, r) => s + Number(r.contribution_target || 0), 0);
  return validRows.map((r, i) => {
    const target = Number(r.contribution_target || 0);
    const share = totalTarget > 0 ? target / totalTarget : 1 / Math.max(1, validRows.length);
    return {
      id: r.id,
      name: r.name,
      target,
      paid: Math.round(totalPaid * share),
      color: palette[i % palette.length],
    };
  });
}

export function daysFromToday(iso: string, today = new Date()): number {
  const a = new Date(iso); a.setHours(0, 0, 0, 0);
  const b = new Date(today); b.setHours(0, 0, 0, 0);
  return Math.round((a.getTime() - b.getTime()) / 86400000);
}

export const fmt = (n: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n || 0);

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });

export function paymentsByMonth(upcoming: UiPayment[]) {
  const buckets: Record<string, { key: string; label: string; amount: number; count: number }> = {};
  for (const p of upcoming) {
    const dt = new Date(p.due);
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
    const label = dt.toLocaleDateString('it-IT', { month: 'short', year: '2-digit' });
    buckets[key] ??= { key, label, amount: 0, count: 0 };
    buckets[key].amount += p.amount;
    buckets[key].count += 1;
  }
  return Object.values(buckets).sort((a, b) => a.key.localeCompare(b.key));
}
