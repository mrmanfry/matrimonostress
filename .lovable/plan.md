

## Piano: Revisione Logica Calcolo Totale Spese Vendor

### Problema Attuale

Il valore "Totale Spese" mostrato nella card del vendor ha tre problemi:

1. **Guest counts "expected" errati**: usa i confermati RSVP anche per la modalita "previsti", quando dovrebbe usare la logica del `expectedCalculator` (che include STD responses, +1 potenziali, etc.)
2. **Ridondanza campi importo**: tre campi (`fixed_amount`, `estimated_amount`, `total_amount`) nella tabella `expense_items` creano confusione su quale sia la "verita"
3. **Nessun feedback visivo**: l'utente non capisce se sta vedendo un preventivo o un contratto confermato

### Modifiche Proposte

#### 1. Correggere i guest counts "expected" in `Vendors.tsx`

Attualmente (riga 237-248):
```
expected: { adults: actualAdults, ... }   // SBAGLIATO: usa confermati
confirmed: { adults: actualAdults, ... }  // Corretto
```

La fix: caricare i guest completi e usare `calculateExpectedCounts()` da `expectedCalculator.ts` per popolare i counts "expected", come gia fatto in `VendorExpensesWidget.tsx` e `Treasury.tsx`.

#### 2. Allineare la logica con `VendorExpensesWidget`

Il widget spese dentro la pagina dettaglio vendor (`VendorExpensesWidget.tsx`) gia implementa correttamente il calcolo con `expectedCalculator`. La pagina lista vendor (`Vendors.tsx`) deve usare la stessa logica per coerenza.

#### 3. Pulizia ridondanza database (non bloccante)

Non serve una migrazione: i tre campi hanno ruoli diversi nel workflow:
- `estimated_amount`: preventivo iniziale (fase budget planning)
- `fixed_amount`: importo contrattuale confermato (fase vendor assignment)  
- `total_amount`: legacy, non piu usato

La logica di fallback `fixed_amount ?? estimated_amount ?? 0` e corretta. Il problema e solo la mancanza di visibilita su quale campo sta "vincendo".

### File da Modificare

| File | Modifica |
|------|----------|
| `src/pages/Vendors.tsx` | Caricare guests completi + usare `calculateExpectedCounts()` per popolare `guestCounts.expected` invece di riusare i confermati |

### Dettagli Tecnici

In `loadVendors()` di `Vendors.tsx`:

1. Caricare tutti i guests del wedding (non solo i confermati via `invite_parties`):
   ```
   SELECT id, is_child, is_staff, rsvp_status, 
          save_the_date_sent_at, std_response, 
          party_id, phone, allow_plus_one, plus_one_name
   FROM guests WHERE wedding_id = ?
   ```

2. Caricare i vendors per lo staff count:
   ```
   SELECT staff_meals_count FROM vendors WHERE wedding_id = ?
   ```

3. Usare `calculateExpectedCounts()` e `calculateTotalVendorStaff()` da `expectedCalculator.ts` per calcolare i counts expected

4. Costruire `guestCounts` correttamente:
   ```
   planned: resolvedCounts (da target wedding)
   expected: { adults: expected.adults, children: expected.children, staff: expected.totalHeadCount - expected.adults - expected.children }
   confirmed: { adults: confirmedAdults, children: confirmedChildren, staff: confirmedStaff }
   ```

### Risultato Atteso

- Il "Totale Spese" sara coerente con quello mostrato nella pagina dettaglio vendor
- La modalita "previsti" usera i conteggi corretti (STD + +1 potenziali)
- Nessuna modifica al database necessaria

