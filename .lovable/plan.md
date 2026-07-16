## Problema

La pagina `/progress/:token` per i fornitori mostra tutti zeri e ha uno stile "slate/industriale" che stona con il resto di WedsApp. Due bug distinti:

### 1. Numeri a zero — bug RLS (root cause)
Il link fornitori è pubblico (visitatori anonimi). Ora `progress_tokens` è leggibile da `anon`, ma **tutte le altre tabelle** che la vista interroga (`weddings`, `guests`, `vendors`, `tables`, `timeline_events`, `user_roles`, `profiles`) **non hanno alcuna policy per `anon`**. Verificato via `pg_policies`: zero righe. → Le query tornano vuote → conteggi 0/0/0. Lo stesso problema esiste (silenzioso) anche nella vista ospiti per `weddings` e `timeline_events`.

Aprire policy anon su queste tabelle è pericoloso (esporrebbe l'intera guest list a chiunque). La soluzione corretta è **spostare il fetch dietro un edge function** che valida il token con service role e restituisce solo il payload consentito dai flag del token.

### 2. Stile off-brand
La vista fornitori usa `bg-slate-50`, `bg-slate-900`, icona chiave inglese, tipografia sans "tecnica". WedsApp è "calma e controllo", elegante, editorial. Va allineata al linguaggio della vista ospiti (Card morbide, palette rose/neutra semantica, header sobrio, serif per i nomi) pur mantenendo il taglio operativo (griglia numeri, timeline in mono per gli orari).

---

## Piano

### A. Edge function `progress-public-data` (pubblica, no JWT)
- Input: `{ token }`
- Valida `progress_tokens` (attivo + non scaduto) con service role
- In base a `audience` + flag (`show_timeline`, `show_addresses`, `show_vendor_contacts`, `show_operational_numbers`, `show_memories_qr`, ecc.), assembla e restituisce:
  - `wedding`: nomi, data, orari, venue, indirizzi, dress_code, note logistiche, target
  - `events`: timeline (se abilitata)
  - `contacts`: coppia + planner/co-planner (nome/ruolo, no telefoni) se abilitato
  - `ops`: adulti/bambini/staff/totale/dietary/tavoli calcolati con `buildGuestScenarios` lato server (stessa logica canonica dell'app → **numeri coerenti con il resto del sito**)
  - `cameraToken`: token camera attiva per QR memories (se abilitato)
- Registrata in `supabase/config.toml` con `verify_jwt = false`

### B. Refactor `GuestsProgressView` e `VendorsProgressView`
- Rimpiazzare tutte le `supabase.from(...)` con una singola `supabase.functions.invoke("progress-public-data", { body: { token } })`
- Nessun cambio di feature funzionale, solo cambio sorgente dati → i numeri appariranno correttamente

### C. Restyle vista fornitori in linea con WedsApp
- Header: rimossa icona "chiave inglese"; adottato lo stesso header sobrio della vista ospiti (nomi in serif elegante, data in italiano, badge "Briefing fornitori" discreto)
- Palette: token semantici (`bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, accent `primary`), niente `slate-*` hardcoded
- Card numeri: card neutre con bordo sottile, il "Totale coperti" evidenziato con `bg-primary/5` + bordo `primary/30` invece del blocco nero
- Timeline: stesso layout mono-time della vista ospiti, con divisori sottili
- Indirizzi: card cliccabili verso Google Maps, tipografia coerente
- Footer discreto "Creato con WedsApp"

### D. Nessuna nuova migration
Le tabelle restano chiuse ad `anon` (lo stato attuale è sicuro). L'unica policy anon che rimane è quella su `progress_tokens`, che serve al client per capire subito se il link è valido prima di chiamare l'edge function (utile anche per messaggi di errore precoci); in alternativa possiamo rimuoverla e affidarci solo alla function — segnalatemi la preferenza, di default la lascio.

---

### Dettagli tecnici
- L'edge function importa `buildGuestScenarios` copiandone la logica (o duplica il minimo indispensabile in TS Deno) per non rompere l'isolamento tra client e functions
- Il payload rispetta rigorosamente i flag: se `show_vendor_contacts=false` la function **non** include `contacts` nel JSON, così i dati sensibili non partono nemmeno via rete
- La vista ospiti manterrà `show_countdown/show_location/show_dress_code/show_memories_qr` invariati

### File toccati
- **Nuovo**: `supabase/functions/progress-public-data/index.ts`
- **Modificato**: `supabase/config.toml` (registrazione function, `verify_jwt = false`)
- **Modificato**: `src/components/progress/VendorsProgressView.tsx` (restyle + nuovo data source)
- **Modificato**: `src/components/progress/GuestsProgressView.tsx` (nuovo data source, stile invariato)
