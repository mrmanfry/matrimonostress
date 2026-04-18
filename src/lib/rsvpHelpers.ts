/**
 * Helper functions for consistent RSVP status handling across the application.
 * Supports both Italian and English status strings for database compatibility.
 */

export const isDeclined = (status: string | null | undefined): boolean => 
  status === 'Rifiutato' || status === 'declined';

export const isConfirmed = (status: string | null | undefined): boolean => 
  status === 'Confermato' || status === 'confirmed';

export const isPending = (status: string | null | undefined): boolean => 
  !status || status === 'In attesa' || status === 'pending';

/**
 * Single Source of Truth — guest-level confirmation.
 * Spouses (is_couple_member) sono SEMPRE confermati.
 * Per tutti gli altri vale ESCLUSIVAMENTE guest.rsvp_status (mai lo stato del nucleo).
 */
type GuestLike = {
  rsvp_status?: string | null;
  is_couple_member?: boolean | null;
};

export const isGuestConfirmed = (g: GuestLike): boolean =>
  g.is_couple_member === true || isConfirmed(g.rsvp_status);

export const isGuestDeclined = (g: GuestLike): boolean =>
  !g.is_couple_member && isDeclined(g.rsvp_status);

export const isGuestPending = (g: GuestLike): boolean =>
  !isGuestConfirmed(g) && !isGuestDeclined(g);
