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
  greeting: string; // e.g. "Caro Marco", "Cara Famiglia Rossi", "Cari Roberto e Alejo"
  guestCount: number;
  syncToken: string;
  rsvpStatus: 'pending' | 'confirmed' | 'declined';
}

// Common Italian male names that end in 'a' (exception to the heuristic)
const MALE_EXCEPTIONS = ['andrea', 'luca', 'nicola', 'mattia', 'elia', 'isaia', 'giosuè'];

function guessGender(firstName: string): 'M' | 'F' {
  const name = firstName.trim().toLowerCase();
  // Known male names that end in 'a'
  if (MALE_EXCEPTIONS.includes(name)) return 'M';
  // Most Italian female names end in 'a'
  if (name.endsWith('a')) return 'F';
  return 'M';
}

/**
 * Resolve the greeting line for a party.
 * - 1 male → "Caro Marco"
 * - 1 female → "Cara Lavinia"
 * - 2+ with same last name → "Cara Famiglia Rossi"
 * - 2+ with different last names → "Cari Roberto e Alejo"
 */
function resolvePluralPrefix(adults: PrintGuest[]): string {
  const allFemale = adults.length > 0 && adults.every(g => guessGender(g.first_name) === 'F');
  return allFemale ? 'Care' : 'Cari';
}

export function resolveGreeting(party: PrintParty): string {
  const adults = party.guests.filter(g => !g.is_child);
  if (adults.length === 0) return 'Cari';

  if (adults.length === 1) {
    const g = adults[0];
    const gender = guessGender(g.first_name);
    return gender === 'F'
      ? `Cara ${g.first_name}`
      : `Caro ${g.first_name}`;
  }

  // Check if all adults share the same last name
  const lastNames = new Set(adults.map(g => g.last_name.trim().toLowerCase()));
  if (lastNames.size === 1) {
    return `Cari Famiglia ${adults[0].last_name}`;
  }

  // Different last names: gender-aware prefix
  const prefix = resolvePluralPrefix(adults);
  const names = adults.map(g => g.first_name);
  if (names.length === 2) {
    return `${prefix} ${names.join(' e ')}`;
  }
  return `${prefix} ${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`;
}

/**
 * Resolve the greeting for a solo guest (no party).
 */
export function resolveGreetingSolo(guest: PrintGuest): string {
  const gender = guessGender(guest.first_name);
  return gender === 'F'
    ? `Cara ${guest.first_name}`
    : `Caro ${guest.first_name}`;
}

/**
 * Resolve the display name for a party/nucleus to print on the invitation.
 */
export function resolveDisplayName(party: PrintParty): string {
  const adults = party.guests.filter(g => !g.is_child);

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

  const names = adults.map(g => g.first_name);
  if (names.length === 2) {
    return names.join(' e ');
  }
  return names.slice(0, -1).join(', ') + ' e ' + names[names.length - 1];
}

/**
 * Get the best sync token from a party's guests.
 */
export function resolveSyncToken(guests: PrintGuest[]): string {
  const withToken = guests.filter(g => g.unique_rsvp_token);
  const adultWithPhone = withToken.find(g => !g.is_child && g.phone);
  if (adultWithPhone) return adultWithPhone.unique_rsvp_token!;
  if (withToken.length > 0) return withToken[0].unique_rsvp_token!;
  return '';
}
