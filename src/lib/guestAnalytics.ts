// Guest Analytics Utility Functions
// Calculates comprehensive statistics for the wedding guest management system

export interface GuestForAnalytics {
  id: string;
  first_name: string;
  last_name: string;
  phone?: string;
  party_id?: string;
  is_child: boolean;
  is_staff?: boolean;
  rsvp_status?: string;
  menu_choice?: string;
  dietary_restrictions?: string;
  allow_plus_one?: boolean;
  plus_one_name?: string;
  group_id?: string | null;
  group_name?: string | null;
  save_the_date_sent_at?: string | null;
  formal_invite_sent_at?: string | null;
  last_reminder_sent_at?: string | null;
  std_response?: string | null;
  std_responded_at?: string | null;
  is_couple_member?: boolean;
}

export interface PartyForAnalytics {
  id: string;
  party_name: string;
  rsvp_status: 'In attesa' | 'Confermato' | 'Rifiutato';
  guests: GuestForAnalytics[];
}

export interface GroupBreakdown {
  name: string;
  count: number;
  percentage: number;
}

export interface MenuBreakdown {
  choice: string;
  count: number;
  percentage: number;
}

export interface PartySizeDistribution {
  size: string;
  count: number;
  percentage: number;
}

export interface GuestAnalytics {
  // Overview
  totalGuests: number;
  totalParties: number;
  avgPartySize: number;
  maxPartySize: number;
  
  // RSVP Status
  confirmedCount: number;
  confirmedPercentage: number;
  pendingCount: number;
  pendingPercentage: number;
  declinedCount: number;
  declinedPercentage: number;
  
  // Composition
  adultsCount: number;
  adultsPercentage: number;
  childrenCount: number;
  childrenPercentage: number;
  staffCount: number;
  staffPercentage: number;
  
  // Plus Ones
  plusOnesConfirmed: number;
  plusOnesPotential: number;
  plusOnesConversionRate: number;
  
  // Groups breakdown
  groupsBreakdown: GroupBreakdown[];
  ungroupedCount: number;
  ungroupedPercentage: number;
  
  // Contact coverage
  withPhone: number;
  withPhonePercentage: number;
  withoutPhone: number;
  withoutPhonePercentage: number;
  
  // Campaign funnel
  draftCount: number;
  draftPercentage: number;
  stdSentCount: number;
  stdSentPercentage: number;
  stdRespondedCount: number;
  stdResponseRate: number;
  stdLikelyYes: number;
  stdUnsure: number;
  stdLikelyNo: number;
  invitedCount: number;
  invitedPercentage: number;
  
  // Menu
  menuBreakdown: MenuBreakdown[];
  withMenuChoice: number;
  withMenuChoicePercentage: number;
  
  // Dietary
  dietaryRestrictions: string[];
  withDietaryCount: number;
  withDietaryPercentage: number;
  
  // Party size distribution
  partySizeDistribution: PartySizeDistribution[];
}

export function calculateGuestAnalytics(
  guests: GuestForAnalytics[],
  parties: PartyForAnalytics[]
): GuestAnalytics {
  // Filter out couple members from analytics
  const analyzableGuests = guests.filter(g => !g.is_couple_member);
  const total = analyzableGuests.length;
  
  if (total === 0) {
    return getEmptyAnalytics();
  }

  // RSVP Status counts
  const confirmedCount = analyzableGuests.filter(g => g.rsvp_status === 'confirmed').length;
  const declinedCount = analyzableGuests.filter(g => g.rsvp_status === 'declined').length;
  const pendingCount = total - confirmedCount - declinedCount;

  // Composition
  const childrenCount = analyzableGuests.filter(g => g.is_child).length;
  const staffCount = analyzableGuests.filter(g => g.is_staff).length;
  const adultsCount = total - childrenCount - staffCount;

  // Plus Ones
  const plusOnesPotential = analyzableGuests.filter(g => g.allow_plus_one).length;
  const plusOnesConfirmed = analyzableGuests.filter(g => g.plus_one_name && g.plus_one_name.trim() !== '').length;
  const plusOnesConversionRate = plusOnesPotential > 0 ? (plusOnesConfirmed / plusOnesPotential) * 100 : 0;

  // Groups breakdown
  const groupCounts: Record<string, number> = {};
  let ungroupedCount = 0;
  
  analyzableGuests.forEach(g => {
    if (g.group_name) {
      groupCounts[g.group_name] = (groupCounts[g.group_name] || 0) + 1;
    } else {
      ungroupedCount++;
    }
  });

  const groupsBreakdown: GroupBreakdown[] = Object.entries(groupCounts)
    .map(([name, count]) => ({
      name,
      count,
      percentage: (count / total) * 100
    }))
    .sort((a, b) => b.count - a.count);

  // Contact coverage
  const withPhone = analyzableGuests.filter(g => g.phone && g.phone.trim() !== '').length;
  const withoutPhone = total - withPhone;

  // Campaign funnel
  const draftCount = analyzableGuests.filter(g => !g.save_the_date_sent_at && !g.formal_invite_sent_at).length;
  const stdSentCount = analyzableGuests.filter(g => g.save_the_date_sent_at && !g.formal_invite_sent_at).length;
  const stdRespondedCount = analyzableGuests.filter(g => g.std_responded_at).length;
  const stdResponseRate = stdSentCount > 0 ? (stdRespondedCount / stdSentCount) * 100 : 0;
  const stdLikelyYes = analyzableGuests.filter(g => g.std_response === 'likely_yes').length;
  const stdUnsure = analyzableGuests.filter(g => g.std_response === 'unsure').length;
  const stdLikelyNo = analyzableGuests.filter(g => g.std_response === 'likely_no').length;
  const invitedCount = analyzableGuests.filter(g => g.formal_invite_sent_at).length;

  // Menu breakdown
  const menuCounts: Record<string, number> = {};
  let withMenuChoice = 0;
  
  analyzableGuests.forEach(g => {
    if (g.menu_choice && g.menu_choice.trim() !== '') {
      withMenuChoice++;
      menuCounts[g.menu_choice] = (menuCounts[g.menu_choice] || 0) + 1;
    }
  });

  const menuBreakdown: MenuBreakdown[] = Object.entries(menuCounts)
    .map(([choice, count]) => ({
      choice,
      count,
      percentage: (count / total) * 100
    }))
    .sort((a, b) => b.count - a.count);

  // Dietary restrictions
  const dietarySet = new Set<string>();
  let withDietaryCount = 0;
  
  analyzableGuests.forEach(g => {
    if (g.dietary_restrictions && g.dietary_restrictions.trim() !== '') {
      withDietaryCount++;
      dietarySet.add(g.dietary_restrictions.trim());
    }
  });

  // Party size distribution
  const partySizeCounts: Record<number, number> = {};
  let maxPartySize = 0;
  
  parties.forEach(p => {
    const size = p.guests.filter(g => !g.is_couple_member).length;
    if (size > 0) {
      partySizeCounts[size] = (partySizeCounts[size] || 0) + 1;
      maxPartySize = Math.max(maxPartySize, size);
    }
  });

  const partySizeDistribution: PartySizeDistribution[] = [];
  const sizeBuckets = [1, 2, 3, 4, 5];
  const totalPartiesCount = parties.length;
  
  sizeBuckets.forEach(size => {
    const label = size === 5 ? '5+' : String(size);
    let count = 0;
    
    if (size === 5) {
      // Sum all parties with 5+ members
      Object.entries(partySizeCounts).forEach(([s, c]) => {
        if (parseInt(s) >= 5) count += c;
      });
    } else {
      count = partySizeCounts[size] || 0;
    }
    
    partySizeDistribution.push({
      size: label,
      count,
      percentage: totalPartiesCount > 0 ? (count / totalPartiesCount) * 100 : 0
    });
  });

  // Average party size
  const avgPartySize = parties.length > 0 
    ? parties.reduce((sum, p) => sum + p.guests.filter(g => !g.is_couple_member).length, 0) / parties.length 
    : 0;

  return {
    totalGuests: total,
    totalParties: parties.length,
    avgPartySize: Math.round(avgPartySize * 100) / 100,
    maxPartySize,
    
    confirmedCount,
    confirmedPercentage: (confirmedCount / total) * 100,
    pendingCount,
    pendingPercentage: (pendingCount / total) * 100,
    declinedCount,
    declinedPercentage: (declinedCount / total) * 100,
    
    adultsCount,
    adultsPercentage: (adultsCount / total) * 100,
    childrenCount,
    childrenPercentage: (childrenCount / total) * 100,
    staffCount,
    staffPercentage: (staffCount / total) * 100,
    
    plusOnesConfirmed,
    plusOnesPotential,
    plusOnesConversionRate,
    
    groupsBreakdown,
    ungroupedCount,
    ungroupedPercentage: (ungroupedCount / total) * 100,
    
    withPhone,
    withPhonePercentage: (withPhone / total) * 100,
    withoutPhone,
    withoutPhonePercentage: (withoutPhone / total) * 100,
    
    draftCount,
    draftPercentage: (draftCount / total) * 100,
    stdSentCount,
    stdSentPercentage: (stdSentCount / total) * 100,
    stdRespondedCount,
    stdResponseRate,
    stdLikelyYes,
    stdUnsure,
    stdLikelyNo,
    invitedCount,
    invitedPercentage: (invitedCount / total) * 100,
    
    menuBreakdown,
    withMenuChoice,
    withMenuChoicePercentage: (withMenuChoice / total) * 100,
    
    dietaryRestrictions: Array.from(dietarySet).sort(),
    withDietaryCount,
    withDietaryPercentage: (withDietaryCount / total) * 100,
    
    partySizeDistribution
  };
}

function getEmptyAnalytics(): GuestAnalytics {
  return {
    totalGuests: 0,
    totalParties: 0,
    avgPartySize: 0,
    maxPartySize: 0,
    confirmedCount: 0,
    confirmedPercentage: 0,
    pendingCount: 0,
    pendingPercentage: 0,
    declinedCount: 0,
    declinedPercentage: 0,
    adultsCount: 0,
    adultsPercentage: 0,
    childrenCount: 0,
    childrenPercentage: 0,
    staffCount: 0,
    staffPercentage: 0,
    plusOnesConfirmed: 0,
    plusOnesPotential: 0,
    plusOnesConversionRate: 0,
    groupsBreakdown: [],
    ungroupedCount: 0,
    ungroupedPercentage: 0,
    withPhone: 0,
    withPhonePercentage: 0,
    withoutPhone: 0,
    withoutPhonePercentage: 0,
    draftCount: 0,
    draftPercentage: 0,
    stdSentCount: 0,
    stdSentPercentage: 0,
    stdRespondedCount: 0,
    stdResponseRate: 0,
    stdLikelyYes: 0,
    stdUnsure: 0,
    stdLikelyNo: 0,
    invitedCount: 0,
    invitedPercentage: 0,
    menuBreakdown: [],
    withMenuChoice: 0,
    withMenuChoicePercentage: 0,
    dietaryRestrictions: [],
    withDietaryCount: 0,
    withDietaryPercentage: 0,
    partySizeDistribution: []
  };
}
