# Razionalizzazione classificazione ospiti — Fase 1 + Fase 2

Obiettivo: unico modello "1 riga = 1 persona" basato sui flag `is_child`, `is_staff`, `is_couple_member`. Niente più letture/conteggi da `adults_count`/`children_count` nel codice applicativo. Fix immediato per il bug "Adriano e Diletta contati come adulti" in Budget.

## Fase 2 — Libreria centrale (la creo per prima e poi la uso ovunque)

**Nuovo file `src/lib/guestClassification.ts`**

Espone:
- `type GuestClassInput = { is_child?: boolean | null; is_staff?: boolean | null; is_couple_member?: boolean | null; rsvp_status?: string | null }`
- `classifyGuest(g)` → `'adult' | 'child' | 'staff' | 'couple'` (priorità: staff → couple → child → adult)
- `countHeads(guests)` → `{ adults, children, staff, couple, total }` (1 riga = 1 persona, esclude duplicati)
- `countHeadsByRsvp(guests, status)` → stesso shape filtrato per `rsvp_status` (con normalizzazione 'confirmed'/'Confermato')
- `headcountForCatering(g)` → 1 per ogni riga (mai legge `adults_count`/`children_count`)

Unica fonte di verità per qualunque conteggio "teste" lato app.

## Fase 1 — Allineamento codice (sostituisco le letture legacy)

### 1. `src/pages/Budget.tsx` — fix bug Adriano/Diletta
Riscrivo `tally` (righe ~119-145) usando `countHeadsByRsvp` / `classifyGuest`:
- staff → skip (conteggio staff resta dai vendors)
- couple_member → skip (gestito a parte)
- `is_child` → `children += 1`
- altrimenti → `adults += 1`
- Rimuovo qualsiasi `+ g.adults_count` / `+ g.children_count` e i `+1` testuali da `plus_one_name`. I +1 promossi sono già righe separate (`plus_one_of_guest_id`), quindi vengono contati naturalmente.
- Aggiorno la `select` per togliere `adults_count, children_count`.

### 2. `src/hooks/useGuestMetrics.ts`
- `confirmedHeadCount`/`pendingHeadCount`/`declinedHeadCount` non sommano più `adults_count + children_count`: diventano `confirmedGuests.length` ecc. (1 riga = 1 persona, coerente con `adultsCount`/`childrenCount` già calcolati così).
- Tolgo `adults_count, children_count` dalla `select`.

### 3. `src/pages/Dashboard.tsx` (righe 174-248)
Stessa logica: conteggi per testa = numero di righe filtrate per `is_child` e `rsvp_status`, non più somma dei legacy counter. Tolgo i campi dalla `select`.

### 4. `src/pages/VendorDetails.tsx` (righe 114-136)
`children += g.children_count || 0` → `if (g.is_child) children += 1`. Tolgo `children_count` dalla select.

### 5. `src/components/vendors/ExpenseItemTabs.tsx` + `PaymentPlanTab.tsx`
I `reduce((sum, g) => sum + (g.adults_count || 1), 0)` diventano semplici `filter(...).length` basati su `is_child`/`is_staff`/`rsvp_status`. Rimuovo i due campi dalle select.

### 6. UI display — `GuestCard.tsx`, `GuestPool.tsx`, `GuestDiffDialog.tsx`
Le righe "{adults_count} adulti, {children_count} bambini" non hanno più senso (1 riga = 1 persona). Le sostituisco con un singolo badge:
- adulto → "Adulto"
- bambino → "Bambino" (+ eventuale `child_age_group`)
- staff → "Staff"
Mantenuto il behavior per i diff dialog mostrando "Adulto"/"Bambino" sul singolo record.

### 7. Scritture — non scrivere più i campi legacy
In tutti i posti che fanno `insert/update` con `adults_count: 1, children_count: 0` (Guests.tsx, Tables.tsx, Invitations.tsx, CSVImportDialog, SmartImportDialog, CateringExportMenu, GuestDiffDialog) **rimuovo i due campi dal payload**. Il flag `is_child` è già scritto correttamente ovunque.

### 8. `GuestDialog.tsx` — rimozione UI input "N° Adulti / N° Bambini"
Sono campi del modello legacy che non hanno più senso (ogni riga = 1 persona). Li rimuovo dal form, dalla validazione (`validationSchemas.ts`) e dal tipo `GuestFormData`. Resta il toggle "è un bambino" (`is_child`).

### 9. CSV import — `csvHelpers.ts`
Rimuovo le colonne `adults_count`/`children_count` da schema e mapper. Per import legacy che hanno `children_count > 0` su una sola riga, aggiungo una nota nel parser: vengono ignorate (con eventuale warning). L'import "party-first" già crea N righe.

### 10. `pdfHelpers.ts`
Tolgo i due campi dal tipo e dalle eventuali colonne stampate; il PDF mostra una riga per persona con il badge categoria.

## Cosa NON faccio in questa fase
- **Fase 3 (drop colonne DB)**: rimando. Le colonne `adults_count`/`children_count` restano in DB con i default attuali per non rompere dati legacy. Nessuna migrazione SQL in questo intervento. `src/integrations/supabase/types.ts` resta intatto (è autogenerato).
- Nessun cambio a edge functions, RSVP handler, accommodation o catering settings.

## File toccati (riepilogo)
Nuovo: `src/lib/guestClassification.ts`
Modificati: `Budget.tsx`, `Dashboard.tsx`, `VendorDetails.tsx`, `Guests.tsx`, `Tables.tsx`, `Invitations.tsx`, `useGuestMetrics.ts`, `validationSchemas.ts`, `csvHelpers.ts`, `pdfHelpers.ts`, `GuestDialog.tsx`, `GuestCard.tsx`, `GuestDiffDialog.tsx`, `CSVImportDialog.tsx`, `SmartImportDialog.tsx`, `CateringExportMenu.tsx`, `vendors/ExpenseItemTabs.tsx`, `vendors/PaymentPlanTab.tsx`, `tables/GuestPool.tsx`.

## Verifica post-implementazione
1. Budget → confermati: Adriano e Diletta finiscono in "Bambini", il totale `adulti + bambini` resta invariato.
2. Dashboard KPI ospiti: numeri coerenti con `useGuestMetrics`.
3. Catering/Vendors: i conteggi adulti/bambini per pasti riflettono i flag.
4. Form ospite: niente più input adulti/bambini, solo toggle "bambino".
