/**
 * Nucleus-level status helper
 * 
 * Calculates the effective STD/Invite status for a guest considering party logic.
 * If a guest is in a party and ALL members with a phone have received the STD,
 * then members without phone should also be considered as "invited".
 */

interface GuestForStatus {
  id: string;
  party_id?: string | null;
  phone?: string | null;
  save_the_date_sent_at?: string | null;
  formal_invite_sent_at?: string | null;
  std_response?: string | null;
}

export interface EffectiveStatus {
  hasStdSent: boolean;
  hasFormalInvite: boolean;
  hasStdResponse: boolean;
}

/**
 * Get the effective STD/Invite status for a guest, considering nucleus logic.
 * 
 * Logic:
 * - If guest has STD sent directly, use that
 * - If guest is in a party and has no phone:
 *   - Check if ALL party members WITH phone have received STD
 *   - If yes, this guest "inherits" the STD status
 * - If no one in party has phone, check if anyone has STD manually marked
 */
export function getEffectiveStatus<T extends GuestForStatus>(
  guest: T, 
  allGuests: T[]
): EffectiveStatus {
  // If guest already has STD/formal invite, use those directly
  if (guest.save_the_date_sent_at) {
    return {
      hasStdSent: true,
      hasFormalInvite: !!guest.formal_invite_sent_at,
      hasStdResponse: !!guest.std_response,
    };
  }
  
  // If not in a party, cannot inherit status
  if (!guest.party_id) {
    return {
      hasStdSent: false,
      hasFormalInvite: !!guest.formal_invite_sent_at,
      hasStdResponse: !!guest.std_response,
    };
  }
  
  // Find all party members
  const partyMembers = allGuests.filter(g => g.party_id === guest.party_id);
  const membersWithPhone = partyMembers.filter(g => g.phone);
  
  // If no one has a phone, check if anyone has STD sent (manually marked)
  if (membersWithPhone.length === 0) {
    const anyHasStd = partyMembers.some(g => g.save_the_date_sent_at);
    const anyHasFormal = partyMembers.some(g => g.formal_invite_sent_at);
    const anyHasStdResponse = partyMembers.some(g => g.std_response);
    return { 
      hasStdSent: anyHasStd, 
      hasFormalInvite: anyHasFormal,
      hasStdResponse: anyHasStdResponse,
    };
  }
  
  // Check if ALL members with phone have received STD/Formal
  const allPhoneMembersHaveStd = membersWithPhone.every(g => g.save_the_date_sent_at);
  const allPhoneMembersHaveFormal = membersWithPhone.every(g => g.formal_invite_sent_at);
  
  // For STD response, check if any party member has responded
  const anyHasStdResponse = partyMembers.some(g => g.std_response);
  
  return {
    hasStdSent: allPhoneMembersHaveStd,
    hasFormalInvite: allPhoneMembersHaveFormal,
    hasStdResponse: anyHasStdResponse,
  };
}

/**
 * Check if a guest matches a funnel filter, using nucleus-aware logic
 */
export function matchesFunnelFilter<T extends GuestForStatus & { rsvp_status?: string | null; is_couple_member?: boolean }>(
  guest: T,
  allGuests: T[],
  funnelFilter: string
): boolean {
  // Couple members always count as confirmed
  if (guest.is_couple_member) {
    return funnelFilter === 'confirmed';
  }
  
  const status = getEffectiveStatus(guest, allGuests);
  
  switch (funnelFilter) {
    case 'draft':
      // No STD sent (effective) and no formal invite
      return !status.hasStdSent && !status.hasFormalInvite;
    case 'std_sent':
      // Has STD sent (effective) but no formal invite
      return status.hasStdSent && !status.hasFormalInvite;
    case 'invited':
      // Has formal invite but RSVP pending
      return status.hasFormalInvite && (!guest.rsvp_status || guest.rsvp_status === 'pending');
    case 'confirmed':
      return guest.rsvp_status === 'confirmed';
    case 'declined':
      return guest.rsvp_status === 'declined';
    default:
      return true;
  }
}
