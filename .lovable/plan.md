## Principio (allineato al tuo modello mentale)

- **Prezzo previsto (committed)** = `calculateExpenseAmount(item, lines, scenario, counts)`. Cambia con lo scenario (Pianificato / Lista invitati / Confermati). È l'unica fonte di verità del "quanto costerà".
- **Rate (payments)** = proiezione di cassa, non debito contrattuale. Si **sottraggono** al prezzo previsto man mano che diventano `Pagato`.
- **Da pagare reale** = `prezzo previsto − già pagato`. Può essere **negativo** (sovra-pagamento all'inizio, normale finché non ci sono i confermati).
- Le rate `due` future hanno valore **solo come distribuzione temporale**: la loro somma può legittimamente differire dal "Da pagare reale".

## Cosa cambia nell'app

### 1. `src/lib/budgetAggregates.ts` — un solo helper, niente clipping a zero

```ts
// Oggi: toPay = Math.max(0, committed - paid)  ← maschera il sovra-pagamento
// Domani: toPay = committed - paid             ← può essere negativo
```

Aggiungo helper:
```ts
balance(item|vendor|totals) = committed - paid     // signed
overpaid = balance < 0
```

Effetto: hero "Da pagare" può mostrare un numero negativo o zero quando hai pagato più del previsto nello scenario corrente.

### 2. Hero `BudgetHero.tsx` — disclaimer quando il residuo è negativo

KPI "Da pagare":
- `balance > 0` → mostra `fmt(balance)` in warn (come oggi).
- `balance == 0` → mostra `0 €`, sub "Tutto coperto dai pagamenti".
- `balance < 0` → mostra `+€X anticipati` in tono neutro/success, sub-disclaimer cliccabile: *"Hai versato più del prezzo previsto nello scenario corrente. Normale all'inizio: il prezzo aumenterà man mano che gli ospiti si confermano."*
- Stessa logica per la legenda della progress bar (la barra "Da pagare" diventa 0 quando balance ≤ 0; aggiungo un chip "Anticipo +€X" accanto).

### 3. Timeline cassa `CashflowTimeline.tsx` — header riallineato

Sostituisco la KPI principale:

| Prima | Dopo |
|---|---|
| "Totale da versare (rate pianificate)" = Σ rate due (28.854) | **"Da pagare residuo"** = `committed - paid` (21.972), identico all'hero |

La lista delle rate future resta com'è (utile per la cassa nei mesi), ma:
- Sotto la KPI aggiungo riga grigia: *"Rate ancora pianificate: 28.854 € · alcune potrebbero essere riviste quando lo scenario cambia."*
- Se `Σ rate due > residuo + 0.01` → micro-disclaimer inline: *"Le rate pianificate eccedono il residuo previsto. Vedi spiegazione →"* che apre la stessa spiegazione del punto 4.
- Se `residuo < 0` → KPI mostra "Anticipo +€X" con disclaimer come hero.

### 4. Vendor card — pannello "Cosa è successo qui" (spiegazione, non blame)

Sul vendor card di `BudgetByVendor` (e nel Vendor Hub), quando `Σ paymentCashAmount(due+paid) > committed(scenario corrente)`, mostro un info-chip neutro (non rosso) "Rate > prezzo previsto" che apre un popover con la spiegazione ragionata:

> **Perché vedo rate maggiori del prezzo previsto?**
> Il prezzo è ricalcolato in base allo scenario corrente: **Lista invitati** (X adulti, Y bambini, Z staff). Le rate sono state pianificate quando lo scenario era diverso, oppure il contratto copre una capienza superiore agli ospiti attualmente in lista.
>
> Cosa puoi fare:
> - Se gli ospiti reali saranno più del previsto → cambia scenario in **Pianificato** o aggiorna le righe-costo (es. cap "fino a 100 adulti").
> - Se il contratto è effettivamente più alto del previsto → aggiungi una riga-costo fissa "Adeguamento contratto" che colmi la differenza.
> - Se le rate sono state sovrastimate → modifica l'importo della rata futura.
>
> *Δ = +X € · Scenario: {label}*

Niente CTA automatici di redistribuzione. Solo spiegazione + link rapidi: "Modifica line-items" / "Vai alle rate future".

### 5. Niente hard-block lato `PaymentDialog`

Annullo la decisione precedente: non blocco più il salvataggio quando `Σ rate > committed`. È un caso legittimo (es. sovra-pagamento iniziale). Resta invece il guard sul **`PaymentAllocationDialog`** (allocazioni > importo singolo pagamento), che è una regola di integrità sulla cassa già effettiva e non ha niente a che vedere con lo scenario.

### 6. Nessuna modifica dati per International Catering

Il committed 12.594 € è **corretto** rispetto allo scenario corrente. Non tocchiamo né line-items né payments. La timeline mostrerà correttamente "Da pagare 21.972 €" totale e "Rate pianificate 28.854 €" come info secondaria, con il popover che spiega per Catering perché la rata da 17.790 € supera il residuo del vendor.

## File toccati

- `src/lib/budgetAggregates.ts` — rimuovo `Math.max(0, ...)` da `toPay`, aggiungo `balance` (signed) e helper `isOverpaid`.
- `src/components/budget/v2/BudgetHero.tsx` — rendering tri-stato della KPI "Da pagare" + disclaimer.
- `src/components/budget/v2/CashflowTimeline.tsx` — KPI "Da pagare residuo" allineato al committed-paid; riga secondaria "Rate ancora pianificate" + disclaimer condizionale.
- `src/components/budget/v2/BudgetByVendor.tsx` (o equivalente card vendor) — info-chip + popover esplicativo quando rate > committed.
- `src/components/budget/v2/PaymentDialog.tsx` — rimuovo logiche di hard-block previste prima.

## Non in scope

- Modifica del motore `calculateExpenseAmount` (resta invariato).
- Snapshot del contratto firmato o nuove colonne DB.
- Redistribuzione automatica delle rate.
- Cleanup dati per Ludovica.