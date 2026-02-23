
# Ridisegno Widget Budget Dashboard: Focus su Impegno, Pagato, Da Pagare

## Concetto

L'utente ha ragione: il budget target e' un obiettivo teorico, ma cio' che conta davvero e' il ciclo operativo **Impegno Totale -> Pagato -> Da Pagare**. Il widget va ridisegnato per mettere al centro questi 3 numeri, con il budget target come riferimento secondario.

## Nuovo Layout del Widget

```text
+------------------------------------------+
| [Euro] Finanze                           |
|                                          |
|        €31.885                           |
|     Impegno Totale                       |
|                                          |
| [====verde====|====arancio====]  barra   |
|                                          |
|  Pagato         Da Pagare                |
|  €12.500        €19.385                  |
|  (verde)        (arancio)                |
|                                          |
|  ---- linea sottile ----                 |
|  Budget target: €30.000                  |
|  Liquidita' rimanente: -€1.885           |
+------------------------------------------+
```

## Logica Dati (Allineamento con Treasury)

Attualmente (riga 134) il calcolo e' una somma grezza di `payments.amount`. Questo e' corretto per "Pagato" e "Da Pagare", ma l'**Impegno Totale** dovrebbe venire dalla somma degli expense items calcolati con la logica centralizzata (`calculateExpenseAmount`), come fa Treasury.

### Modifiche al data loading (`loadDashboardData`)

1. **Nuovi import**: `calculateExpenseAmount`, `resolveGuestCounts`, `inferExpenseType` da `@/lib/expenseCalculations`, piu' `calculateExpectedCounts`, `calculateTotalVendorStaff` da `@/lib/expectedCalculator`

2. **Query aggiuntive** nel `Promise.all` esistente:
   - `expense_items` con tutti i campi (expense_type, fixed_amount, estimated_amount, planned_adults/children/staff, tax_rate, amount_is_tax_inclusive, vendor_id, category_id)
   - `expense_line_items` (tutti per il wedding, join su expense_item_id)
   - `vendors` con `staff_meals_count`
   - `calculation_mode` dal wedding

3. **Calcolo guest counts** (come in Treasury):
   - Costruire `guestCounts` con planned (da wedding targets), expected (da `calculateExpectedCounts`), confirmed (da RSVP confermati)
   - Leggere `globalMode` da `weddingData.calculation_mode || 'planned'`

4. **Calcolo Impegno Totale**: somma di `calculateExpenseAmount(item, lineItems, globalMode, guestCounts)` per ogni expense item (identico a Treasury)

5. **Pagato** e **Da Pagare**: restano calcolati dai payments (corretto), ma con la logica IVA dei payments (`tax_inclusive`, `tax_rate`)

### Modifiche al rendering (righe 368-436)

1. **Hero number**: Impegno Totale grande e centrato (`text-3xl font-bold`)
2. **Barra di progresso**: segmentata Pagato (verde) + Da Pagare (arancione) su sfondo del totale impegno
3. **Due KPI sotto la barra**: Pagato (verde, link a Treasury) e Da Pagare (arancione, link a Treasury)
4. **Riga secondaria**: "Budget target: €X | Rimanente: €Y" in testo piccolo come riferimento

### File coinvolto

Solo `src/pages/Dashboard.tsx` - nessuna modifica al DB.
