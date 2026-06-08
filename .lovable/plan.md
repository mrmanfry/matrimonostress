# Sistemazione pagina Regali & Net Budget

Quattro interventi mirati, solo sulla pagina `/app/gifts`. Nessuna modifica ad altre sezioni.

## 1. Chiarire da dove arriva il "Budget" (1.829 €)

Il valore è la **somma di tutte le voci di spesa del matrimonio** (tabella `expense_items`, usando l'importo "Importo unico" se in modalità `fixed`, altrimenti l'`estimated_amount`). Oggi viene mostrato come un secco "Budget" senza spiegazione → confusione.

Cambiamenti UI nella card **Copertura Budget**:
- Etichetta esplicita: **"Budget totale matrimonio"** invece di solo "Budget".
- Icona info (ℹ︎) accanto con tooltip: *"Somma di tutte le voci di spesa registrate nella sezione Budget. Aggiorna le tue voci di spesa per modificare questo valore."*
- Link/azione discreta: *"Vai al Budget →"* che porta a `/app/budget`.

Nessun cambio alla formula lato database — la fonte resta `get_gift_forecast` RPC.

## 2. Ridisegno della barra "Copertura Budget"

Problema attuale: barra Recharts con `ReferenceLine` rossa tratteggiata che, quando incassato+stimato = 0, appare visivamente "a inizio barra" perché la barra è vuota e l'asse non ha riferimenti visivi. Brutto e illeggibile.

Sostituiamo l'intera barra Recharts con un **componente custom a segmenti** (div + CSS, niente Recharts):

```text
┌─────────────────────────────────────────────────┐
│███████ 320 €  ▓▓▓▓▓ 800 €                       │  ← incassato (pieno) + stimato (tratteggiato)
└─────────────────────────────────────────────────┘
 0 €                                       1.829 €  ← scala con budget totale a destra
```

Comportamento:
- **Sfondo neutro** (`--paper-sunk`) che rappresenta il 100% del budget.
- **Segmento verde pieno** = `total_cash_received` (proporzionale al budget).
- **Segmento giallo tratteggiato/opaco** = `total_forecast` (stima sopra l'incassato).
- **Etichette scala**: "0 €" a sinistra, valore del budget a destra. Quando l'incassato supera il budget, mostriamo una scala estesa con badge "+X% sopra budget".
- **Stato 0 €**: la barra resta visibile (sfondo grigio chiaro pieno) con messaggio inline *"Nessun regalo ancora registrato"*. Nessuna linea tratteggiata fantasma.
- Tooltip sui segmenti con valori (rispetta il toggle privacy).

KPI percentuale grande sopra resta com'è (con colore semantico verde/oro/rosso).

## 3. Slider: "Media regalo **per persona**" (non per nucleo)

Cambio di unità di misura del simulatore. La stima va moltiplicata per il numero di **persone invitate nei nuclei eligible** (RSVP Confermato o In attesa, senza regalo registrato), come scelto: *"Tutti gli invitati del nucleo"* — escludendo coppia e staff (regola standard del progetto), includendo bambini.

Modifiche:
- **RPC `get_gift_forecast`** (migration): aggiungere campo `eligible_persons_count` calcolato come `COUNT(guests)` nei `invite_parties` eligible, escludendo righe con `is_couple_member = true` o `is_staff = true`. La formula del `total_forecast` diventa `eligible_persons_count * p_avg_estimate`. Il campo `eligible_parties_count` resta (lo usiamo nella copy del simulatore per dire "X nuclei / Y persone").
- **`useGifts.ts`** (`GiftForecast` type): aggiunto `eligible_persons_count: number`.
- **`GiftSimulatorSlider.tsx`**:
  - Label: "Media regalo **per persona**".
  - Copy aggiornata: *"La stima si applica a **{persons} persone** in {parties} nuclei familiari con RSVP confermato o in attesa senza regalo registrato."*
  - Default value passato a 100 € (più realistico per persona che 200 € per nucleo). LocalStorage migra trasparentemente al nuovo default solo se non c'è ancora un valore salvato.
- **`GiftPartyList.tsx`** — riga "Stima:" del singolo nucleo: mostrare `avgEstimate × (numero persone del nucleo escl. coppia/staff)` invece di solo `avgEstimate`. Servirà passare giù da `Gifts.tsx` anche il count guests per party (una query aggiuntiva su `guests` o conteggio client-side).

## 4. Filtri nella sezione "Nuclei Familiari"

Stessa esperienza di `/app/guests`, scopo: cercare e filtrare velocemente i nuclei. Si introduce una **filter bar paper-styled** in cima alla card "Nuclei Familiari" con:

- **Ricerca testuale** per nome nucleo (input con icona lente, debounce 150 ms).
- **Filtro Stato RSVP** (chip group): Tutti · Confermato · In attesa · Rifiutato.
- **Filtro Stato regalo** (chip group): Tutti · Registrato · Da registrare · Solo contanti · Solo lista nozze.
- **Counter risultati** discreto in alto a destra: *"{n} su {tot} nuclei"*.
- **Clear all** quando almeno un filtro è attivo.

Filtraggio applicato client-side sul `parties[]` (già in memoria), nessuna query aggiuntiva. Stile coerente con `GuestsFilterBar.tsx` (token `--paper-*`).

## File toccati

- `supabase/migrations/<new>.sql` — aggiornamento RPC `get_gift_forecast` con `eligible_persons_count`.
- `src/hooks/useGifts.ts` — type `GiftForecast` esteso.
- `src/pages/Gifts.tsx` — fetch guests count per party, default slider 100, pass-through `personsPerParty` map.
- `src/components/gifts/GiftCoverageWidget.tsx` — barra custom, etichetta budget + tooltip + link.
- `src/components/gifts/GiftSimulatorSlider.tsx` — label/copy "per persona".
- `src/components/gifts/GiftPartyList.tsx` — nuova `GiftPartyFilters` interna + logica filter/search; stima per nucleo proporzionale al numero di persone.

## Dettagli tecnici

- La RPC esiste già come `SECURITY DEFINER` con check `has_wedding_access`; aggiorneremo con `CREATE OR REPLACE FUNCTION` e re-`GRANT EXECUTE TO authenticated`.
- Conteggio persone per nucleo lato client: nuova query parallela su `guests` (`id, party_id, is_couple_member, is_staff`) filtrata per `wedding_id`, raggruppata in `Map<party_id, count>`.
- Nessuna nuova dipendenza npm.
