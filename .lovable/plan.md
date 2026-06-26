## Diagnosi

L'editor inline e il flusso di creazione hanno divergenze:

- Creazione (`ExpenseWizard.tsx`): per ogni tipo (Fisso, Per persona, Per fasce) chiede importo + **IVA %** + **Modalità IVA (inclusa/da aggiungere)**.
- Edit inline (`VendorDetails.tsx` `ExpensesList`): chiede solo l'importo, nessuna IVA. Per "Per fasce" delega al dialog `EditAudiencePricesDialog` che ha layout, header e selettore di modalità ridondanti rispetto all'editor inline.

## Obiettivo

Un'unica UX di editing inline, identica per struttura a quella di creazione, con i tre tipi gestiti inline nello stesso pannello — niente dialog secondari, niente toggle "audience/fixed" duplicato.

## Cambiamenti

### 1. Riuso dei componenti della creazione

In `src/components/vendors/v2/ExpenseWizard.tsx`:
- Esportare `AudienceEditor` e `Money` (helper input prezzo) così possono essere riusati dall'editor inline.

### 2. Editor inline in `VendorDetails.tsx` (`ExpensesList`)

Estendere lo stato draft:
- `draftType: 'fixed' | 'per_person' | 'per_audience'`
- `draftAmount` (importo netto/lordo a seconda della modalità IVA, per Fisso e Per persona)
- `draftTaxRate: number` (default dalla spesa esistente o 22)
- `draftTaxInclusive: boolean` (default da `amount_is_tax_inclusive` esistente o true)
- `draftAudience: AudienceMap` (per "Per fasce", inizializzato dai line items esistenti tramite `buildDraft` — esportato da `EditAudiencePricesDialog` o duplicato lì se più rapido)

UI inline, identica al wizard:

```text
[ Descrizione ]
TIPO PREZZO  ( Fisso ) ( Per persona ) ( Per fasce )

— se Fisso/Per persona —
[ Importo € ]  [ IVA % ]  [ Modalità IVA: Inclusa nel prezzo ▾ ]
"Totale (IVA inclusa): X €"  + (per Per persona) "ricalcolato sugli invitati"

— se Per fasce —
<AudienceEditor ... />   (stesso componente del wizard, inline, senza dialog)

[Annulla] [Salva]
```

### 3. Salvataggio unificato

Sostituire la logica attuale di `saveEdit` con un unico path che riflette `handleSaveExpense` della creazione:

- **Fisso**: calcolare `grossTotal = inclusive ? amount : amount * (1 + tax/100)`. Patch su `expense_items`: `{ expense_type: 'fixed', total_amount: grossTotal, fixed_amount: grossTotal, estimated_amount: grossTotal, tax_rate, amount_is_tax_inclusive: true }`. Eliminare eventuali `expense_line_items` precedenti.
- **Per persona**: stessa formula sul prezzo unitario per ottenere `unitGross`. Patch: `{ expense_type: 'variable', estimated_amount: unitGross, tax_rate, amount_is_tax_inclusive: true }`. Eliminare eventuali `expense_line_items`.
- **Per fasce**: cancellare e reinserire `expense_line_items` (replica della logica in `EditAudiencePricesDialog.handleSave`). Patch `expense_items` con `{ expense_type: 'variable' }` e azzerare `fixed_amount`.

Estendere la firma di `updateExpenseItem` per accettare i nuovi campi (`tax_rate`, `amount_is_tax_inclusive`) e un'opzione `replaceLineItems?: LineItemRow[]` che, se presente, cancella e reinserisce in transazione lato client.

### 4. Rimozione del path che apre il dialog dall'edit

- In `ExpensesList`, rimuovere il branch che apre `EditAudiencePricesDialog` quando si clicca "Modifica" su una spesa per fasce (riga ~1153). Tutto avviene inline.
- Il dialog `EditAudiencePricesDialog` resta in codice ma non più richiamato dall'edit inline (può restare usato altrove o essere rimosso in un cleanup futuro — non lo tocchiamo ora per evitare regressioni).

### 5. Init dei draft

`startEdit` deve precaricare:
- `draftType` dal `expense_type` corrente + presenza di line items.
- `draftAmount`: per Fisso → `total_amount`; per Per persona → `estimated_amount`.
- `draftTaxRate` e `draftTaxInclusive` da `it.tax_rate` e `it.amount_is_tax_inclusive` (da aggiungere alla SELECT della query di `expense_items` se non già presenti — verifico).
- `draftAudience` dai line items esistenti.

## File toccati

- `src/components/vendors/v2/ExpenseWizard.tsx` — export `AudienceEditor`, `Money`.
- `src/components/vendors/v2/EditAudiencePricesDialog.tsx` — export `buildDraft` helper (riuso) oppure duplica localmente.
- `src/pages/VendorDetails.tsx` — refactor stato + render + save dell'editor inline; query: includere `tax_rate, amount_is_tax_inclusive` nella SELECT di `expense_items` se mancano; estendere `updateExpenseItem` per scrivere tax fields e rimpiazzare line items.

Nessuna modifica al DB.
