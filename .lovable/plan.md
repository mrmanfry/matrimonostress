# Piano di intervento — Budget, Fornitori, Pernotto

Raggruppo le 11 osservazioni in 5 aree di lavoro. Tutte UI/presentazione: la logica di calcolo (`calculateExpenseAmount`, sync pernotto, ecc.) resta invariata.

---

## 1. Budget (`/app/budget`) — riportare l'azione "Nuova Spesa"

**Problemi:** non si può creare una spesa dal Budget; "Orizzonte liquidità" è poco leggibile.

- Aggiungere CTA **"+ Nuova spesa"** in `Budget.tsx` (header + stato vuoto), che apre `ExpenseItemDialog` con `vendor_id` opzionale.
- Permettere creazione spesa **senza fornitore** (categoria obbligatoria, fornitore opzionale → assegnabile dopo).
- Redesign **`CashflowTimeline`**:
  - Sostituire le barre verticali attuali con un **grafico a gradini cumulativo** (esborso progressivo) + barre mensili sotto, con tooltip che mostra fornitori/importi del mese.
  - KPI in alto: mese più intenso, prossimo pagamento, totale residuo.
  - Lista flussi sotto, ogni riga cliccabile → apre VendorDrawer + azione "Segna come pagato".

---

## 2. Fornitori — categorie e contatti catering

**Problemi:** non si può creare una nuova categoria dal `VendorDialog`; manca il campo "persone del fornitore da contare nel catering".

- In `VendorDialog`, nel Select categoria aggiungere voce **"+ Crea nuova categoria…"** che apre inline un mini-prompt (input + Salva) e la inserisce in `expense_categories` per il wedding corrente, selezionandola.
- Reintrodurre nella scheda fornitore (sezione Anagrafica/Catering) il campo **`staff_count`** (n° persone del fornitore da includere nel catering) — già esistente nella logica staff meals, va riesposto in UI.

---

## 3. Spese — pricing per audience, IVA, fixed vs variable

**Problemi:** la spesa "a persona" non distingue adulti/bambini/staff; modificando una spesa variabile si vede solo il totale; manca toggle IVA.

- In `ExpenseItemDialog` (e relativo editor in scheda fornitore):
  - **Tipo spesa**: toggle `Fissa` / `Variabile (a persona)`.
  - Se **Variabile**: mostrare 3 righe **prezzo unitario** per `Adulti`, `Bambini`, `Staff` (mappate su `expense_line_items` con `quantity_type`). Il totale viene calcolato (read-only) usando `calculateExpenseAmount()` — nessun cambio logica.
  - Se **Fissa**: importo unico.
- **Toggle IVA** per ogni riga/spesa: `Prezzo IVA inclusa` ↔ `Prezzo + IVA` con campo aliquota (default 22, modificabile). Si appoggia ai campi già esistenti `tax_rate` e `amount_is_tax_inclusive` / `price_is_tax_inclusive`.
- In modifica spesa variabile dalla scheda fornitore: mostrare la **vista per-persona** invece del totalone.

---

## 4. Piano pagamenti — campi completi e schema rate flessibile

**Problemi:** mancano data/chi-ha-pagato; schema rate troppo rigido; in modifica si cambia solo la cifra.

- In `PaymentDialog` / `PaymentPlanTab`, sia in **creazione** che **modifica** rata, esporre:
  - **Data scadenza** (date picker, già nel data model `due_date`).
  - **Chi paga** (Select da `financial_contributors`, campo `paid_by` già presente).
  - **Stato + data pagato**.
  - Importo (€) o % della spesa.
  - Toggle IVA per riga (eredita dalla spesa).
- **Schema rate** nel wizard piano:
  - `Pagamento unico`
  - `Acconto X% + Saldo` (X configurabile, default 50)
  - `N rate uguali` (N libero)
  - **`Personalizzato`**: aggiungo le rate manualmente; opzione **"Saldo finale automatico"** che calcola la differenza tra (totale spesa) − (somma rate esplicite).
- In modifica rata: **tutti i campi** editabili, non solo l'importo.

---

## 5. Scheda fornitore — UI contratti/appuntamenti + flag struttura ricettiva

**Problemi:** UI contratti/appuntamenti vecchia rispetto a Spese; manca flag pernotto.

- Riallineare `ContractWidgets` e la sezione appuntamenti in `VendorDetails.tsx` allo stile **`ExpenseItemTabs` / `PaymentPlanTab`**:
  - stesso pattern card/tabella, stessi bottoni, stesso spacing, stesso "View/Edit" mode.
- In `VendorDialog`, aggiungere checkbox **"Struttura ricettiva / fornisce camere"** (mappa su `is_accommodation` o equivalente già presente in memoria pernotto):
  - se ON → il fornitore appare in `/app/accommodation` con possibilità di aggiungere camere.
  - In scheda fornitore, sezione Spese: **importo bloccato** (read-only) con messaggio _"Il prezzo è gestito dalle camere inserite in Pernotto"_ + link diretto.
  - **Piano pagamenti** resta editabile (sulla cifra totale sincronizzata da `syncAccommodationExpense`).

---

## Ordine di implementazione consigliato

1. **Budget**: CTA nuova spesa + redesign CashflowTimeline (impatto immediato).
2. **ExpenseItemDialog**: pricing per audience + IVA toggle (sblocca casi catering).
3. **PaymentDialog/Plan**: campi completi + schemi rate flessibili.
4. **VendorDialog**: nuova categoria inline + staff catering + flag ricettivo.
5. **VendorDetails**: redesign contratti/appuntamenti + lock prezzo accommodation.

## Note tecniche

- Nessuna migration DB: tutti i campi esistono già (`tax_rate`, `amount_is_tax_inclusive`, `price_is_tax_inclusive`, `paid_by`, `due_date`, `expense_line_items` con `quantity_type`).
- Rispettare la regola: tutti i totali devono passare da `calculateExpenseAmount()` (memory: Centralized Calculation Library).
- Per la categoria inline: insert su `expense_categories` filtrato per `weddingId`.
- Per la flag ricettiva: usare il pattern `is_accommodation OR has accommodation_rooms` (memory: Accommodation Resilient Fetch).
