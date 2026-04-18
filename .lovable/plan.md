
## Diagnosi: 4 sorgenti di verità diverse per "Confermati"

Stato reale DB nucleo Focolari (party `Ginevra, Fabrizio e Claudio`, `party.rsvp_status = 'Confermato'`):
- **Ginevra** → guest.rsvp_status = `confirmed` ✅
- **Fabrizio** → guest.rsvp_status = `confirmed` ✅  
- **Claudio** (bambino) → guest.rsvp_status = `declined` ❌ (correttamente declined)

Stato globale: 2 sposi + 2 confermati Focolari = **4 confermati totali**, 1 declined.

### Le 4 logiche divergenti che ho trovato

| Sezione | File | Logica | Risultato | Corretto? |
|---|---|---|---|---|
| **Catering / Campagne / Invitations** | `Catering.tsx`, `useInvitationsData.ts`, `FunnelKPICards.tsx` | `guest.rsvp_status === 'confirmed'` + couple | **4** | ✅ |
| **Dashboard widget** | `GuestSummaryWidget` via `useGuestMetrics` | `guest.rsvp_status === 'confirmed'` (regular) + couple sempre confermato | **2 + 1 +1** | ⚠️ mostra "1 +1 già confermati" che è il **legacy fallback** sul campo `plus_one_name` (che non viene mai pulito quando si rimuove un +1) |
| **Pagina Invitati** `/app/guests` | `Guests.tsx` righe 982-1003 | `parties.find(p.id === g.party_id).rsvp_status === 'Confermato'` → **conta TUTTI i membri del nucleo** (incluso Claudio declined) | **5** = 2 sposi + 3 Focolari (Ginevra + Fabrizio + Claudio erroneamente) | ❌ **BUG** |

### Causa root del bug "5 confermati" su /app/guests

```ts
// src/pages/Guests.tsx:983-986
const confirmedGuests = allGuests.filter(g => {
  const party = parties.find(p => p.id === g.party_id);
  return party?.rsvp_status === 'Confermato';   // ← ignora il declined del singolo membro
});
```

Questa logica usa lo stato **del nucleo** (`invite_parties.rsvp_status`) invece dello stato **del singolo guest**. Quando un nucleo è "Confermato" come party, tutti i suoi membri vengono contati come confermati anche se uno è `declined`. Claudio Focolari è declined ma il party è Confermato → viene contato.

### Causa root del "+1 già confermati" su Dashboard

Il legacy fallback `plus_one_name IS NOT NULL` continua a contare un +1 fantasma anche se ora abbiamo `plus_one_of_guest_id` come fonte autorevole. Sul DB c'è 1 guest con `plus_one_name` valorizzato e 0 `plus_one_of_guest_id` (Gianna è stata creata ma il legame non è scattato sul submit precedente).

## Soluzione: una sola Single Source of Truth

**Principio**: lo stato di confermazione è **per-guest**, mai per-nucleo. Il nucleo è un aggregato visivo.

### Helper centralizzato `src/lib/rsvpHelpers.ts`

Aggiungo:
```ts
export const isGuestConfirmed = (g: { rsvp_status?: string|null; is_couple_member?: boolean }) =>
  g.is_couple_member === true || isConfirmed(g.rsvp_status);

export const isGuestDeclined  = (g) => !g.is_couple_member && isDeclined(g.rsvp_status);
export const isGuestPending   = (g) => !isGuestConfirmed(g) && !isGuestDeclined(g);
```

### Fix mirati (no data reset, no migration)

1. **`src/pages/Guests.tsx`** righe 982-1003 → sostituire `confirmedGuests` con `allGuests.filter(isGuestConfirmed)`. Rimuovere il bonus `confirmedPlusOnesCount` legacy (i +1 promossi sono già righe in `guests` quindi vengono contati naturalmente).

2. **`src/hooks/useGuestMetrics.ts`** → `plusOnesConfirmed` deve preferire `COUNT(plus_one_of_guest_id IS NOT NULL)` e usare il legacy `plus_one_name` solo come fallback per host che NON hanno già un +1 promosso (escludere host già promossi). Stessa logica già introdotta in `Guests.tsx:962-968`, va replicata qui per coerenza Dashboard.

3. **`src/pages/Catering.tsx`** righe 92-101 → la funzione `deriveRsvpStatus` eredita dal nucleo se il guest è pending. È **ragionevole** per il flusso "il nucleo è confermato → conto i pending come confermati". Ma in combinazione con il declined del singolo è già protetta (riga 96 controlla `isDeclined` del singolo PRIMA del fallback). Lo lascio così — è coerente con la mia regola di "il singolo vince" e i numeri tornano (4).

4. **Dashboard**: deriva da `useGuestMetrics` aggiornato. Niente cambi diretti su `Dashboard.tsx`.

### Risultato atteso post-fix (verificato sui dati live)

| Sezione | Prima | Dopo |
|---|---|---|
| Dashboard "Confermati" | 2 + "1 +1 già confermati" | 4, "0 +1 già confermati" |
| /app/guests "Confermati" | 5 | 4 |
| Campagne "Confermati" | 4 | 4 |
| Catering "Confermati" | 4 | 4 |

### File modificati (nessuna migration, nessun reset dati)

- **MOD** `src/lib/rsvpHelpers.ts` — aggiunge `isGuestConfirmed/Declined/Pending`
- **MOD** `src/pages/Guests.tsx` — usa helper, rimuove logica party-based
- **MOD** `src/hooks/useGuestMetrics.ts` — preferisce `plus_one_of_guest_id` con fallback escludendo host promossi
- **(opz.)** `src/components/guests/FunnelKPICards.tsx`, `useInvitationsData.ts` — refactor cosmetico per usare l'helper (stesso risultato numerico)

### Note importanti

- **Nessun `UPDATE` sui dati**: gli stati live restano intatti.
- Il +1 fantasma "Gianna" (creata in prod prima del fix `syncPlusOneGuest`) ha `plus_one_name` ma non è collegata via `plus_one_of_guest_id`. Vuoi che la lasci così (verrà contata via legacy fallback) o preferisci che apra un punto separato per ricollegarla manualmente? **Per ora la lascio**: il fix esclude solo il doppio-conteggio, non cancella nulla.
- Prossimo invito che Alessandro modifica → `syncPlusOneGuest` aggiornerà correttamente Gianna con `plus_one_of_guest_id`.
