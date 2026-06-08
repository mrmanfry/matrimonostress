// src/pages/Gifts.tsx — RESTYLED to WedsApp "paper" design system
import { useEffect, useState, useMemo } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useGifts, useGiftForecast } from '@/hooks/useGifts';
import { GiftCoverageWidget } from '@/components/gifts/GiftCoverageWidget';
import { GiftSimulatorSlider } from '@/components/gifts/GiftSimulatorSlider';
import { GiftPartyList, type PartyRow } from '@/components/gifts/GiftPartyList';
import { ScenarioSelector, type ScenarioMode } from '@/components/budget/v2/ScenarioSelector';
import {
  buildVendors, buildTotals,
  type DbVendor, type DbExpenseItem, type DbPayment,
} from '@/lib/budgetAggregates';
import type { ExpenseLineItem, GuestCounts } from '@/lib/expenseCalculations';
import { isGuestConfirmed } from '@/lib/rsvpHelpers';

const PRIVACY_KEY = 'gifts_privacy_enabled';
const ESTIMATE_KEY = 'gifts_avg_estimate_per_person';

type GuestRow = {
  id: string;
  party_id: string | null;
  first_name: string | null;
  last_name: string | null;
  is_couple_member: boolean | null;
  is_staff: boolean | null;
  is_child: boolean | null;
  rsvp_status: string | null;
  allow_plus_one: boolean | null;
  plus_one_name: string | null;
  plus_one_of_guest_id: string | null;
};

const SCENARIO_LABEL: Record<ScenarioMode, string> = {
  planned: 'Pianificato',
  expected: 'Lista invitati',
  confirmed: 'Confermati',
};

export default function Gifts() {
  const { authState } = useAuth();
  const weddingId = authState.status === 'authenticated' ? authState.activeWeddingId : null;

  const [parties, setParties] = useState<PartyRow[]>([]);
  const [partiesLoading, setPartiesLoading] = useState(true);
  const [guests, setGuests] = useState<GuestRow[]>([]);

  // Budget-scenario data (mirrors what Budget page loads)
  const [budgetLoading, setBudgetLoading] = useState(true);
  const [vendors, setVendors] = useState<DbVendor[]>([]);
  const [items, setItems] = useState<DbExpenseItem[]>([]);
  const [payments, setPayments] = useState<DbPayment[]>([]);
  const [lineItemsMap, setLineItemsMap] = useState<Record<string, ExpenseLineItem[]>>({});
  const [guestCounts, setGuestCounts] = useState<GuestCounts | null>(null);
  const [scenario, setScenario] = useState<ScenarioMode>('planned');

  const [isPrivate, setIsPrivate] = useState(() => {
    try { return localStorage.getItem(PRIVACY_KEY) === 'true'; } catch { return false; }
  });
  const [avgEstimate, setAvgEstimate] = useState(() => {
    try {
      const v = localStorage.getItem(ESTIMATE_KEY);
      return v != null ? Number(v) : 100;
    } catch { return 100; }
  });

  const { data: gifts = [], isLoading: giftsLoading } = useGifts(weddingId);
  const { data: forecast, isLoading: forecastLoading } = useGiftForecast(weddingId, avgEstimate);

  useEffect(() => {
    if (!weddingId) return;
    setPartiesLoading(true);
    Promise.all([
      supabase.from('invite_parties').select('id, party_name, rsvp_status').eq('wedding_id', weddingId).order('party_name'),
      supabase.from('guests').select('id, party_id, first_name, last_name, is_couple_member, is_staff, is_child, rsvp_status, allow_plus_one, plus_one_name, plus_one_of_guest_id').eq('wedding_id', weddingId),
    ]).then(([pRes, gRes]) => {
      if (!pRes.error && pRes.data) setParties(pRes.data as PartyRow[]);
      if (!gRes.error && gRes.data) setGuests(gRes.data as GuestRow[]);
      setPartiesLoading(false);
    });
  }, [weddingId]);

  // Load budget data (vendors, items, payments, lines, guest counts) for scenario totals
  useEffect(() => {
    if (!weddingId) return;
    let cancelled = false;
    setBudgetLoading(true);
    (async () => {
      try {
        const [weddingRes, vendorsRes, itemsRes] = await Promise.all([
          supabase.from('weddings').select('calculation_mode, target_adults, target_children, target_staff').eq('id', weddingId).maybeSingle(),
          supabase.from('vendors').select('id, name, category_id, expense_categories(id, name), staff_meals_count').eq('wedding_id', weddingId),
          supabase.from('expense_items').select('*, vendors(name, expense_categories(id, name)), expense_categories(id, name)').eq('wedding_id', weddingId),
        ]);
        if (cancelled) return;

        const persistedMode = (weddingRes.data?.calculation_mode as ScenarioMode | undefined) ?? 'planned';
        setScenario(persistedMode);

        setVendors((vendorsRes.data ?? []) as unknown as DbVendor[]);
        const allItems = (itemsRes.data ?? []) as unknown as DbExpenseItem[];
        setItems(allItems);

        const ids = allItems.map(i => i.id);
        if (ids.length > 0) {
          const [linesRes, paysRes] = await Promise.all([
            supabase.from('expense_line_items').select('*').in('expense_item_id', ids),
            supabase.from('payments').select('*').in('expense_item_id', ids),
          ]);
          if (cancelled) return;
          const map: Record<string, ExpenseLineItem[]> = {};
          for (const l of (linesRes.data ?? []) as unknown as Array<ExpenseLineItem & { expense_item_id: string }>) {
            (map[l.expense_item_id] ??= []).push(l);
          }
          setLineItemsMap(map);
          setPayments((paysRes.data ?? []) as unknown as DbPayment[]);
        } else {
          setLineItemsMap({});
          setPayments([]);
        }

        // Guest counts are computed in a separate effect once guests load.

      } catch (err) {
        console.error('Gifts budget load error', err);
      } finally {
        if (!cancelled) setBudgetLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [weddingId]);

  // Recompute guest counts whenever guests/vendors change
  useEffect(() => {
    if (!weddingId) return;
    (async () => {
      const { data: wed } = await supabase.from('weddings').select('target_adults, target_children, target_staff').eq('id', weddingId).maybeSingle();
      const vendorStaffMeals = vendors.reduce((s: number, v: any) => s + Number(v.staff_meals_count || 0), 0);
      const hostsWithMaterializedPlusOne = new Set(
        guests.filter(g => g.plus_one_of_guest_id).map(g => g.plus_one_of_guest_id as string)
      );
      const tally = (filterFn: (g: GuestRow) => boolean) => {
        let adults = 0, children = 0;
        for (const g of guests) {
          if (!filterFn(g)) continue;
          if (g.is_staff) continue;
          if (g.is_child) children += 1;
          else adults += 1;
          if (g.allow_plus_one && g.plus_one_name && !hostsWithMaterializedPlusOne.has(g.id)) {
            adults += 1;
          }
        }
        return { adults, children, staff: vendorStaffMeals };
      };
      setGuestCounts({
        planned: {
          adults: Number(wed?.target_adults ?? 100),
          children: Number(wed?.target_children ?? 0),
          staff: Number(wed?.target_staff ?? vendorStaffMeals),
        },
        expected: tally(() => true),
        confirmed: tally(g => isGuestConfirmed(g as any)),
      });
    })();
  }, [weddingId, guests, vendors]);

  // Compute the budget total for each scenario via the same engine as the Budget page
  const scenarioTotals = useMemo(() => {
    if (!guestCounts) return null;
    const compute = (m: ScenarioMode) => {
      const vs = buildVendors(vendors, items, payments, lineItemsMap, m, guestCounts);
      return buildTotals(0, vs).committed;
    };
    return {
      planned: compute('planned'),
      expected: compute('expected'),
      confirmed: compute('confirmed'),
    };
  }, [vendors, items, payments, lineItemsMap, guestCounts]);

  const currentBudgetTotal = scenarioTotals ? scenarioTotals[scenario] : 0;
  const scenarioPersons = guestCounts ? (guestCounts[scenario].adults + guestCounts[scenario].children) : 0;

  const personsPerParty = useMemo(() => {
    const map: Record<string, number> = {};
    for (const g of guests) {
      if (!g.party_id) continue;
      if (g.is_couple_member || g.is_staff) continue;
      map[g.party_id] = (map[g.party_id] ?? 0) + 1;
    }
    return map;
  }, [guests]);

  const guestNamesByParty = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const g of guests) {
      if (!g.party_id) continue;
      const name = `${g.first_name ?? ''} ${g.last_name ?? ''}`.trim();
      if (!name) continue;
      (map[g.party_id] ??= []).push(name);
    }
    return map;
  }, [guests]);

  const togglePrivacy = () => {
    const next = !isPrivate;
    setIsPrivate(next);
    try { localStorage.setItem(PRIVACY_KEY, String(next)); } catch {}
  };
  const handleEstimateChange = (v: number) => {
    setAvgEstimate(v);
    try { localStorage.setItem(ESTIMATE_KEY, String(v)); } catch {}
  };
  const handleScenarioChange = (m: ScenarioMode) => {
    setScenario(m);
    if (!weddingId) return;
    supabase.from('weddings').update({ calculation_mode: m }).eq('id', weddingId).then(({ error }) => {
      if (error) console.warn('Persist scenario failed', error);
    });
  };

  const loading = giftsLoading || forecastLoading || partiesLoading || budgetLoading;

  const defaultForecast = {
    total_cash_received: 0, total_expenses: 0, eligible_parties_count: 0, eligible_persons_count: 0,
    total_forecast: 0, projected_liquidity: 0, net_budget_coverage: 0,
  };

  return (
    <div style={{ minHeight: '100vh', background: 'hsl(var(--paper-bg))' }}>
      <div
        className="gifts-body"
        style={{ maxWidth: 760, margin: '0 auto', padding: '32px 24px 80px', display: 'grid', gap: 20 }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'hsl(var(--paper-ink-3))', marginBottom: 8 }}>
              Regali
            </div>
            <h1 style={{ margin: 0, fontFamily: "'Fraunces', Georgia, serif", fontWeight: 400, fontSize: 34, letterSpacing: '-0.02em', color: 'hsl(var(--paper-ink))' }}>
              Regali &amp; Net Budget
            </h1>
            <p style={{ margin: '8px 0 0', fontSize: 14, color: 'hsl(var(--paper-ink-2))' }}>
              Traccia i regali ricevuti e simula la copertura del budget.
            </p>
          </div>
          <button
            onClick={togglePrivacy}
            title={isPrivate ? 'Mostra valori' : 'Nascondi valori'}
            style={{
              width: 40, height: 40, flexShrink: 0, borderRadius: 10, cursor: 'pointer',
              background: 'hsl(var(--paper-surface))', border: '1px solid hsl(var(--paper-border))',
              color: 'hsl(var(--paper-ink-2))', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {isPrivate ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>

        {loading ? (
          <div style={{ display: 'grid', gap: 16 }}>
            <Skeleton className="h-10 w-72" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <>
            <ScenarioSelector mode={scenario} onModeChange={handleScenarioChange} counts={guestCounts} />
            <GiftCoverageWidget
              forecast={forecast ?? defaultForecast}
              isPrivate={isPrivate}
              budgetTotal={currentBudgetTotal}
              scenarioLabel={SCENARIO_LABEL[scenario]}
              scenarioPersons={scenarioPersons}
            />
            <GiftSimulatorSlider
              value={avgEstimate}
              onChange={handleEstimateChange}
              eligibleCount={forecast?.eligible_parties_count ?? 0}
              eligiblePersons={forecast?.eligible_persons_count ?? 0}
            />
            {weddingId && (
              <GiftPartyList
                parties={parties}
                gifts={gifts}
                weddingId={weddingId}
                avgEstimate={avgEstimate}
                isPrivate={isPrivate}
                personsPerParty={personsPerParty}
                guestNamesByParty={guestNamesByParty}
              />
            )}
          </>
        )}
      </div>

      <style>{`
        @media (max-width: 767px) {
          .gifts-body { padding: 18px 12px 96px !important; gap: 16px !important; }
          .gifts-body h1 { font-size: 28px !important; }
        }
      `}</style>
    </div>
  );
}
