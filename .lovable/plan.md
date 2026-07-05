# Trasparenza IVA nella modifica rata (Piano Pagamenti fornitore)

## Il problema visto

Nella card "Piano Pagamenti" della scheda fornitore, sia in visualizzazione che nel form inline di **Modifica**, non compare da nessuna parte l'informazione IVA. L'utente vede solo `610` e non sa se sia netto o lordo. In realtà il pagamento è memorizzato con `tax_inclusive=false` + `tax_rate=22`, quindi in Tesoreria diventa 744 € (610 × 1,22). Da lì la confusione e i 134 € "non allocati".

Il form inline responsabile è `PaymentTimeline` in `src/pages/VendorDetails.tsx` (righe ~1237-1399). Attualmente contiene solo: descrizione, data, importo, checkbox Saldo. Manca completamente la sezione IVA.

## Cosa cambio

Solo UI di `PaymentTimeline` e la firma di `onUpdate` per far passare i campi IVA — nessuna modifica DB, nessuna edge function.

### 1. Vista read-only della rata (sempre visibile)
Sotto la riga dell'importo aggiungere:
- Chip piccolo: `IVA 22% inclusa` (verde/neutro) oppure `IVA 22% esclusa` (arancione) oppure `Senza IVA`.
- Se IVA esclusa: riga secondaria mono-space  
  `Netto 610,00 · IVA 134,20 · Lordo 744,20 €`  
  così l'utente vede subito la composizione senza aprire il form.
- L'importo grande resta com'è (il campo `amount` grezzo), ma con label sotto: `netto` / `lordo` / `importo` a seconda del caso, per rimuovere ogni ambiguità.

### 2. Form inline "Modifica rata"
Aggiungere sotto la riga data/importo, prima del checkbox Saldo, un blocco `Trattamento IVA`:

```
Trattamento IVA
[ Importo IVA inclusa  ●  |   Importo + IVA da aggiungere  ○ ]   Aliquota [22] %

Anteprima: Netto 610,00 · IVA 134,20 · Lordo 744,20 €
```

- Segmented control a 2 opzioni (radio nascosto sotto), coerente con lo stile PaperUI già in uso.
- Campo Aliquota accanto (input number 0-100, step 0,5).
- L'**etichetta del campo Importo cambia in tempo reale**: `Importo (lordo) €` quando IVA inclusa, `Imponibile (netto) €` quando IVA esclusa.
- Anteprima live che ricalcola netto/IVA/lordo mentre l'utente digita.
- Helper text piccolo: *"Il totale mostrato in Tesoreria è il lordo effettivo che uscirà dal conto."*

### 3. Wiring dati
- Estendere lo stato del form con `draftTaxInclusive: boolean` e `draftTaxRate: number`, inizializzati da `p.tax_inclusive` e `p.tax_rate` (default `true` / `22`).
- Estendere il tipo `onUpdate` in `PaymentTimeline` e la funzione padre (`updatePayment` in `VendorDetails`) per accettare anche `tax_inclusive` e `tax_rate` e propagarli su `supabase.from('payments').update(...)`.
- Nessuna modifica di `DbPayment` type (campi già presenti nello schema `payments`).

### 4. Coerenza con Tesoreria
Nessun cambio a `budgetAggregates` in questo giro: la logica di calcolo del cash (lordo) è già corretta. L'obiettivo di questa iterazione è unicamente **rendere visibile all'utente** cosa sta scrivendo e cosa uscirà davvero dal conto, così il 744 € in tesoreria non arriva più come sorpresa.

Il fix separato del dialog "Pagamenti non allocati" (allineamento base netta/lorda in `budgetAggregates.ts`) resta pendente e verrà pianificato a parte se l'utente lo conferma dopo aver visto la trasparenza IVA.

## Verifica

- Aprire la rata Acconto (610 € netti, IVA 22 % esclusa): la card mostra chip arancione + riga `Netto 610 · IVA 134,20 · Lordo 744,20`.
- Cliccare Modifica: form pre-compilato con segmented su "Importo + IVA da aggiungere", aliquota 22, anteprima coerente.
- Cambiare a "IVA inclusa": l'etichetta dell'importo diventa `Importo (lordo)`, l'anteprima ricalcola, salvando il valore torna corretto.
- Nessuna regressione sul checkbox Saldo (interagisce solo con `amount`, non con IVA).

## File toccati

- `src/pages/VendorDetails.tsx` — sola sezione `PaymentTimeline` (form inline + vista read-only) e firma di `onUpdate` per propagare i due campi IVA all'update Supabase già esistente.

Nessun altro file, nessuna migrazione, nessuna edge function.
