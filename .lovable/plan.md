# Fix modifica spesa "vuota" + alert piano pagamenti > totale

## Problema
1. Cliccando "Modifica" su una spesa come *Extra time* di International Catering, la scheda **📊 Foglio di Calcolo** mostra 0€: la spesa è "fissa" (ha `total_amount` ma nessuna riga di costo) e la tab attualmente gestisce solo `expense_line_items`. Il valore attuale del contratto non è né visibile né modificabile lì.
2. Nel **💳 Piano di Pagamento** non c'è alcun controllo se la somma delle rate schedulate (IVA inclusa) supera il totale della spesa: i totali finiscono per non tornare senza che l'utente se ne accorga.

## Soluzione

### 1. Editor "Importo Fisso Contratto" in `ExpenseSpreadsheetTab`
Aggiungere, sopra la "Tabella Righe di Costo", una nuova card **"Importo Contratto (spesa fissa)"** che carica e permette di modificare i campi già presenti su `expense_items`:

- `total_amount` (input €, IVA inclusa per default coerentemente con la memoria progetto)
- `amount_is_tax_inclusive` (radio Inclusa/Esclusa)
- `tax_rate` (input %)

Comportamento:
- All'apertura, i valori sono precompilati con quelli in DB (niente più 0€).
- Salvataggio inline con pulsante *Salva importo* → `UPDATE expense_items SET total_amount, amount_is_tax_inclusive, tax_rate`.
- Riepilogo Imponibile / IVA / Totale identico a quello di `ExpenseItemDialog` (riuso della stessa formula).
- Se la spesa ha già righe di costo, la card mostra un hint: *"Questa spesa ha righe di costo variabili: l'importo fisso viene sommato ad esse solo se il tipo è misto."* e resta comunque modificabile.

Il calcolo totale (`calculateTotals` / `onTotalsUpdate`) deve considerare anche `total_amount` quando `expense_type` è `fixed` o `mixed`, in linea con `calculateExpenseAmount` della libreria centralizzata. Attualmente somma solo le righe → per questo la spesa "extra time" appariva 0.

Estendere l'interfaccia `ExpenseItem` locale con `total_amount`, `amount_is_tax_inclusive`, `tax_rate`, `expense_type`, `fixed_amount` e caricarli in `loadExpenseItem` di `ExpenseItemTabs.tsx`.

### 2. Alert "Piano pagamenti eccede il totale" in `PaymentPlanTab`
Nel riepilogo del piano pagamenti (dove oggi si mostrano *Totale schedulato* / *Da schedulare*), aggiungere:

- Calcolo `scheduledTotal` = somma di tutte le rate esistenti convertite in IVA inclusa (fixed → `amount`; percentage → `activeTotal * pct/100`; balance → residuo). La logica esiste già frammentata in `ExpenseItemsManager.calculateTotalScheduledPayments` → estrarla in una utility o replicarla.
- Se `scheduledTotal > activeTotal * 1.001` (tolleranza 0,1% per arrotondamenti):
  - Mostrare `<Alert variant="destructive">` sopra la lista rate: *"⚠️ Le rate schedulate (€ X) superano il totale della spesa (€ Y) di € Z. Verifica gli importi o aggiorna il totale del contratto."*
  - Mostrare stesso warning inline anche nel form di creazione/modifica rata quando l'aggiunta farebbe sforare (calcolo preview).

Nessuna modifica DB. Nessun blocco duro: l'utente resta libero di salvare (potrebbe essere voluto), ma è avvisato.

## File da modificare
- `src/components/vendors/ExpenseItemTabs.tsx` — estendere `ExpenseItem` con i campi contratto e ricaricarli.
- `src/components/vendors/ExpenseSpreadsheetTab.tsx` — nuova card "Importo Contratto" + inclusione nel `calculateTotals`.
- `src/components/vendors/PaymentPlanTab.tsx` — alert overflow scheduled vs activeTotal.

Nessuna migrazione database.
