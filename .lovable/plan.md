# Allineamento Fornitori ↔ Budget + Selettore Scenario

## Il problema

Nella card di "International Catering" la pagina **Fornitori** mostra `1.890 € previsti` (3.550 € / 1.890 €), ma il Budget mostra valori diversi.

Causa: `src/pages/Vendors.tsx` usa `vendorTotals()` (in `src/lib/vendorAggregates.ts`) che calcola il "committed" con `expenseItemTotal()` — una formula semplificata che:
- somma `unit_price × quantity_fixed` ignorando `quantity_type` (`adults`, `children`, `total_guests`, `staff`),
- ignora IVA (`tax_rate`, `price_is_tax_inclusive`),
- non considera lo scenario (pianificati / lista invitati / confermati).

Il Budget invece usa `calculateExpenseAmount()` (`src/lib/expenseCalculations.ts`) — fonte unica di verità per memoria di progetto — che applica scenario, IVA e quantità per ospite. Da qui la divergenza.

In più la pagina Fornitori non ha il selettore di scenario, quindi i costi non si aggiornano in base al numero di invitati confermati/attesi.

## Cosa cambia

### 1. Selettore di scenario nella pagina Fornitori
- Riusare `ScenarioSelector` e `ScenarioHeadcountBar` già presenti nel Budget (`src/components/budget/v2/`).
- Posizionarli nell'header di `src/pages/Vendors.tsx`, sotto il titolo e prima dei filtri.
- Tre modalità: **Pianificati**, **Lista invitati**, **Confermati** (stessa label e logica del Budget).
- Persistere la scelta sullo stesso storage usato dal Budget (per condividere lo stato fra le due pagine).

### 2. Calcolo totali fornitore basato sullo scenario
- Caricare in `Vendors.tsx` gli stessi dati che usa Budget: `guestCounts` (planned/expected/confirmed) tramite l'hook/handler oggi usato in `Budget.tsx`.
- Sostituire `vendorTotals()` con un wrapper che usa `calculateExpenseAmount(item, lineItems, mode, guestCounts)` per ogni `expense_item` del fornitore, sommando i risultati.
- Mantenere il calcolo di `paid` invariato (somma `payments` con status pagato).
- Aggiornare l'etichetta sulla card: invece di un fisso "previsti", mostrare la modalità attiva ("pianificati", "lista invitati", "confermati") e nasconderla quando il fornitore non ha spese variabili.

### 3. File toccati
- `src/pages/Vendors.tsx` — header con selettore + headcount bar, caricamento `guestCounts`, passaggio `mode` ai calcoli.
- `src/lib/vendorAggregates.ts` — nuova funzione `vendorTotalsScenario(items, lineItemsMap, payments, mode, guestCounts)` che delega a `calculateExpenseAmount`. La vecchia `vendorTotals` resta per retrocompatibilità ma non viene più usata dalla pagina.
- Nessuna modifica a DB o a `Budget.tsx`.

## Risultato atteso
- I totali nella card "International Catering" coincidono con quelli del Budget per la stessa modalità.
- Cambiando scenario in Fornitori (o in Budget) i costi previsti dei fornitori si aggiornano coerentemente.
- Nessun impatto su pagamenti, stato fornitore o altri flussi.
