## Problema

Nella timeline pagamenti di un fornitore, quando una rata ha "IVA esclusa" (es. 200 € netto + 44 € IVA = 244 € lordo), il calcolo del **Saldo automatico** confronta il totale della voce di spesa (che è già **lordo**, prodotto da `calculateExpenseAmount`) con la somma degli `amount` delle altre rate — ma quegli `amount` sono memorizzati nella "base scelta" (netto se IVA esclusa, lordo se IVA inclusa). Risultato: si scala 200 € invece di 244 € dal budget, e il saldo residuo risulta gonfiato.

Il principio richiesto è: **il budget parla sempre in IVA inclusa**, quindi ogni rata deve essere scalata dal totale usando il suo valore **lordo** (244), non il netto (200).

## Modifica (solo `src/pages/VendorDetails.tsx`, componente `PaymentTimeline`)

1. **`computeRemainder(p)`** — sommare gli "altri" pagamenti convertiti a **lordo** tramite `ivaBreakdown(x.amount, x.tax_inclusive !== false, x.tax_rate)`. Il totale di riferimento resta `itemTotals[...]` (già lordo). Il risultato rappresenta quindi il **residuo lordo** da coprire.

2. **`saveEdit` (ramo Saldo)** — `computeRemainder` ora ritorna un valore lordo. Se l'utente ha scelto `tax_inclusive = true` lo salviamo così com'è; se ha scelto `tax_inclusive = false` (IVA esclusa) lo convertiamo a netto dividendo per `(1 + rate/100)`, in modo che `ivaBreakdown` produca esattamente lo stesso lordo che avevamo calcolato dal residuo. Così il "Saldo" copre davvero il residuo del budget indipendentemente dalla modalità IVA scelta.

3. **Preview del saldo nel form di modifica** — l'etichetta "importo calcolato automaticamente (…)" e il riquadro `Netto/IVA/Lordo` devono usare la stessa logica: mostrare il residuo lordo e, quando IVA esclusa, il netto derivato. Aggiornare `previewAmount` di conseguenza.

4. **Nessuna modifica** a `itemTotals`, a `calculateExpenseAmount`, al DB o alle policy: continuiamo a memorizzare `amount` nella base scelta dall'utente + `tax_rate` + `tax_inclusive`. Cambia solo la matematica di confronto/allocazione contro il budget lordo.

## Dettagli tecnici

- File: `src/pages/VendorDetails.tsx`, righe ~1255–1310.
- `ivaBreakdown` è già definita nel componente e restituisce `{ netto, iva, lordo, hasIva }`.
- Nessun impatto su altre pagine: `computeRemainder` è locale a `PaymentTimeline`.

## Verifica

- Caso 200 € IVA 22% esclusa su budget 244 €: residuo dopo questa rata = 0 € (prima era 44 €).
- Caso 244 € IVA 22% inclusa su budget 244 €: residuo = 0 € (invariato).
- Mix di rate lordo/netto nello stesso item: la somma dei lordi coincide col totale voce.
