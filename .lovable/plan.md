## Obiettivo
Rendere riconciliabili tutti i numeri della pagina Budget secondo l'invariante:
**Impegnato = Versato + Da Versare** (dove "Da Versare" = somma rate pianificate non pagate + impegni senza rate).

## Modifiche

### 1. `src/lib/budgetAggregates.ts`
- Per ogni `expense_item` calcolare `residuoNonPianificato = max(0, itemTotal − sum(payments.amount))`. Nota: `itemPaid` resta solo somma payments `Pagato`; il residuo rappresenta il delta tra contratto e rate pianificate (pagate o no).
- Aggiungere campo opzionale `synthetic?: boolean` e `itemId?: string` a `UiPayment`.
- Nuova funzione `unplannedCommitments(vendors)`: ritorna un array `{ vendorId, vendorName, itemId, itemDesc, amount }[]` per gli expense_items con residuo > 0. NON entrano in `upcomingPayments` (così la timeline resta basata su rate reali).
- Nuova funzione `unallocatedPaid(paidTotal, contributors)`: ritorna `paidTotal − sum(contributors.paid)` se > 0.

### 2. `src/components/budget/v2/CashflowTimeline.tsx`
- Sotto la lista "Prossimi flussi" aggiungere blocco **"Impegni senza piano di pagamento"** con riga per ogni vendor/item residuo:
  - Nome fornitore (cliccabile → apre `VendorDrawer`)
  - Descrizione item
  - Importo residuo
  - CTA "Pianifica rate" → apre VendorDrawer scrollando alla sezione pagamenti
- Header con totale: "X impegni · totale {fmt}".
- Chiarire label KPI da "Totale futuro" a **"Totale da versare (rate pianificate)"**.

### 3. `src/components/budget/v2/AllocationAndFunds.tsx`
**AllocationCard**:
- Sottotitolo: "Impegnato per categoria".
- Sotto ogni riga categoria, micro-riga: `Versato {fmt(c.paid)} · Da versare {fmt(c.committed − c.paid)}`.

**FundsCard**:
- Aggiungere prop `unallocatedPaid: number` e `onAssignUnallocated?: () => void`.
- Se `unallocatedPaid > 0`, mostrare riga dedicata (stile distinto, grigio neutro) sopra "Totale versato":
  - Avatar `?`
  - Etichetta "Non allocato"
  - Importo in grigio
  - Helper: "Pagamenti pagati senza contributore assegnato — assegna ai fondi"
  - Click → apre dialog/drawer che lista i pagamenti pagati con allocazione incompleta, ognuno con CTA che apre `PaymentAllocationDialog` esistente.

### 4. `src/pages/Budget.tsx`
- Calcolare `unplanned = unplannedCommitments(uiVendors)` e `unalloc = unallocatedPaid(totals.paid, uiContributors)`.
- Passare `unplanned` a `CashflowTimeline`.
- Passare `unallocatedPaid={unalloc}` a `FundsCard` con handler che apre un nuovo `UnallocatedPaymentsDialog`.

### 5. Nuovo file `src/components/budget/v2/UnallocatedPaymentsDialog.tsx`
- Dialog semplice che lista i pagamenti con `status === 'paid'` e `sum(allocations) < amount`.
- Ogni riga ha CTA "Assegna" che apre il `PaymentAllocationDialog` esistente in modalità `edit`.

## Invariante visibile
Dopo le modifiche:
- `Impegnato (Hero)` = `Versato (Hero)` + `Da versare rate (timeline)` + `Impegni senza piano (sotto timeline)`.
- `Versato (Hero)` = `Totale versato (Fondi)` + `Non allocato (Fondi)`.
- `Allocazione categoria` esplicita Versato/Da versare per categoria → niente più confronti errati con totali cross-categoria.

## File toccati
- `src/lib/budgetAggregates.ts`
- `src/components/budget/v2/CashflowTimeline.tsx`
- `src/components/budget/v2/AllocationAndFunds.tsx`
- `src/components/budget/v2/UnallocatedPaymentsDialog.tsx` (nuovo)
- `src/pages/Budget.tsx`
