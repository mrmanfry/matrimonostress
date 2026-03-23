

## Analisi Discrepanze Conteggio Invitati

### Problema
Ci sono **3 motori di calcolo indipendenti** che contano gli ospiti in modo diverso:

### I 3 motori e perché danno numeri diversi

#### 1. Dashboard (`useGuestMetrics` hook) → 202 coperti
- **Adulti = 178**: conta `regularGuests.filter(g => !g.is_child)` — esclude coppia e staff
- **Bambini = 9**: corretto
- **Sposi = 2**: categoria separata ✓
- **Staff = 4**: da `vendors.staff_meals_count`
- **+1 = 9 potenziali** (inclusi nel totale `estimatedMaxHeadCount`)
- **Totale: 178 + 9 + 2 + 4 + 9 = 202** ✓

#### 2. Analytics Composizione (`calculateGuestAnalytics`) → 180 adulti, 0 staff, 0 +1
- **Adulti = 180**: calcola `total - childrenCount - staffCount`. Include i 2 sposi negli adulti!
- **Staff = 0**: conta `guests.filter(g => g.is_staff)` — cerca il flag `is_staff` nella tabella guests, ma lo staff reale viene dai vendors (`staff_meals_count`), non dal campo `is_staff`
- **+1 = 0/9**: mostra `plusOnesConfirmed/plusOnesPotential` ma `plusOnesPotential` in analytics conta solo `allow_plus_one=true` (logica corretta, il valore visualizzato è 0/9 che significa 0 confermati su 9 potenziali)

**Discrepanze chiave:**
- Sposi contati come adulti (180) invece che separati (178 + 2)
- Staff a 0 perché non legge da `vendors.staff_meals_count`
- Non include +1 nel totale coperti

#### 3. Budget (`expectedCalculator` / `BudgetSpreadsheet`) → 189 coperti
- Usa `calculateExpectedCounts()` in modalità "Previsti"
- **Adulti = 167**: filtra `!is_couple_member && !is_staff && !is_child`, poi applica logica STD (esclude chi ha risposto `likely_no`)
- **Bambini = 9**
- **Staff = 4**: da `calculateTotalVendorStaff(vendors)`
- **Accomp. = 9**: +1 potenziali
- **Totale: 167 + 9 + 4 + 9 = 189**

La differenza adulti (167 vs 178) è perché il budget in modalità "Previsti" esclude chi ha risposto negativamente allo STD.

### Root Causes

| Problema | Dove | Causa |
|---|---|---|
| Sposi dentro adulti | Analytics (`guestAnalytics.ts` riga 144) | `adultsCount = total - children - staff` include couple |
| Staff = 0 | Analytics (`guestAnalytics.ts` riga 143) | Conta `is_staff` da guests invece di `vendors.staff_meals_count` |
| +1 non nel totale | Analytics | Non somma +1 al conteggio coperti |
| Numeri diversi adulti | Budget vs Dashboard | Budget usa modalità "Previsti" (esclude likely_no), Dashboard conta tutti |

### Piano di Fix

#### 1. Unificare `calculateGuestAnalytics` con `useGuestMetrics`
**File: `src/lib/guestAnalytics.ts`**
- La funzione deve ricevere `vendorStaffTotal` come parametro (come fa `expectedCalculator`)
- Escludere `is_couple_member` dal conteggio adulti: `adultsCount = guests.filter(g => !g.is_child && !g.is_staff && !g.is_couple_member).length`
- Aggiungere `coupleCount` come campo separato
- Usare `vendorStaffTotal` per staff invece di `is_staff` (o sommare entrambi come fa `useGuestMetrics`)

#### 2. Aggiornare `GuestAnalyticsDashboard` composizione
**File: `src/components/guests/GuestAnalyticsDashboard.tsx`**
- Aggiungere KPI "Sposi" nella CompositionTab
- Il badge header deve usare il totale coerente con Dashboard (adulti + bambini + sposi + staff + +1)

#### 3. Aggiornare la chiamata in `Guests.tsx`
**File: `src/pages/Guests.tsx`**
- Passare `vendorStaffCount` (già caricato) a `GuestAnalyticsDashboard` e a `calculateGuestAnalytics`

#### 4. Allineare l'interfaccia `GuestAnalytics`
- Aggiungere `coupleCount`, `couplePercentage` ai campi restituiti
- Il `totalGuests` deve rappresentare "coperti" (adulti + bambini + coppia + staff + +1 confermati) coerentemente con il Dashboard

### Risultato atteso
Dopo il fix, tutte e 3 le viste mostreranno:
- **Stessa base**: adulti (escl. coppia), bambini, sposi (separati), staff (da vendors)
- **Dashboard e Analytics**: stesso totale coperti stimati
- **Budget**: può differire perché applica la logica STD/RSVP della modalità selezionata (pianificati/previsti/confermati), il che è corretto e intenzionale

