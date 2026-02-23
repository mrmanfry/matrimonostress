
# Allineamento Formula "Previsti" in Tutto il Programma

## Problema Identificato

Esistono **3 componenti** che calcolano gli ospiti "Previsti" con una formula semplificata e sbagliata (`!isDeclined(rsvp_status)` = "tutti i non-rifiutati"), invece di usare la formula canonica `calculateExpectedCounts()` che considera:

- Risposte Save the Date (likely_yes, unsure, no response -- esclude likely_no)
- Eredita stato STD dal nucleo familiare (party)
- Accompagnatori (+1) confermati e potenziali
- Staff dai fornitori (`staff_meals_count`)

### Mappa delle discrepanze

| Componente | Formula usata | Corretta? |
|---|---|---|
| `BudgetLegacy.tsx` (KPI cards) | `calculateExpectedCounts()` | Si |
| `Treasury.tsx` | `calculateExpectedCounts()` | Si |
| `Vendors.tsx` (lista) | `calculateExpectedCounts()` | Si |
| `VendorExpensesWidget.tsx` | `calculateExpectedCounts()` | Si |
| `ExpenseItemsManager.tsx` | `calculateExpectedCounts()` | Si |
| **`BudgetSpreadsheet.tsx`** | `!isDeclined()` | **NO** |
| **`SmartGrouperWizard.tsx`** | `!isDeclined()` | **NO** |
| **`ExpenseSpreadsheetTab.tsx`** | `invite_parties` con status "Confermato" | **NO** (nessuna modalita "expected") |

## Piano di Intervento

### 1. `BudgetSpreadsheet.tsx` -- Priorita massima (causa la discrepanza KPI vs spreadsheet)

- Importare `calculateExpectedCounts` e `calculateTotalVendorStaff` da `expectedCalculator.ts`
- Ampliare la query `guests` per includere i campi necessari: `save_the_date_sent_at`, `std_response`, `party_id`, `phone`, `allow_plus_one`, `plus_one_name`, `is_couple_member`
- Aggiungere query `vendors` per `staff_meals_count`
- Sostituire le righe 137-139 (il calcolo `!isDeclined`) con una chiamata a `calculateExpectedCounts()`
- Usare i risultati (`adults`, `children`, `staff`) per popolare `guestCounts.expected`

### 2. `SmartGrouperWizard.tsx` -- Allineamento tavoli

- Importare `calculateExpectedCounts` e `calculateTotalVendorStaff`
- Caricare i dati guests completi (STD, party, +1) e vendors (`staff_meals_count`)
- Sostituire `guests.filter(g => !isDeclined(g.rsvp_status))` con il risultato di `calculateExpectedCounts()` per il conteggio
- Per il filtraggio effettivo degli ospiti da assegnare ai tavoli, mantenere la logica attuale (serve la lista di oggetti Guest, non solo i conteggi)

### 3. `ExpenseSpreadsheetTab.tsx` -- Allineamento editor spese

- Aggiungere il supporto per la modalita "expected" (attualmente ha solo "planned"/"actual")
- Caricare i dati guests completi e vendors per calcolare `calculateExpectedCounts()`
- Usare i conteggi expected per il calcolo dei totali delle righe di costo variabile

### Risultato atteso

Dopo queste modifiche, la formula dei "Previsti" sara identica ovunque nel programma: **stessi ospiti contati, stesso totale finanziario**, dalla KPI card al foglio di calcolo, dalla tesoreria ai tavoli.
