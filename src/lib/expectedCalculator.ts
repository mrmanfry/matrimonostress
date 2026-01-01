/**
 * Calcola i conteggi "Previsti" (Expected) basandosi su:
 * - Se STD non inviati: lista completa invitati
 * - Se STD inviati: risposte "likely_yes" + "unsure" + "in attesa"
 * - Staff: somma staff_meals_count da tutti i fornitori
 * 
 * IMPORTANTE: Usa getEffectiveStatus per l'eredità nucleo (party_id)
 * Un ospite senza save_the_date_sent_at può comunque essere considerato
 * "STD inviato" se tutti i membri del suo nucleo con telefono l'hanno ricevuto.
 */

import { getEffectiveStatus } from "@/lib/nucleusStatusHelper";

export interface Guest {
  id: string;
  is_child: boolean;
  is_staff?: boolean;
  save_the_date_sent_at: string | null;
  std_response: string | null;
  rsvp_status?: string | null;
  // Campi necessari per getEffectiveStatus
  party_id?: string | null;
  phone?: string | null;
}

export interface ExpectedResult {
  adults: number;
  children: number;
  staff: number;
  source: 'std_responses' | 'full_list';
  details: string;
}

/**
 * Calcola i conteggi previsti usando la logica nucleus-aware
 * @param guests - Lista ospiti da calcolare (filtrati per is_couple_member e is_staff)
 * @param allGuests - Lista completa ospiti per calcolare l'eredità nucleo
 * @param vendorStaffTotal - Totale staff dai fornitori
 */
export function calculateExpectedCounts(
  guests: Guest[],
  allGuests: Guest[],
  vendorStaffTotal: number
): ExpectedResult {
  // Filtra solo invitati non-staff
  const invitedGuests = guests.filter(g => !g.is_staff);
  
  // Usa getEffectiveStatus per determinare chi ha STD (con eredità nucleo)
  const guestsWithEffectiveStd = invitedGuests.filter(g => {
    const status = getEffectiveStatus(g, allGuests);
    return status.hasStdSent;
  });
  
  // Se nessun STD effettivo inviato -> usa lista completa
  if (guestsWithEffectiveStd.length === 0) {
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
  
  // Se STD inviati -> conta likely_yes + unsure + in attesa
  // (basandosi su chi ha STD effettivo, non solo save_the_date_sent_at diretto)
  const likelyYesGuests = guestsWithEffectiveStd.filter(g => g.std_response === 'likely_yes');
  const unsureGuests = guestsWithEffectiveStd.filter(g => g.std_response === 'unsure');
  // In attesa = chi ha STD effettivo ma non ha ancora risposto
  const noResponseGuests = guestsWithEffectiveStd.filter(g => !g.std_response);
  
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
