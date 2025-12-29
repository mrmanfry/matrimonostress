/**
 * Calcola i conteggi "Previsti" (Expected) basandosi su:
 * - Se STD non inviati: lista completa invitati
 * - Se STD inviati: risposte "likely_yes" + "unsure"
 * - Staff: somma staff_meals_count da tutti i fornitori
 */

export interface Guest {
  id: string;
  is_child: boolean;
  is_staff?: boolean;
  save_the_date_sent_at: string | null;
  std_response: string | null;
  rsvp_status?: string | null;
}

export interface ExpectedResult {
  adults: number;
  children: number;
  staff: number;
  source: 'std_responses' | 'full_list';
  details: string;
}

export function calculateExpectedCounts(
  guests: Guest[],
  vendorStaffTotal: number
): ExpectedResult {
  // Filtra solo invitati non-staff
  const invitedGuests = guests.filter(g => !g.is_staff);
  
  // Conta quanti STD sono stati inviati
  const stdSentCount = invitedGuests.filter(g => g.save_the_date_sent_at).length;
  
  // Se nessun STD inviato -> usa lista completa
  if (stdSentCount === 0) {
    const adults = invitedGuests.filter(g => !g.is_child).length;
    const children = invitedGuests.filter(g => g.is_child).length;
    
    return {
      adults,
      children,
      staff: vendorStaffTotal,
      source: 'full_list',
      details: `Lista completa (${adults + children} invitati, STD non ancora inviati)`
    };
  }
  
  // Se STD inviati -> conta likely_yes + unsure
  const likelyYesGuests = invitedGuests.filter(g => g.std_response === 'likely_yes');
  const unsureGuests = invitedGuests.filter(g => g.std_response === 'unsure');
  // Include anche chi non ha ancora risposto (potrebbe essere un sì)
  const noResponseGuests = invitedGuests.filter(g => g.save_the_date_sent_at && !g.std_response);
  
  const likelyYesAdults = likelyYesGuests.filter(g => !g.is_child).length;
  const likelyYesChildren = likelyYesGuests.filter(g => g.is_child).length;
  
  const unsureAdults = unsureGuests.filter(g => !g.is_child).length;
  const unsureChildren = unsureGuests.filter(g => g.is_child).length;
  
  const noResponseAdults = noResponseGuests.filter(g => !g.is_child).length;
  const noResponseChildren = noResponseGuests.filter(g => g.is_child).length;
  
  const totalAdults = likelyYesAdults + unsureAdults + noResponseAdults;
  const totalChildren = likelyYesChildren + unsureChildren + noResponseChildren;
  
  // Costruisci la stringa di dettaglio
  const detailParts: string[] = [];
  if (likelyYesGuests.length > 0) {
    detailParts.push(`${likelyYesGuests.length} sì`);
  }
  if (unsureGuests.length > 0) {
    detailParts.push(`${unsureGuests.length} forse`);
  }
  if (noResponseGuests.length > 0) {
    detailParts.push(`${noResponseGuests.length} in attesa`);
  }
  
  const responseDetails = detailParts.length > 0 
    ? detailParts.join(' + ') + ' (da risposte STD)'
    : 'Nessuna risposta positiva STD';
  
  const staffDetails = vendorStaffTotal > 0 ? ` + ${vendorStaffTotal} staff fornitori` : '';
  
  return {
    adults: totalAdults,
    children: totalChildren,
    staff: vendorStaffTotal,
    source: 'std_responses',
    details: responseDetails + staffDetails
  };
}

/**
 * Calcola il totale staff da tutti i fornitori
 */
export function calculateTotalVendorStaff(vendors: { staff_meals_count: number | null }[]): number {
  return vendors.reduce((sum, v) => sum + (v.staff_meals_count || 0), 0);
}
