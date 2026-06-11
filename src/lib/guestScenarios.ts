/**
 * Single source of truth for the 3 headcount scenarios used everywhere
 * (Dashboard pie, ScenarioSelector, Budget, Vendors, Catering).
 *
 * Rules (1 row = 1 person):
 *  - `staff`    = staff_meals_count summed from vendors (NEVER guest rows)
 *  - `adults`   = non-staff, non-child rows; sposi (is_couple_member) INCLUSI
 *  - `children` = non-staff, child rows
 *  - "Textual" +1 (allow_plus_one + plus_one_name, not yet promoted to its own
 *     guest row) counts as 1 adult head.
 *
 * Scenarios:
 *  - planned   → weddings.target_adults/target_children (fallback to expected)
 *  - expected  → whole list minus declined
 *  - confirmed → rsvp_status='confirmed' + ALL couple members (sposi sono di
 *                fatto sempre confermati)
 *
 * Use `buildGuestScenarios()` everywhere; do not inline tallies.
 */
import { isGuestConfirmed, isGuestDeclined } from '@/lib/rsvpHelpers';

export type ScenarioId = 'planned' | 'expected' | 'confirmed';
export interface ScenarioCount { adults: number; children: number; staff: number; total: number; }
export interface ScenarioBundle {
  planned: ScenarioCount;
  expected: ScenarioCount;
  confirmed: ScenarioCount;
}

export interface ScenarioGuest {
  id: string;
  rsvp_status: string | null;
  is_child: boolean | null;
  is_staff: boolean | null;
  is_couple_member: boolean | null;
  allow_plus_one?: boolean | null;
  plus_one_name?: string | null;
  plus_one_of_guest_id?: string | null;
}

export interface ScenarioVendor { staff_meals_count: number | null; }

export interface ScenarioTargets {
  target_adults?: number | null;
  target_children?: number | null;
  target_staff?: number | null;
}

const withTotal = (c: { adults: number; children: number; staff: number }): ScenarioCount => ({
  ...c,
  total: c.adults + c.children + c.staff,
});

export function calculateTotalVendorStaff(vendors: ScenarioVendor[]): number {
  return vendors.reduce((s, v) => s + Number(v?.staff_meals_count || 0), 0);
}

/**
 * Tally adults/children from a guest set, applying the textual-+1 promotion rule.
 * Couple members are INCLUDED as adults.
 */
function tallyHeads(
  guests: ScenarioGuest[],
  predicate: (g: ScenarioGuest) => boolean,
  hostsWithMaterializedPlusOne: Set<string>,
): { adults: number; children: number } {
  let adults = 0, children = 0;
  for (const g of guests) {
    if (g.is_staff) continue;
    if (!predicate(g)) continue;
    if (g.is_child) children += 1;
    else adults += 1; // sposi inclusi
    if (g.allow_plus_one && g.plus_one_name && !hostsWithMaterializedPlusOne.has(g.id)) {
      adults += 1;
    }
  }
  return { adults, children };
}

/**
 * Build the 3-scenario bundle from guests + vendors + wedding targets.
 * Always returns a coherent set; staff is the vendor sum for all scenarios.
 */
export function buildGuestScenarios(
  guests: ScenarioGuest[],
  vendors: ScenarioVendor[],
  targets: ScenarioTargets,
): ScenarioBundle {
  const staff = calculateTotalVendorStaff(vendors);
  const hostsWithMaterializedPlusOne = new Set(
    guests.filter(g => g.plus_one_of_guest_id).map(g => g.plus_one_of_guest_id as string),
  );

  // EXPECTED = lista invitati (escludi solo i declined)
  const expectedHeads = tallyHeads(
    guests,
    g => !isGuestDeclined(g as any),
    hostsWithMaterializedPlusOne,
  );

  // CONFIRMED = rsvp confermato OR sposi (sempre confermati)
  const confirmedHeads = tallyHeads(
    guests,
    g => isGuestConfirmed(g as any) || !!g.is_couple_member,
    hostsWithMaterializedPlusOne,
  );

  // PLANNED = targets manuali, fallback su expected
  const plannedAdults = targets.target_adults != null
    ? Number(targets.target_adults)
    : expectedHeads.adults;
  const plannedChildren = targets.target_children != null
    ? Number(targets.target_children)
    : expectedHeads.children;
  const plannedStaff = targets.target_staff != null
    ? Number(targets.target_staff)
    : staff;

  return {
    planned: withTotal({ adults: plannedAdults, children: plannedChildren, staff: plannedStaff }),
    expected: withTotal({ ...expectedHeads, staff }),
    confirmed: withTotal({ ...confirmedHeads, staff }),
  };
}
