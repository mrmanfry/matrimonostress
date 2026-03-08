

## Fix: Includere gli sposi nei conteggi Catering

### Problema
La query in `src/pages/Catering.tsx` (riga 51) esclude gli sposi con `.eq("is_couple_member", false)`. Questo causa un conteggio coperti errato — gli sposi mangiano e devono essere contati.

### Soluzione

**`src/pages/Catering.tsx`** — Rimuovere il filtro `.eq("is_couple_member", false)` dalla query guests. Mantenere `.eq("is_staff", false)` (lo staff ha conteggi separati sui vendor).

Gli sposi hanno già `rsvp_status = 'confirmed'` e non hanno `party_id`, quindi il `deriveRsvpStatus` li mapperà correttamente come "confirmed" e appariranno nei KPI e nella tabella dettaglio.

### File da modificare
- `src/pages/Catering.tsx` — rimuovere una riga (il filtro `is_couple_member`)

