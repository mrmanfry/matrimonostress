## Problema

Nell'editor inline di una voce di spesa in `VendorDetails.tsx`, quando la voce è marcata come `variable` senza line items, viene forzato un input "Prezzo a persona €" senza dare all'utente la possibilità di scegliere il tipo di prezzo. Risultato: una voce "Fiori" (tipicamente fissa) viene editata come prezzo a persona e mostra "Totale ora: 0 € · si ricalcola sugli invitati".

## Soluzione

Aggiungere un selettore "Tipo prezzo" in cima all'editor inline con 3 opzioni, allineate a quelle già usate altrove (es. `EditAudiencePricesDialog`):

1. **Fisso** — un importo unico (`expense_type = 'fixed'`, `fixed_amount`/`total_amount`).
2. **Per persona** — prezzo unitario × invitati (`expense_type = 'variable'`, `estimated_amount` come unitario, nessun line item).
3. **Per fasce (Adulti/Bambini/Staff)** — apre `EditAudiencePricesDialog` esistente (line items per audience).

### UI

```text
[ Descrizione ......................... ]
Tipo prezzo: ( • Fisso ) ( Per persona ) ( Per fasce )
[ Importo € .............. ]          ← cambia label/placeholder in base al tipo
Totale ora: X € · ...                  ← solo se "Per persona"
                          [Annulla] [Salva]
```

Se l'utente sceglie "Per fasce" viene chiuso l'editor inline e aperto il dialog dedicato (`onEditAudience(it.id)`), come già accade oggi quando ci sono line items.

### Comportamento al salvataggio

In `saveEdit(it)` (riga 945 ca.) ramificare sul tipo selezionato:

- **Fisso**: patch `{ expense_type: 'fixed', fixed_amount: N, total_amount: N, estimated_amount: N }`. Se la voce era variabile con line items, eliminarli (chiamata esistente o nuovo helper) prima del patch.
- **Per persona**: patch `{ expense_type: 'variable', estimated_amount: unit }` (nessuna modifica al totale, calcolato a runtime). Se aveva line items, eliminarli.
- **Per fasce**: nessun salvataggio inline, si delega al dialog.

### Inizializzazione

All'apertura (`startEdit`), pre-popolare il tipo:
- `fixed` o assente → "Fisso"
- `variable` con line items → "Per fasce"
- `variable` senza line items → "Per persona"

## File toccati

- `src/pages/VendorDetails.tsx` — unico file: nuovo stato `draftPriceType`, blocco di selezione (3 chip/radio), refactor del rendering input e di `saveEdit`. Conversione line items → riuso del pattern già presente in `EditAudiencePricesDialog` (delete dei line items dell'expense item quando si passa a fixed/per-persona).

Nessuna modifica al DB o ad altri componenti.
