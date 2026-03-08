

## Fix: Derivare lo stato RSVP dal nucleo (invite_parties) nel Catering

### Problema
La pagina Catering filtra `guests.rsvp_status === "confirmed"`, ma questo campo resta `'pending'` per quasi tutti gli ospiti. Lo stato reale è su `invite_parties.rsvp_status` (enum italiano: `'Confermato'`, `'Rifiutato'`, `'In attesa'`). Gli sposi hanno `guests.rsvp_status = 'confirmed'` (impostato all'auto-creazione) ma il filtro nel componente `CateringGuestTable` usa la stringa `"confirmed"` che potrebbe non matchare.

### Soluzione

**`src/pages/Catering.tsx`** — Nella query di caricamento:
1. Aggiungere `rsvp_status` al fetch delle `invite_parties`
2. Quando si costruisce l'array `enriched`, derivare l'`rsvp_status` effettivo di ogni guest:
   - Se il guest ha un `party_id`, usare lo stato del party mappato: `'Confermato'` → `'confirmed'`, `'Rifiutato'` → `'declined'`, `'In attesa'` → `'pending'`
   - Se il guest non ha `party_id`, usare `guests.rsvp_status` così com'è
3. Importare e usare gli helper da `src/lib/rsvpHelpers.ts` (`isConfirmed`, `isDeclined`, `isPending`) per la mappatura, dato che già gestiscono entrambi i formati (italiano e inglese)

### File da modificare
- `src/pages/Catering.tsx` — aggiungere `rsvp_status` al fetch parties, mappare status effettivo sugli ospiti

Nessun altro file da toccare: `CateringGuestTable`, `CateringKPIs` e `CateringByTable` filtrano già su `rsvp_status === "confirmed"`, che funzionerà una volta che il dato è mappato correttamente.

