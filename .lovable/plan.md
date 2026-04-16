
Sì, torna corretto sul singolo. Ecco la logica:

## Come funziona

Ogni `unique_rsvp_token` è legato a **un singolo guest** nel DB. Quando si apre il link RSVP, l'edge function `rsvp-handler` carica:
- `guest` = il proprietario del token (chi ha ricevuto il link)
- `party.members` = tutti i membri del nucleo (se il guest ha un `party_id`), oppure solo lui stesso (virtual party con `id` che inizia con `virtual-`)

In `RSVPPublic.tsx` viene calcolato `isSingleGuest = party.id.startsWith('virtual-')` e passato a `FormalInviteView`.

## Comportamento dopo la modifica

**Caso 1 — WhatsApp singolo** (es. invito mandato solo a Marco, senza nucleo):
- `isSingleGuest = true` → `buildThankYouName()` ritorna `displayName` (alias o nome di Marco)
- Risultato: **"Grazie Marco!"** ✅

**Caso 2 — WhatsApp a un membro del nucleo** (es. token di Giulia che ha party con Gabriele e Cosimo):
- `isSingleGuest = false`, `members.length = 3`
- Risultato: **"Grazie Giulia, Gabriele e Cosimo!"**
- Questo è coerente perché Giulia sta confermando per tutto il nucleo (il form RSVP mostra tutti e 3)

**Caso 3 — QR cartaceo nucleo** (stesso token di Giulia stampato sull'invito famiglia):
- Identico al Caso 2 → **"Grazie Giulia, Gabriele e Cosimo!"** ✅

## Conclusione

La logica è già corretta: il discriminante non è "via WhatsApp vs QR", ma **se il token rappresenta un singolo guest o un nucleo**. Se mandi WhatsApp a una persona singola senza nucleo, vedrà il suo nome; se mandi a un membro di nucleo, vedrà tutti i nomi (corretto perché sta confermando per tutti).

Il piano precedente resta valido così com'è. Confermi di procedere?
