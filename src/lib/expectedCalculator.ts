/**
 * Calcola i conteggi "Previsti" (Expected) basandosi su:
 * - Se STD non inviati: lista completa invitati
 * - Se STD inviati: risposte "likely_yes" + "unsure" + "in attesa"
 * - Staff: somma staff_meals_count da tutti i fornitori
 * - +1 (accompagnatori): conta quelli confermati (con nome) e potenziali (solo permesso)
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
  // Campi per +1
  allow_plus_one?: boolean;
  plus_one_name?: string | null;
}

export interface ExpectedResult {
  adults: number;
  children: number;
  staff: number;
  plusOnesConfirmed: number;   // +1 con nome compilato
  plusOnesPotential: number;   // +1 solo permessi (allow_plus_one=true senza nome)
  source: 'std_responses' | 'full_list';
  details: string;
  totalHeadCount: number;      // Totale coperti (adulti + bambini + staff + +1 confermati)
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
    
    // Conta +1 dalla lista completa
    const plusOnesConfirmed = invitedGuests.filter(
      g => g.plus_one_name && g.plus_one_name.trim() !== ''
    ).length;
    const plusOnesPotential = invitedGuests.filter(
      g => g.allow_plus_one && (!g.plus_one_name || g.plus_one_name.trim() === '')
    ).length;
    
    // In modalità "Previsti" includi TUTTI i +1 (confermati + potenziali) per pianificazione catering
    const totalHeadCount = adults + children + vendorStaffTotal + plusOnesConfirmed + plusOnesPotential;
    
    return {
      adults,
      children,
      staff: vendorStaffTotal,
      plusOnesConfirmed,
      plusOnesPotential,
      source: 'full_list',
      details: `Lista completa (${adults + children} invitati${(plusOnesConfirmed + plusOnesPotential) > 0 ? ` + ${plusOnesConfirmed + plusOnesPotential} accomp.` : ''}, STD non ancora inviati)`,
      totalHeadCount
    };
  }
  
  // Se STD inviati -> conta likely_yes + unsure + in attesa
  // (basandosi su chi ha STD effettivo, non solo save_the_date_sent_at diretto)
  const likelyYesGuests = guestsWithEffectiveStd.filter(g => g.std_response === 'likely_yes');
  const unsureGuests = guestsWithEffectiveStd.filter(g => g.std_response === 'unsure');
  // In attesa = chi ha STD effettivo ma non ha ancora risposto
  const noResponseGuests = guestsWithEffectiveStd.filter(g => !g.std_response);
  
  // Ospiti previsti = likely_yes + unsure + no_response
  const expectedGuests = [...likelyYesGuests, ...unsureGuests, ...noResponseGuests];
  
  const likelyYesAdults = likelyYesGuests.filter(g => !g.is_child).length;
  const likelyYesChildren = likelyYesGuests.filter(g => g.is_child).length;
  
  const unsureAdults = unsureGuests.filter(g => !g.is_child).length;
  const unsureChildren = unsureGuests.filter(g => g.is_child).length;
  
  const noResponseAdults = noResponseGuests.filter(g => !g.is_child).length;
  const noResponseChildren = noResponseGuests.filter(g => g.is_child).length;
  
  const totalAdults = likelyYesAdults + unsureAdults + noResponseAdults;
  const totalChildren = likelyYesChildren + unsureChildren + noResponseChildren;
  
  // Conta +1 solo dagli ospiti previsti (non da chi ha risposto "likely_no")
  const plusOnesConfirmed = expectedGuests.filter(
    g => g.plus_one_name && g.plus_one_name.trim() !== ''
  ).length;
  const plusOnesPotential = expectedGuests.filter(
    g => g.allow_plus_one && (!g.plus_one_name || g.plus_one_name.trim() === '')
  ).length;
  
  // In modalità "Previsti" includi TUTTI i +1 (confermati + potenziali) per pianificazione catering
  const totalHeadCount = totalAdults + totalChildren + vendorStaffTotal + plusOnesConfirmed + plusOnesPotential;
  
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
  
  let responseDetails = detailParts.length > 0 
    ? detailParts.join(' + ') + ' (da risposte STD)'
    : 'Nessuna risposta positiva STD';
  
  if (vendorStaffTotal > 0) {
    responseDetails += ` + ${vendorStaffTotal} staff`;
  }
  
  // Mostra tutti i +1 insieme (confermati + potenziali)
  const totalPlusOnes = plusOnesConfirmed + plusOnesPotential;
  if (totalPlusOnes > 0) {
    responseDetails += ` + ${totalPlusOnes} accomp.`;
    if (plusOnesPotential > 0 && plusOnesConfirmed > 0) {
      responseDetails += ` (${plusOnesConfirmed} confermati)`;
    }
  }
  
  return {
    adults: totalAdults,
    children: totalChildren,
    staff: vendorStaffTotal,
    plusOnesConfirmed,
    plusOnesPotential,
    source: 'std_responses',
    details: responseDetails,
    totalHeadCount
  };
}

/**
 * Calcola il totale staff da tutti i fornitori
 */
export function calculateTotalVendorStaff(vendors: { staff_meals_count: number | null }[]): number {
  return vendors.reduce((sum, v) => sum + (v.staff_meals_count || 0), 0);
}
