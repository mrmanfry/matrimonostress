// Unified Budget + Treasury page — implements Budget.html design with real data.
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

import { BudgetHero } from '@/components/budget/v2/BudgetHero';
import { NextPaymentCallout } from '@/components/budget/v2/NextPaymentCallout';
import { AllocationCard, FundsCard } from '@/components/budget/v2/AllocationAndFunds';
import { CashflowTimeline } from '@/components/budget/v2/CashflowTimeline';
import { ExpensesTable, type FilterKey } from '@/components/budget/v2/ExpensesTable';
import { VendorDrawer } from '@/components/budget/v2/VendorDrawer';
import { PaymentAllocationDialog } from '@/components/budget/v2/PaymentAllocationDialog';

import {
  buildVendors, buildTotals, buildContributors, upcomingPayments, nextPayment, allPayments,
  type DbVendor, type DbExpenseItem, type DbPayment, type DbContributor, type DbAllocation, type UiPayment,
} from '@/lib/budgetAggregates';
import type { ExpenseLineItem, GuestCounts } from '@/lib/expenseCalculations';
import { isConfirmed, isPending, isDeclined } from '@/lib/rsvpHelpers';

export default function Budget() {
  const { authState } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [budget, setBudget] = useState(0);
  const [partner1, setPartner1] = useState('');
  const [partner2, setPartner2] = useState('');
  const [vendors, setVendors] = useState<DbVendor[]>([]);
  const [items, setItems] = useState<DbExpenseItem[]>([]);
  const [payments, setPayments] = useState<DbPayment[]>([]);
  const [contributors, setContributors] = useState<DbContributor[]>([]);
  const [allocations, setAllocations] = useState<DbAllocation[]>([]);
  const [lineItemsMap, setLineItemsMap] = useState<Record<string, ExpenseLineItem[]>>({});
  const [guestCounts, setGuestCounts] = useState<GuestCounts | null>(null);
  const [mode, setMode] = useState<'planned' | 'expected' | 'confirmed'>('planned');

  const [filter, setFilter] = useState<FilterKey>('all');
  const [openVendorId, setOpenVendorId] = useState<string | null>(null);
  const [allocPayment, setAllocPayment] = useState<UiPayment | null>(null);
  const [allocMode, setAllocMode] = useState<'mark' | 'edit'>('mark');

  const weddingId = authState.status === 'authenticated' ? authState.activeWeddingId : '';

  useEffect(() => {
    if (authState.status === 'authenticated' && weddingId) loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authState.status, weddingId]);

  async function loadAll() {
    if (!weddingId) return;
    setLoading(true);
    try {
      const [
        weddingRes,
        vendorsRes,
        itemsRes,
        contribRes,
        guestsRes,
      ] = await Promise.all([
        supabase.from('weddings').select('total_budget, calculation_mode, partner1_name, partner2_name').eq('id', weddingId).maybeSingle(),
        supabase.from('vendors').select('id, name, category_id, expense_categories(id, name)').eq('wedding_id', weddingId),
        supabase.from('expense_items').select('*, vendors(name, expense_categories(id, name)), expense_categories(id, name)').eq('wedding_id', weddingId),
        supabase.from('financial_contributors').select('id, name, contribution_target').eq('wedding_id', weddingId),
        supabase.from('guests').select('rsvp_status, adults_count, children_count, is_staff, is_couple_member, allow_plus_one, plus_one_name').eq('wedding_id', weddingId),
      ]);

      setBudget(Number(weddingRes.data?.total_budget || 0));
      setPartner1(weddingRes.data?.partner1_name || '');
      setPartner2(weddingRes.data?.partner2_name || '');
      setMode(((weddingRes.data?.calculation_mode as 'planned' | 'expected' | 'confirmed') ?? 'planned'));
      setVendors((vendorsRes.data ?? []) as unknown as DbVendor[]);
      const allItems = (itemsRes.data ?? []) as unknown as DbExpenseItem[];
      setItems(allItems);
      setContributors((contribRes.data ?? []) as unknown as DbContributor[]);

      // Line items for variable/mixed expenses
      const ids = allItems.map(i => i.id);
      if (ids.length > 0) {
        const { data: lines } = await supabase.from('expense_line_items').select('*').in('expense_item_id', ids);
        const map: Record<string, ExpenseLineItem[]> = {};
        for (const l of (lines ?? []) as unknown as Array<ExpenseLineItem & { expense_item_id: string }>) {
          (map[l.expense_item_id] ??= []).push(l);
        }
        setLineItemsMap(map);

        const { data: pays } = await supabase.from('payments').select('*').in('expense_item_id', ids);
        const paymentsData = (pays ?? []) as unknown as DbPayment[];
        setPayments(paymentsData);

        const paymentIds = paymentsData.map(p => p.id);
        if (paymentIds.length > 0) {
          const { data: allocs } = await supabase
            .from('payment_allocations')
            .select('contributor_id, payment_id, amount')
            .in('payment_id', paymentIds);
          setAllocations((allocs ?? []) as unknown as DbAllocation[]);
        } else {
          setAllocations([]);
        }
      } else {
        setLineItemsMap({});
        setPayments([]);
        setAllocations([]);
      }

      // Guest counts (for variable expense calculation)
      const guests = (guestsRes.data ?? []) as Array<{
        rsvp_status: string | null; adults_count: number | null; children_count: number | null;
        is_staff: boolean | null; is_couple_member: boolean | null; allow_plus_one: boolean | null; plus_one_name: string | null;
      }>;
      const tally = (filterFn: (g: typeof guests[number]) => boolean) => {
        let adults = 0, children = 0, staff = 0;
        for (const g of guests) {
          if (!filterFn(g)) continue;
          if (g.is_staff) { staff += g.adults_count || 1; continue; }
          adults += g.adults_count || 1;
          if (g.allow_plus_one && g.plus_one_name) adults += 1;
          children += g.children_count || 0;
        }
        return { adults, children, staff };
      };
      setGuestCounts({
        planned: tally(() => true),
        expected: tally(g => !isDeclined(g.rsvp_status)),
        confirmed: tally(g => isConfirmed(g.rsvp_status)),
      });
    } catch (err) {
      console.error('Budget load error', err);
      toast.error('Errore nel caricamento del budget');
    } finally {
      setLoading(false);
    }
  }

  const uiVendors = useMemo(
    () => buildVendors(vendors, items, payments, lineItemsMap, mode, guestCounts),
    [vendors, items, payments, lineItemsMap, mode, guestCounts]
  );
  const totals = useMemo(() => buildTotals(budget, uiVendors), [budget, uiVendors]);
  const upcoming = useMemo(() => upcomingPayments(uiVendors), [uiVendors]);
  const next = useMemo(() => nextPayment(uiVendors), [uiVendors]);
  const uiContributors = useMemo(
    () => buildContributors(contributors, allPayments(uiVendors), allocations),
    [contributors, uiVendors, allocations]
  );
  const openVendor = uiVendors.find(v => v.id === openVendorId) ?? null;

  function openMarkPaidDialog(payment: UiPayment) {
    setAllocPayment(payment);
    setAllocMode(payment.status === 'paid' ? 'edit' : 'mark');
  }

  const allocVendor = allocPayment ? uiVendors.find(v => v.id === allocPayment.vendorId) : null;
  const existingAllocations = allocPayment
    ? allocations
        .filter(a => a.payment_id === allocPayment.id)
        .map(a => ({ contributor_id: a.contributor_id, amount: Number(a.amount) }))
    : [];

  if (loading) {
    return (
      <div style={{ background: 'hsl(var(--paper-bg))', minHeight: '100vh', padding: 40 }}>
        <div style={{ maxWidth: 1320, margin: '0 auto', display: 'grid', gap: 16 }}>
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-24 w-full" />
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16 }}>
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'hsl(var(--paper-bg))' }}>
      <BudgetHero
        partner1={partner1}
        partner2={partner2}
        totals={totals}
        next={next}
        vendorCount={uiVendors.length}
      />

      <div style={{ maxWidth: 1320, margin: '0 auto', padding: '28px 40px 60px', display: 'grid', gap: 24 }}>
        {next && (
          <NextPaymentCallout
            next={next}
            vendor={uiVendors.find(v => v.id === next.vendorId)}
            onMarkPaid={() => markPaymentPaid(next)}
            onOpenVendor={() => setOpenVendorId(next.vendorId)}
          />
        )}

        <div className="budget-grid-row">
          <AllocationCard vendors={uiVendors} />
          <FundsCard contributors={uiContributors} />
        </div>

        <CashflowTimeline upcoming={upcoming} />

        <ExpensesTable
          vendors={uiVendors}
          filter={filter}
          setFilter={setFilter}
          onOpenVendor={setOpenVendorId}
          onMarkPaid={markPaymentPaid}
        />

        <div style={{ textAlign: 'center', color: 'hsl(var(--paper-ink-3))', fontSize: 12, paddingTop: 8 }}>
          Aggiornato al {new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}
        </div>
      </div>

      <VendorDrawer
        vendor={openVendor}
        onClose={() => setOpenVendorId(null)}
        onMarkPaid={markPaymentPaid}
        onOpenVendorPage={(id) => navigate(`/app/vendors/${id}`)}
      />

      <style>{`
        .budget-grid-row {
          display: grid;
          gap: 24px;
          grid-template-columns: 1.4fr 1fr;
        }
        @media (max-width: 900px) {
          .budget-grid-row { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
