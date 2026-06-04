/**
 * Single source of truth for guest classification and headcounts.
 *
 * Architectural principle: one DB row = one person.
 * Legacy counter fields (`adults_count`, `children_count`) are deprecated and
 * MUST NOT be read by app code. Use the helpers exposed here.
 */

export type GuestClass = 'adult' | 'child' | 'staff' | 'couple';

export interface GuestClassInput {
  is_child?: boolean | null;
  is_staff?: boolean | null;
  is_couple_member?: boolean | null;
  rsvp_status?: string | null;
}

/**
 * Classify a guest row. Priority: staff → couple → child → adult.
 */
export function classifyGuest(g: GuestClassInput): GuestClass {
  if (g.is_staff) return 'staff';
  if (g.is_couple_member) return 'couple';
  if (g.is_child) return 'child';
  return 'adult';
}

export interface HeadCounts {
  adults: number;
  children: number;
  staff: number;
  couple: number;
  total: number;
}

const emptyCounts = (): HeadCounts => ({ adults: 0, children: 0, staff: 0, couple: 0, total: 0 });

/**
 * Count heads (1 row = 1 person). Mutually exclusive buckets.
 */
export function countHeads(guests: GuestClassInput[]): HeadCounts {
  const out = emptyCounts();
  for (const g of guests) {
    const cls = classifyGuest(g);
    out[cls === 'adult' ? 'adults' : cls === 'child' ? 'children' : cls === 'staff' ? 'staff' : 'couple'] += 1;
    out.total += 1;
  }
  return out;
}

/**
 * Normalize legacy/localized RSVP labels to canonical values.
 */
export function normalizeRsvpStatus(raw: string | null | undefined): 'confirmed' | 'declined' | 'pending' {
  if (!raw) return 'pending';
  const v = String(raw).toLowerCase().trim();
  if (v === 'confirmed' || v === 'confermato') return 'confirmed';
  if (v === 'declined' || v === 'rifiutato') return 'declined';
  return 'pending';
}

/**
 * Count heads filtered by RSVP status (normalized).
 */
export function countHeadsByRsvp(
  guests: GuestClassInput[],
  status: 'confirmed' | 'declined' | 'pending',
): HeadCounts {
  return countHeads(guests.filter(g => normalizeRsvpStatus(g.rsvp_status) === status));
}

/**
 * For catering: every row = 1 cover. Never read legacy counters.
 */
export function headcountForCatering(_g: GuestClassInput): number {
  return 1;
}
