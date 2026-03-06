interface PrintGuest {
  first_name: string;
  last_name: string;
  is_child: boolean;
  unique_rsvp_token?: string | null;
  phone?: string | null;
}

interface PrintParty {
  id: string;
  party_name: string;
  guests: PrintGuest[];
}

export interface PartyPrintTarget {
  partyId: string;
  displayName: string;
  guestCount: number;
  syncToken: string;
  rsvpStatus: 'pending' | 'confirmed' | 'declined';
}

/**
 * Resolve the display name for a party/nucleus to print on the invitation.
 * 1. If party has a custom name → use it (e.g. "Famiglia Rossi")
 * 2. If no custom name → concatenate adult first names (e.g. "Mario e Giulia")
 * 3. Single guest (no party) → "Nome Cognome"
 */
export function resolveDisplayName(party: PrintParty): string {
  const adults = party.guests.filter(g => !g.is_child);

  // Check if party_name looks "custom" (not auto-generated from a single guest name)
  if (party.party_name && adults.length > 1) {
    return party.party_name;
  }

  if (adults.length === 0) {
    return party.party_name || 'Ospite';
  }

  if (adults.length === 1) {
    const g = adults[0];
    return `${g.first_name} ${g.last_name}`.trim();
  }

  // Multiple adults: "Mario e Giulia"
  const names = adults.map(g => g.first_name);
  if (names.length === 2) {
    return names.join(' e ');
  }
  return names.slice(0, -1).join(', ') + ' e ' + names[names.length - 1];
}

/**
 * Get the best sync token from a party's guests.
 * Prefers first adult with a token + phone (the "digital referent").
 */
export function resolveSyncToken(guests: PrintGuest[]): string {
  const withToken = guests.filter(g => g.unique_rsvp_token);
  const adultWithPhone = withToken.find(g => !g.is_child && g.phone);
  if (adultWithPhone) return adultWithPhone.unique_rsvp_token!;
  if (withToken.length > 0) return withToken[0].unique_rsvp_token!;
  return '';
}
