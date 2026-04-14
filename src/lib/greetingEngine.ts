/**
 * Motore Dinamico Saluti — Grammatica Italiana
 * Genera la stringa di saluto personalizzata per le partecipazioni.
 */

export type GreetingType = 'informal' | 'formal' | 'none' | 'custom';

export interface MockGuestMember {
  name: string;
  lastName: string;
  aka?: string;
  gender?: 'M' | 'F' | null;
  isChild?: boolean;
}

export interface MockParty {
  isNucleo: boolean;
  nucleusName?: string; // e.g. "Famiglia Rossi"
  members: MockGuestMember[];
}

// Italian male names that end in 'a' (exceptions to the heuristic)
const MALE_EXCEPTIONS = ['andrea', 'luca', 'nicola', 'mattia', 'elia', 'isaia', 'giosuè', 'enea', 'battista'];

function guessGender(firstName: string): 'M' | 'F' {
  const name = firstName.trim().toLowerCase();
  if (MALE_EXCEPTIONS.includes(name)) return 'M';
  if (name.endsWith('a')) return 'F';
  return 'M';
}

function resolveName(member: MockGuestMember, useAka: boolean): string {
  if (useAka && member.aka && member.aka.trim()) {
    return member.aka.trim();
  }
  return member.name.trim();
}

function resolveGender(member: MockGuestMember): 'M' | 'F' | null {
  if (member.gender) return member.gender;
  return guessGender(member.name);
}

export interface GreetingResult {
  /** Full greeting string e.g. "Caro Marco" */
  full: string;
  /** Just the prefix e.g. "Caro" */
  prefix: string;
  /** Just the name part e.g. "Marco" */
  namePart: string;
}

function resolvePluralPrefix(adults: MockGuestMember[], greetingType: 'informal' | 'formal'): string {
  const allFemale = adults.length > 0 && adults.every(m => resolveGender(m) === 'F');
  if (greetingType === 'formal') return allFemale ? 'Gentilissime' : 'Gentilissimi';
  return allFemale ? 'Care' : 'Cari';
}

export function generateGreetingString(opts: {
  greetingType: GreetingType;
  customGreeting?: string;
  useAka: boolean;
  party: MockParty;
}): GreetingResult {
  const { greetingType, customGreeting, useAka, party } = opts;

  const adults = party.members.filter(m => !m.isChild);
  if (adults.length === 0) {
    return { full: '', prefix: '', namePart: '' };
  }

  // No greeting — just names
  if (greetingType === 'none') {
    const namePart = buildNamePart(adults, useAka, party);
    return { full: namePart, prefix: '', namePart };
  }

  // Custom greeting — user-defined prefix
  if (greetingType === 'custom') {
    const prefix = (customGreeting || '').trim();
    const namePart = buildNamePart(adults, useAka, party);
    return {
      full: prefix ? `${prefix} ${namePart}` : namePart,
      prefix,
      namePart,
    };
  }

  // Nucleus / large group (>2 adults or isNucleo flag)
  if (party.isNucleo || adults.length > 2) {
    const familyName = party.nucleusName
      || `Famiglia ${adults[0].lastName}`;
    let prefix: string;
    if (greetingType === 'formal') {
      const allFemale = adults.every(m => resolveGender(m) === 'F');
      prefix = allFemale ? 'Gentilissime' : 'Gentilissimi';
    } else {
      const allFemale = adults.every(m => resolveGender(m) === 'F');
      prefix = allFemale ? 'Care' : 'Cari';
    }
    return {
      full: `${prefix} ${familyName}`,
      prefix,
      namePart: familyName,
    };
  }

  // Single guest
  if (adults.length === 1) {
    const member = adults[0];
    const name = resolveName(member, useAka);
    const gender = resolveGender(member);

    let prefix: string;
    if (greetingType === 'formal') {
      prefix = 'Gentile';
    } else {
      if (gender === null) {
        prefix = 'Gentile';
      } else {
        prefix = gender === 'F' ? 'Cara' : 'Caro';
      }
    }
    return { full: `${prefix} ${name}`, prefix, namePart: name };
  }

  // Couple (2 adults)
  const name1 = resolveName(adults[0], useAka);
  const name2 = resolveName(adults[1], useAka);
  const namePart = `${name1} e ${name2}`;

  // Couple with nucleus name: use it as source of truth
  if (party.isNucleo && party.nucleusName) {
    const prefix = resolvePluralPrefix(adults, greetingType);
    return { full: `${prefix} ${party.nucleusName}`, prefix, namePart: party.nucleusName };
  }

  const prefix = resolvePluralPrefix(adults, greetingType);
  return { full: `${prefix} ${namePart}`, prefix, namePart };
}

function buildNamePart(adults: MockGuestMember[], useAka: boolean, party: MockParty): string {
  if (party.isNucleo || adults.length > 2) {
    return party.nucleusName || `Famiglia ${adults[0].lastName}`;
  }
  const names = adults.map(m => resolveName(m, useAka));
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} e ${names[1]}`;
  return `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`;
}

/** Default mock party for preview in editor */
export const DEFAULT_MOCK_PARTY: MockParty = {
  isNucleo: true,
  nucleusName: 'Famiglia Rossi',
  members: [
    { name: 'Marco', lastName: 'Rossi', aka: 'Marchino', gender: 'M' },
    { name: 'Laura', lastName: 'Rossi', aka: '', gender: 'F' },
  ],
};
