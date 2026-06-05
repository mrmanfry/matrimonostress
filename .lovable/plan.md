# Allineare il headcount Budget con la pagina Invitati

## Problema
Nel Budget vedi **88 adulti + 2 bambini = 90**, ma in Invitati e Campagne i confermati sono **92**. La differenza sono i **2 sposi**: oggi il Budget li esclude esplicitamente dai conteggi, mentre Invitati li include nei confermati.

Dato che gli sposi al pranzo ci sono (e generano costo a testa identico a un adulto), è più corretto e meno confondente includerli negli Adulti anche qui.

## Cosa cambia

### 1. `src/pages/Budget.tsx` — funzione `tally`
Rimuovere lo `skip` su `is_couple_member`: gli sposi confermati o presenti vengono contati come **adulti**.
- `expected`: tutti i guest non-staff → sposi inclusi (sempre presenti)
- `confirmed`: guest con `isGuestConfirmed` → sposi inclusi (sono sempre confermati per definizione di `isGuestConfirmed`)
- `planned`: resta `target_adults/children/staff` dal record `weddings` (manuale, lo gestisce l'utente)

Risultato atteso per il caso attuale: confermati passano da 88 a **90 adulti** + 2 bambini = **92**, allineato con Invitati.

### 2. `src/components/budget/v2/ScenarioHeadcountBar.tsx`
Aggiornare le label di provenienza per chiarire l'inclusione:
- `expected`: "Da lista invitati (sposi inclusi)" ✅ già così
- `confirmed`: "Da RSVP confermati (sposi inclusi)" — aggiungo il chiarimento
- `planned`: aggiungere hint sotto il campo Adulti "Includi anche gli sposi (2)" come micro-copy

### 3. Impatto sul resto del modulo Budget
La funzione `buildVendors` usa `guestCounts` per calcolare i costi parametrici (per adulto/bambino/staff). Includendo gli sposi negli adulti:
- I costi a testa (catering, bomboniere, menu, ecc.) si calcolano su 92 invece di 90 → **+2 coperti**, coerente con la realtà.
- Catering già contava gli sposi separatamente nella propria pagina — non cambia, quella logica vive nel modulo Catering.

## Note
Questa modifica riguarda **solo il modulo Budget** (UI + tally locale a `Budget.tsx`). Non tocca `guestClassification.ts`, né la pagina Catering, né le metriche degli altri moduli che continuano a usare la classificazione canonica "adulti escludono sposi".
