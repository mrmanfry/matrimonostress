## Obiettivo

Applicare lo stesso allineamento "pallino+label = rsvp_status reale" già fatto in `GuestDetailView.tsx` anche a `PartyDetailView.tsx`, dove le righe membro del nucleo mostrano "Confermato" per ospiti come Ariana Cristogel anche quando hanno solo risposto `likely_yes` al Save the Date (RSVP ancora pending).

## Causa

In `PartyDetailView.tsx` (riga 74) `MemberRow` usa `deriveGuestStatus` che promuove `std_response='likely_yes'` a `confirmed`. La label (riga 108) deriva poi dallo status calcolato → mostra "Confermato" anche senza RSVP.

## Cambi (un solo file: `src/components/guests/v2/detail/PartyDetailView.tsx`)

1. **`MemberRow`**: sostituire `deriveGuestStatus` con la stessa logica usata in `GuestDetailView`:
   - status: `confirmed` solo se `rsvp_status='confirmed'` o `is_couple_member`; `declined` se rifiutato; `maybe` per `std_response ∈ {likely_yes, likely_no, unsure}` con RSVP pending; altrimenti `pending`.
   - label coerente: "Confermato" / "Rifiutato" / "Probabile sì" / "Probabile no" / "Forse" / "In attesa".

2. **Step "Percorso" del nucleo** (righe 146-150): rendere dinamica l'etichetta dello step RSVP:
   - done+confermato → "RSVP confermato"
   - done+rifiutato → "RSVP rifiutato"
   - current (invito inviato, in attesa) → "In attesa risposta RSVP"
   - altrimenti → "RSVP"

3. Rimuovere l'import inutilizzato di `deriveGuestStatus` se non più usato (mantenere `deriveNucleusStatus` se ancora referenziato altrove nel file).

## Out of scope

Nessuna modifica a `GuestStatusDot.tsx`, `deriveGuestStatus`, `deriveNucleusStatus`, o ad altri consumer (KPI funnel, card nucleo, conteggi). Fix puramente di presentazione localizzato al pannello dettaglio nucleo.
