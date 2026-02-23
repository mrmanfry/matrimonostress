

# Semplificazione Budget: Eliminare la colonna "Stimato"

## Il Problema Attuale

Oggi il budget ha due colonne separate: "Stimato" e "Effettivo".
- Quando aggiungi una voce placeholder (senza fornitore), l'importo finisce in "Stimato" (`estimated_amount`)
- La colonna "Effettivo" resta a zero finche non assegni un fornitore e confermi il contratto (`fixed_amount`)
- Il totale generale degli "Effettivi" NON include le voci placeholder, rendendo il totale ingannevole e confusionario

## La Soluzione

Eliminare la colonna "Stimato" e far confluire TUTTO in un'unica colonna "Importo". Quando aggiungi una voce di budget, il suo importo va subito nel calcolo totale -- che abbia un fornitore assegnato o meno.

## Modifiche Tecniche

### 1. `AddBudgetItemDialog.tsx` -- Salvare in `fixed_amount` invece di `estimated_amount`

Quando si crea una nuova voce di budget:
- Per tipo "fixed": salvare l'importo in `fixed_amount` (non piu in `estimated_amount`)
- Per tipo "variable": nessun cambiamento (il totale viene gia dalle `expense_line_items`)
- Il campo `estimated_amount` diventa un semplice "memo" storico, non influenza piu i calcoli

### 2. `BudgetSpreadsheet.tsx` -- Rimuovere la colonna "Stimato"

- Rimuovere la colonna "Stimato" dall'header della tabella (6 colonne diventano 5)
- Rimuovere la cella con l'input inline per `estimated_amount` nelle righe
- Rimuovere `totalEstimated` e `grandTotals.estimated` dai totali di categoria e generali
- L'importo di ogni voce (placeholder o meno) appare nella colonna "Importo" (ex "Effettivo")
- Le voci placeholder restano cliccabili con il pulsante "Da assegnare"
- Le voci placeholder senza importo mostrano un trattino nella colonna Importo
- Rimuovere la mutation `updateEstimate` (non serve piu l'editing inline dello stimato)
- Rinominare la colonna "Effettivo" in "Importo" per chiarezza (dato che ora include anche i preventivi)

### 3. `AssignVendorDialog.tsx` -- Adattare il flusso Quote-to-Contract

Attualmente il dialog mostra uno step 2 di "conferma contratto" SOLO se `estimated_amount != null && fixed_amount == null`. Con la nuova logica:
- L'item avra gia `fixed_amount` impostato dal budget
- Lo step 2 mostra comunque l'importo corrente come riferimento e permette di modificarlo
- La condizione `needsContractConfirmation` cambia: si attiva quando `vendor_id` e null (placeholder), indipendentemente dai campi amount
- Il dialog pre-popola con `fixed_amount` invece di `estimated_amount`

### 4. `BudgetRowData` interface -- Semplificazione

- Rimuovere il campo `estimated` dalla interface `BudgetRowData`
- Rimuovere `totalEstimated` dalla interface `CategoryGroup`
- Il campo `actual` diventa l'unica colonna importo (calcolata come oggi da `calculateExpenseAmount`)

### 5. Impatto sui calcoli

- `calculateExpenseAmount()` gia usa `fixed_amount` come fonte primaria per le spese "fixed": nessuna modifica necessaria
- Il fallback `estimated_amount` nella libreria di calcolo (`fixed_amount ?? estimated_amount ?? 0`) continua a funzionare per dati legacy

## Risultato

- Una sola colonna importo: piu chiara, zero confusione
- Ogni voce contribuisce al totale, che abbia un fornitore o meno
- Il flusso "aggiungi placeholder -> assegna fornitore -> conferma importo" resta intatto ma piu lineare
- KPI e spreadsheet mostreranno sempre lo stesso totale

