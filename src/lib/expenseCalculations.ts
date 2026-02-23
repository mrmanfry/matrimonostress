// ============================================================================
// LIBRERIA DI CALCOLO CENTRALIZZATA PER LE SPESE
// ============================================================================
// Questa libreria fornisce una SINGOLA fonte di verità per il calcolo degli importi
// delle spese, eliminando le 5 fonti concorrenti che causavano discrepanze.
//
// Funzionalità principali:
// - Calcolo spese FIXED (importo fisso contrattuale)
// - Calcolo spese VARIABLE (basate su numero ospiti)
// - Calcolo spese MIXED (fisso + variabile)
// - Supporto modalità PLANNED (preventivo) e ACTUAL (effettivo da RSVP)
// ============================================================================

export interface ExpenseItem {
  id: string;
  expense_type: 'fixed' | 'variable' | 'mixed';
  fixed_amount: number | null;
  estimated_amount?: number | null; // Preventivo iniziale (usato come fallback se fixed_amount è null)
  planned_adults: number;
  planned_children: number;
  planned_staff: number;
  tax_rate: number | null;
  amount_is_tax_inclusive: boolean;
  total_amount?: number | null; // Legacy field, deprecated
  calculation_mode?: 'planned' | 'expected' | 'confirmed'; // Legacy field, ora sostituito dal toggle globale
}

export interface ExpenseLineItem {
  id?: string;
  unit_price: number;
  quantity_type: 'fixed' | 'adults' | 'children' | 'total_guests' | 'staff';
  quantity_fixed: number | null;
  quantity_limit: number | null;
  quantity_range: 'all' | 'up_to' | 'over';
  discount_percentage: number;
  tax_rate: number;
  price_is_tax_inclusive?: boolean;
}

export interface GuestCounts {
  planned: { adults: number; children: number; staff: number };
  expected: { adults: number; children: number; staff: number }; // Lista invitati - declined
  confirmed: { adults: number; children: number; staff: number }; // Solo confermati
}

// ============================================================================
// FUNZIONE PRINCIPALE: CALCOLA L'IMPORTO DI UNA SPESA
// ============================================================================
/**
 * Calcola l'importo totale di una spesa in base al tipo e alla modalità
 * 
 * @param expenseItem - La spesa da calcolare
 * @param lineItems - Le righe di costo associate (solo per variable/mixed)
 * @param mode - Modalità di calcolo: 'planned', 'expected' o 'confirmed'
 * @param guestCounts - Conteggio ospiti nelle tre modalità
 * @returns L'importo totale calcolato
 */
export function calculateExpenseAmount(
  expenseItem: ExpenseItem,
  lineItems: ExpenseLineItem[],
  mode: 'planned' | 'expected' | 'confirmed',
  guestCounts: GuestCounts
): number {
  // TIPO 1: Spesa Fissa (es: Location €3.000)
  if (expenseItem.expense_type === 'fixed') {
    // Usa fixed_amount, oppure estimated_amount come fallback, oppure 0
    const baseAmount = expenseItem.fixed_amount ?? expenseItem.estimated_amount ?? 0;
    // Se l'importo è IVA esclusa, aggiungi l'IVA
    if (!expenseItem.amount_is_tax_inclusive && expenseItem.tax_rate) {
      return baseAmount * (1 + expenseItem.tax_rate / 100);
    }
    return baseAmount;
  }
  
  // Calcola la parte variabile
  const variableTotal = lineItems.reduce((sum, line) => {
    return sum + calculateLineTotal(line, mode, guestCounts);
  }, 0);
  
  // TIPO 3: Spesa Mista (Fisso + Variabile)
  if (expenseItem.expense_type === 'mixed') {
    return (expenseItem.fixed_amount || 0) + variableTotal;
  }
  
  // TIPO 2: Spesa Variabile (basata su ospiti)
  return variableTotal;
}

// ============================================================================
// CALCOLO RIGA DI COSTO
// ============================================================================
/**
 * Calcola il totale di una singola riga di costo
 * 
 * @param lineItem - La riga di costo
 * @param mode - Modalità di calcolo: 'planned', 'expected' o 'confirmed'
 * @param guestCounts - Conteggio ospiti nelle tre modalità
 * @returns Il totale calcolato per questa riga
 */
function calculateLineTotal(
  lineItem: ExpenseLineItem,
  mode: 'planned' | 'expected' | 'confirmed',
  guestCounts: GuestCounts
): number {
  let quantity = 0;
  
  // Calcola la quantità
  if (lineItem.quantity_type === 'fixed') {
    quantity = lineItem.quantity_fixed || 0;
  } else {
    const counts = mode === 'planned' ? guestCounts.planned : 
                   mode === 'expected' ? guestCounts.expected : 
                   guestCounts.confirmed;
    
    // Determina la quantità base
    let baseQuantity = 0;
    switch (lineItem.quantity_type) {
      case 'adults':
        baseQuantity = counts.adults;
        break;
      case 'children':
        baseQuantity = counts.children;
        break;
      case 'staff':
        baseQuantity = counts.staff;
        break;
      case 'total_guests':
        baseQuantity = counts.adults + counts.children + counts.staff;
        break;
    }
    
    // Applica quantity_range (limiti)
    if (lineItem.quantity_range === 'up_to' && lineItem.quantity_limit) {
      quantity = Math.min(baseQuantity, lineItem.quantity_limit);
    } else if (lineItem.quantity_range === 'over' && lineItem.quantity_limit) {
      quantity = Math.max(baseQuantity - lineItem.quantity_limit, 0);
    } else {
      quantity = baseQuantity;
    }
  }
  
  // Calcola il totale con sconto e IVA
  const subtotal = lineItem.unit_price * quantity;
  const afterDiscount = subtotal * (1 - lineItem.discount_percentage / 100);
  // Se il prezzo è già IVA inclusa, non aggiungere l'IVA sopra
  const total = lineItem.price_is_tax_inclusive
    ? afterDiscount
    : afterDiscount * (1 + lineItem.tax_rate / 100);
  
  return total;
}

// ============================================================================
// CALCOLO DURATA (Planned vs Actual)
// ============================================================================
/**
 * Calcola TUTTE le versioni (pianificato, previsto, confermato) di una spesa
 * Utile per mostrare il confronto nell'UI
 * 
 * @param expenseItem - La spesa da calcolare
 * @param lineItems - Le righe di costo associate
 * @param guestCounts - Conteggio ospiti nelle tre modalità
 * @returns Oggetto con importi per tutte e tre le modalità
 */
export function calculateAllModes(
  expenseItem: ExpenseItem,
  lineItems: ExpenseLineItem[],
  guestCounts: GuestCounts
): { planned: number; expected: number; confirmed: number } {
  return {
    planned: calculateExpenseAmount(expenseItem, lineItems, 'planned', guestCounts),
    expected: calculateExpenseAmount(expenseItem, lineItems, 'expected', guestCounts),
    confirmed: calculateExpenseAmount(expenseItem, lineItems, 'confirmed', guestCounts)
  };
}

/**
 * @deprecated Use calculateAllModes instead
 */
export function calculateBothModes(
  expenseItem: ExpenseItem,
  lineItems: ExpenseLineItem[],
  guestCounts: GuestCounts
): { planned: number; actual: number } {
  const all = calculateAllModes(expenseItem, lineItems, guestCounts);
  return {
    planned: all.planned,
    actual: all.confirmed
  };
}

// ============================================================================
// EREDITARIETÀ: RISOLVI GUEST COUNTS (LOCALE vs GLOBALE)
// ============================================================================
/**
 * Implementa la logica di ereditarietà: se l'item ha un valore locale (anche 0), usa quello.
 * Altrimenti eredita dal target globale del wedding.
 * 
 * @param itemCounts - I conteggi locali dell'expense item (possono essere null)
 * @param globalTargets - I target globali del wedding
 * @returns I conteggi risolti da usare per il calcolo
 */
export function resolveGuestCounts(
  itemCounts: { 
    planned_adults?: number | null; 
    planned_children?: number | null; 
    planned_staff?: number | null 
  },
  globalTargets: { adults: number; children: number; staff: number }
): { adults: number; children: number; staff: number } {
  return {
    adults: itemCounts.planned_adults ?? globalTargets.adults,
    children: itemCounts.planned_children ?? globalTargets.children,
    staff: itemCounts.planned_staff ?? globalTargets.staff,
  };
}

// ============================================================================
// UTILITY: FORMATTA VALUTA
// ============================================================================
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

// ============================================================================
// MIGRAZIONE LEGACY: INFERISCE TIPO SPESA DA DATI VECCHI
// ============================================================================
/**
 * Per dati legacy che non hanno expense_type, lo inferisce
 * 
 * @param expenseItem - La spesa legacy
 * @param hasLineItems - Se ha righe di costo associate
 * @returns Il tipo di spesa inferito
 */
export function inferExpenseType(
  expenseItem: Partial<ExpenseItem>,
  hasLineItems: boolean
): 'fixed' | 'variable' | 'mixed' {
  // Se ha expense_type, usalo
  if (expenseItem.expense_type) {
    return expenseItem.expense_type;
  }
  
  // Se ha line_items, è variable
  if (hasLineItems) {
    return 'variable';
  }
  
  // Se ha total_amount o fixed_amount, è fixed
  if (expenseItem.total_amount || expenseItem.fixed_amount) {
    return 'fixed';
  }
  
  // Default: variable
  return 'variable';
}
