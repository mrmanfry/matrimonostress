## Obiettivo

Eliminare l'incoerenza nel pannello di dettaglio invitato dove il pallino appare verde ("confermato") mentre la label dice "In attesa", e dove lo step del Percorso mostra "RSVP confermato" anche quando l'RSVP è solo atteso.

## Cambi (un solo file: `src/components/guests/v2/detail/GuestDetailView.tsx`)

### 1. Pallino di stato basato su `rsvp_status` reale

Sostituire l'uso di `deriveGuestStatus` (che promuove `std_response='likely_yes'` a "confirmed") con una funzione locale che riflette lo stato RSVP effettivo:

- `confirmed` → verde (anche per `is_couple_member`)
- `declined` → rosso
- `std_response` ∈ {`likely_yes`, `unsure`} senza RSVP ricevuto → ambra ("maybe")
- `std_response = 'likely_no'` senza RSVP → rosso tenue ("declined" soft) oppure ambra — uniformiamo ad ambra per non confondere con un rifiuto reale
- altrimenti → grigio ("pending")

Il pallino viene usato in 2 punti (header badge + riga "RSVP" nel body): entrambi useranno la nuova logica.

### 2. Label coerente

La `statusLabel` continuerà a derivare dal `rsvp_status` reale, ma aggiungiamo il caso intermedio quando c'è una preferenza STD:

- `confirmed` → "Confermato"
- `declined` → "Rifiutato"
- `std_response='likely_yes'` & RSVP pending → "Probabile sì"
- `std_response='likely_no'` & RSVP pending → "Probabile no"
- `std_response='unsure'` & RSVP pending → "Forse"
- altrimenti → "In attesa"

Così pallino e label raccontano la stessa storia.

### 3. Step "Percorso" dinamico

Nello step RSVP del `PercorsoStepper`, l'etichetta diventa funzione dello stato:

- `done` (confirmed) → "RSVP confermato"
- `done` (declined) → "RSVP rifiutato"
- `current` (invito inviato, in attesa) → "In attesa risposta RSVP"
- altrimenti → "RSVP"

## Out of scope

- Nessuna modifica a `GuestStatusDot.tsx`, `deriveGuestStatus`, `deriveNucleusStatus` o ad altri consumer (card nucleo, KPI funnel). Il fix è localizzato al pannello dettaglio per non alterare il comportamento aggregato.
- Nessun cambio di business logic / query / RLS.
