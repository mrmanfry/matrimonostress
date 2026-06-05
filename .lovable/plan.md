## Obiettivo

1. Cleanup pagamento Alberto Manzone (360 → 366, `tax_inclusive=true`).
2. Unificare gli importi al **lordo (cash reale)** così che "Già pagato" e "Totale versato contributori" coincidano.
3. Bloccare la sovra-allocazione nel `PaymentAllocationDialog`.
4. Forzare l'azzeramento delle allocazioni quando l'importo di un pagamento già allocato viene modificato.
5. Ereditarietà aliquota dal preventivo al pagamento, modificabile.

---

## 1. Cleanup dato

UPDATE singolo sul pagamento "Acconto IVA inclusa" di Alberto Manzone: `amount = 366`, `tax_inclusive = true`. Allocazioni esistenti restano coerenti.

## 2. Importi al lordo — `src/lib/budgetAggregates.ts`

Helper `paymentCashAmount(p)`:

```
if p.tax_inclusive === true       → p.amount
else if p.tax_rate is null/0      → p.amount   (assunto già lordo, niente moltiplicazione)
else                              → p.amount × (1 + p.tax_rate/100)
```

**Regola "no tax = no markup"**: se l'utente non indica aliquota, il valore inserito è considerato già lordo. Nessuna inflazione silenziosa.

Usato in:
- `computeTotals` → `itemPaid` / `itemScheduled` sommano `paymentCashAmount(p)`
- `UiPayment.amount` → valorizzato al lordo
- `unallocatedPaidPayments` riceve già `p.amount` lordo dalla mappatura UI

Effetto: tile "Già pagato" allineata a "Totale versato"; caso Tenuta dell'olmo (500 net @ 22% → 610) risolto.

## 3. Blocco sovra-allocazione — `PaymentAllocationDialog.tsx`

Guardia numerica: `Σ allocazioni > paymentAmount + 0.01` → disabilita "Salva" con badge rosso e delta esplicito. `paymentAmount` ricevuto è già il **lordo** (caller allineato al punto 2).

## 4. Force-zero su modifica importo

Nei punti che aggiornano `payments.amount` (`PaymentPlanTab.tsx`, `PaymentDialog.tsx`):

1. Se esistono `payment_allocations` per quel `payment_id` E il nuovo `amount` ≠ vecchio → confirm dialog:
   *"Modificando l'importo, le attribuzioni esistenti verranno azzerate. Dovrai riassegnare il pagamento ai contributori."*
2. Su conferma: `DELETE` delle allocazioni, poi UPDATE.
3. Se il pagamento era `Pagato` → aprire automaticamente `PaymentAllocationDialog` in mode `edit` per evitare stato "pagato senza allocazione".

## 5. Ereditarietà aliquota (preimpostata, modificabile)

In `PaymentDialog` / `PaymentPlanTab`, alla creazione/modifica di un pagamento:
- Default `tax_rate` ← `expense_line_items.tax_rate` prevalente del preventivo del fornitore (mediana o prima riga); fallback `22` se nessuna riga.
- Default `tax_inclusive` ← `expense_line_items.price_is_tax_inclusive` corrispondente; fallback `true`.
- I campi restano **editabili** dall'utente, senza vincoli.

Niente blocchi né warning su mismatch con il preventivo: aliquote miste sono lecite (acconto 22% + saldo 10%, ecc.).

## 6. Cleanup

Rimuovere eventuali normalizzazioni silenziose in `budgetAggregates.ts` che nascondevano la sovra-allocazione: ora l'invariante è garantita a monte.

---

## File toccati

- `src/lib/budgetAggregates.ts` — `paymentCashAmount` + uso nei totali
- `src/components/budget/v2/PaymentAllocationDialog.tsx` — guardia sovra-allocazione
- `src/components/vendors/PaymentPlanTab.tsx` — force-zero su edit amount + ereditarietà aliquota
- `src/components/budget/PaymentDialog.tsx` — stesso pattern
- Cleanup dato: UPDATE pagamento Alberto Manzone

Procedo in build mode quando approvi.
