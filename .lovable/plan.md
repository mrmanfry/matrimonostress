
## Piano: Razionalizzare il Calcolo Ospiti con +1

### Problema Identificato
Il tooltip del "Calculation Mode Toggle" mostra solo gli ospiti nel database (166 adulti, 9 bambini, 4 staff), ma **ignora completamente i +1 (accompagnatori)**:
- **+1 Confermati**: ospiti con `plus_one_name` compilato (persone fisiche reali)
- **+1 Potenziali**: ospiti con `allow_plus_one = true` ma senza nome (coperti da prevedere per catering)

Questo causa confusione perché il numero di "coperti" reali è diverso dal numero mostrato.

### Soluzione Proposta

#### 1. Estendere `ExpectedResult` in `expectedCalculator.ts`
Aggiungere campi per i +1:
```typescript
export interface ExpectedResult {
  adults: number;
  children: number;
  staff: number;
  plusOnesConfirmed: number;   // +1 con nome
  plusOnesPotential: number;   // +1 solo permessi
  source: 'std_responses' | 'full_list';
  details: string;
  totalHeadCount: number;      // Totale coperti (adulti + bambini + staff + +1)
}
```

#### 2. Aggiornare `calculateExpectedCounts()` per Contare +1
Modificare la funzione per:
- Recuperare `allow_plus_one` e `plus_one_name` dagli ospiti
- Contare +1 confermati (con nome) e potenziali (solo permesso)
- Calcolare `totalHeadCount` = adulti + bambini + staff + +1

#### 3. Aggiornare l'Interfaccia `Guest` in `expectedCalculator.ts`
Aggiungere:
```typescript
export interface Guest {
  // ... campi esistenti
  allow_plus_one?: boolean;
  plus_one_name?: string | null;
}
```

#### 4. Aggiornare i Chiamanti (Treasury, BudgetLegacy, VendorExpensesWidget)
Passare i campi `allow_plus_one` e `plus_one_name` quando mappano gli ospiti.

#### 5. Aggiornare `calculation-mode-toggle.tsx`
Migliorare il tooltip per mostrare anche i +1:
```
Previsti: 166 adulti, 9 bambini, 4 staff, 12 accompagnatori
125 sì + 4 forse + 46 in attesa + 4 staff + 12 +1 confermati
```

Oppure, mostrare direttamente il **totale coperti** in modo più chiaro:
```
191 coperti previsti (166 adulti, 9 bambini, 4 staff, 12 +1)
```

### File da Modificare

| File | Modifica |
|------|----------|
| `src/lib/expectedCalculator.ts` | Estendere interface + calcolare +1 |
| `src/components/ui/calculation-mode-toggle.tsx` | Mostrare +1 nel tooltip |
| `src/pages/Treasury.tsx` | Passare campi +1 al calcolo |
| `src/pages/BudgetLegacy.tsx` | Passare campi +1 al calcolo |
| `src/components/vendors/widgets/VendorExpensesWidget.tsx` | Passare campi +1 al calcolo |

### Risultato Atteso
L'utente vedrà nel toggle:
- **Totale coperti** che include +1 confermati
- **Breakdown** chiaro con adulti, bambini, staff, accompagnatori
- Quando in "Previsti", anche i +1 potenziali vengono mostrati come nota (per pianificazione catering)

### Dettagli Tecnici

#### Logica +1 nel Contesto STD
Quando calcoliamo i "Previsti" basandoci sulle risposte STD:
- Se un ospite risponde "likely_yes" e ha `allow_plus_one = true`, il +1 è "potenziale"
- Se lo stesso ospite ha `plus_one_name = "Giulia"`, il +1 è "confermato"
- Solo i +1 confermati contano come coperti certi

```typescript
// Nuova logica in calculateExpectedCounts
const plusOnesConfirmed = expectedGuests.filter(
  g => g.plus_one_name && g.plus_one_name.trim() !== ''
).length;

const plusOnesPotential = expectedGuests.filter(
  g => g.allow_plus_one && (!g.plus_one_name || g.plus_one_name.trim() === '')
).length;

const totalHeadCount = adults + children + staff + plusOnesConfirmed;
```

#### Presentazione UI Consigliata
```
┌─────────────────────────────────────────────────┐
│ ○ Pianificato  ● Previsti  ○ Confermati         │
├─────────────────────────────────────────────────┤
│ 191 coperti previsti                            │
│ 166 adulti + 9 bambini + 4 staff + 12 accomp.   │
│ (+ 8 accompagnatori potenziali)                 │
└─────────────────────────────────────────────────┘
```
