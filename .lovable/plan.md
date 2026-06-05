## Problema

Nella scheda fornitore (es. International Catering) il "Saldo finale del 15 luglio 2026" mostra `17.790 €`. Questo valore è stato calcolato e **congelato nel campo `payments.amount`** mesi fa, quando lo scenario/prezzo era diverso. Oggi il prezzo previsto sul fornitore vale `12.594 €` (scenario "Confermati"), quindi il saldo dovrebbe essere ricalcolato live come:

```
saldo_dinamico = max(0, prezzo_previsto(scenario_attivo) − somma(altri pagamenti non-balance dello stesso item))
```

Lo schema lo prevede già (`payments.amount_type = 'balance' | 'percentage' | 'fixed'`, `balance_base`, `percentage_base`), ma viene usato **solo nell'editor del Piano di Pagamento**. Tutto il resto dell'app (timeline cashflow, KPI "Da pagare residuo", chip "Rate > prezzo previsto", `PaymentDialog`) legge `payments.amount` grezzo → valore statico.

## Soluzione

Spostare il calcolo del valore "balance" e "percentage" dal momento del salvataggio al **momento del rendering**, dentro `budgetAggregates.buildVendors`. Il valore stored resta come fallback/snapshot ma viene sovrascritto in lettura.

### 1. `src/lib/budgetAggregates.ts`

- Estendere `DbPayment` con i campi già selezionati dal `select('*')`:
  ```ts
  amount_type?: 'fixed' | 'percentage' | 'balance' | null;
  percentage_value?: number | null;
  balance_base?: 'planned' | 'actual' | null;
  percentage_base?: 'planned' | 'actual' | null;
  ```
- In `computeTotals`, per ogni item:
  1. Calcolare `itemTotal` come oggi (`calculateExpenseAmount` con lo scenario attivo).
  2. **Primo passaggio**: sommare i pagamenti `fixed` (cash effettivo) e calcolare i `percentage` come `itemTotal * pct/100`.
  3. **Secondo passaggio**: distribuire il residuo `max(0, itemTotal − somma_step_1)` sui pagamenti `balance` (split equo se più di uno, raro).
  4. Per i pagamenti `Pagato`, **non sovrascrivere mai** il valore storico (è cash reale uscito) — la dinamica vale solo per `Da Pagare`.
  5. Emettere `UiPayment.amount` con il valore effettivo (dinamico per balance/percentage non pagati, storico per gli altri).
- Aggiungere un flag `isDynamic: boolean` su `UiPayment` per la UI.
- `itemScheduled` resta `somma(uiPayments.amount)` → rimane coerente con la timeline.

### 2. `src/components/budget/v2/CashflowTimeline.tsx`

- Mostrare un piccolo badge "Saldo dinamico" accanto alla descrizione quando `p.isDynamic === true`, con tooltip:
  > Ricalcolato automaticamente sullo scenario attivo: prezzo previsto − acconti già pianificati.

### 3. `src/components/budget/PaymentDialog.tsx` e `PaymentPlanTab.tsx`

- Quando si apre per modificare un pagamento `balance`/`percentage` non pagato, mostrare il **valore dinamico corrente** (già fatto in PaymentPlanTab editor) ma aggiungere una nota di sola visualizzazione nella card del piano: «Importo calcolato live, non c'è un valore congelato da salvare». Nessuna scrittura su DB in lettura.
- Quando l'utente segna come "Pagato" un saldo dinamico → **materializzare** il valore corrente nel campo `amount` (snapshot del cash reale) così non cambia più retroattivamente.

### 4. Nessuna migrazione DB

Lo schema ha già tutte le colonne necessarie. Non tocchiamo i valori storici già pagati.

## Comportamento risultante sul caso International Catering

- Prezzo previsto (scenario Confermati): `12.594 €`
- Acconto già pagato: `X €` (es. `0` se tutto futuro)
- Altre rate non-balance pianificate: `Y €`
- Saldo dinamico 15 lug 2026: `max(0, 12.594 − X − Y)` invece dei `17.790 €` statici
- Se cambio scenario a "Lista invitati" o "Pianificato" → il saldo si aggiorna automaticamente
- Se ho già anticipato più del prezzo previsto → saldo `= 0 €` con piccolo hint "Tutto coperto, eventuale eccedenza visibile sul KPI Da pagare residuo"

## File toccati

- `src/lib/budgetAggregates.ts` (logica dinamica + type extension + flag `isDynamic`)
- `src/components/budget/v2/CashflowTimeline.tsx` (badge "Saldo dinamico")
- `src/components/budget/PaymentDialog.tsx` (materializza snapshot a "Pagato")
- `src/components/vendors/PaymentPlanTab.tsx` (nota informativa, niente cambi di logica editor)

Nessun cambiamento ai dati esistenti, nessuna migrazione.
