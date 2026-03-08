

## Fix: Preferenze alimentari configurabili nel RSVP + checkbox non cliccabili

Due problemi da risolvere:

### Problema 1: Checkbox non cliccabili
Il wrapping `<label>` attorno ai `<Checkbox>` Radix causa un doppio-toggle (label propaga click → ON, checkbox gestisce click nativo → OFF). Risultato: nessun cambiamento visibile.

**Fix**: Sostituire `<label>` con `<div>` in tutte le istanze dei checkbox nella sezione preferenze alimentari e plus-one.

### Problema 2: Le opzioni dietetiche configurate in Catering non arrivano al RSVP
Il flusso dati è interrotto:
- `rsvp-handler` (edge function) **non legge** `catering_config` dalla tabella weddings
- `RSVPPublic.tsx` **non passa** `cateringConfig` a `FormalInviteView`
- Risultato: il form RSVP mostra sempre e solo Vegetariano/Vegano hardcoded, ignorando le opzioni configurate (es. Celiaco)

### Modifiche

**1. `supabase/functions/rsvp-handler/index.ts`**
- Aggiungere `catering_config` alla select della query wedding (riga ~146)
- Includere `cateringConfig` nella response JSON

**2. `src/pages/RSVPPublic.tsx`**
- Estrarre `cateringConfig` dalla risposta del fetch
- Passarlo come prop a `<FormalInviteView cateringConfig={...} />`

**3. `src/components/rsvp/FormalInviteView.tsx`**
- Sostituire tutti i `<label>` wrapper dei checkbox con `<div>` (righe ~589, ~638, ~660, ~668)
- Rendere dinamiche le opzioni dietetiche del plus-one usando `cateringConfig` (attualmente hardcoded Vegetariano/Vegano alle righe 660-675)

