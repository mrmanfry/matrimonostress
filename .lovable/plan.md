

# Riprogettazione della Riga di Costo (`ExpenseLineRow`)

## Problemi Attuali

1. **IVA**: Non c'e modo di indicare se il prezzo inserito e IVA inclusa o esclusa. L'utente inserisce il prezzo e poi una percentuale IVA, ma non e chiaro se il prezzo gia include l'IVA.
2. **"Tipo Qta"**: Il select mescola il concetto di "fissa vs variabile" con il dettaglio "adulti/bambini/staff/tutti", risultando confuso. L'utente non capisce al volo cosa scegliere.

## Soluzione

### 1. Prezzo con toggle IVA inclusa/esclusa

Accanto al campo "Prezzo unitario" e al campo "IVA %", aggiungere un toggle compatto (Switch o piccolo bottone) che indica:
- **IVA inclusa**: il prezzo inserito gia contiene l'IVA. Il sistema scorporera l'IVA per calcolare l'imponibile.
- **IVA esclusa** (default): il prezzo e netto, l'IVA viene aggiunta sopra.

Questo richiede un nuovo campo `price_is_tax_inclusive` (boolean, default false) nella tabella `expense_line_items`.

Impatto sul calcolo del totale riga:
- Se IVA esclusa: `prezzo * qta * (1 - sconto%) * (1 + iva%)` (come oggi)
- Se IVA inclusa: `prezzo * qta * (1 - sconto%)` (il prezzo GIA contiene l'IVA, non si aggiunge)

### 2. Quantita semplificata: Fissa vs Variabile

Sostituire il select "Tipo Qta" con un approccio a due livelli:

**Livello 1: Toggle Fissa / Variabile**
- Un select semplice con solo due opzioni: "Fissa" e "Variabile"

**Livello 2 (solo se Variabile): Dettaglio**
- Se "Variabile" selezionato, appare una seconda riga con:
  - Select "Conteggio": Adulti (default), Bambini, Staff, Tutti
  - Select "Scaglione": Tutti (default), Fino a, Oltre
  - Input "Limite" (solo se scaglione e "Fino a" o "Oltre")

Questo separa chiaramente la decisione "e un costo fisso o dipende dagli ospiti?" dalla configurazione di dettaglio.

### 3. Layout Mobile Ripensato

La card mobile avra questa struttura:

- **Riga 1**: Descrizione + Elimina
- **Riga 2**: Prezzo unitario + Qta (fissa o calcolata) + Totale riga
- **Riga 3**: Toggle Fissa/Variabile + (se variabile) Conteggio
- **Riga 4** (se variabile): Scaglione + Limite
- **Riga 5**: IVA % + IVA incl/escl toggle + Sconto %

### 4. Layout Desktop Ripensato

Griglia semplificata:
- Descrizione | Prezzo | Fissa/Var. | Qta | Sconto | IVA + toggle | Totale | Elimina
- Se "Variabile": sotto la riga appare una sotto-riga con Conteggio + Scaglione + Limite

## Modifiche Tecniche

### Migrazione DB
- Aggiungere colonna `price_is_tax_inclusive` (boolean, default false) alla tabella `expense_line_items`

### File: `src/components/vendors/ExpenseLineRow.tsx`
- Aggiungere stato locale per `price_is_tax_inclusive`
- Sostituire il select "Tipo Qta" con select "Fissa/Variabile"
- Aggiungere sotto-riga condizionale per dettagli variabile (conteggio, scaglione, limite)
- Aggiungere Switch/toggle per IVA inclusa/esclusa accanto al campo IVA %
- Aggiornare `getQuantityDisplay()` (nessun cambio logico, solo riorganizzazione UI)
- Aggiornare il calcolo del totale per rispettare `price_is_tax_inclusive`

### File: `src/components/vendors/ExpenseSpreadsheetTab.tsx`
- Aggiornare `calculateLineTotal()` per gestire `price_is_tax_inclusive`
- Aggiornare l'interfaccia `ExpenseLineItem` con il nuovo campo
- Aggiornare `handleAddLineItem()` per includere il default `price_is_tax_inclusive: false`

### File: `src/lib/expenseCalculations.ts`
- Aggiungere `price_is_tax_inclusive` all'interfaccia `ExpenseLineItem`
- Aggiornare `calculateLineTotal()` centralizzato: se `price_is_tax_inclusive` e true, non aggiungere l'IVA sopra il prezzo

### Mappatura dati (nessun campo rimosso)
Il campo `quantity_type` nel DB resta invariato (`fixed`, `adults`, `children`, `staff`, `total_guests`). La UI semplicemente lo presenta in modo diverso:
- Select "Fissa/Variabile" mappa a `fixed` vs tutto il resto
- Select "Conteggio" mappa ai valori `adults`, `children`, `staff`, `total_guests`

