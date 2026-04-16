
## Piano: Ordinamento alfabetico membri RSVP + ringraziamento personalizzato con AKA

### Problema
1. Nel form RSVP i membri del nucleo appaiono in ordine arbitrario (ordine DB). Devono essere: **adulti prima, bambini dopo, entrambi in ordine alfabetico per nome**.
2. La schermata di ringraziamento post-submit dice "Grazie [nome del titolare del token]". Deve invece dire **"Grazie [AKA o nome] di tutti i membri confermati"**, in ordine alfabetico, usando l'`alias` (AKA) se presente, altrimenti il `first_name`.
3. Anche se uno solo risponde dal proprio link WhatsApp ma conferma per tutto il nucleo, il ringraziamento deve elencare tutti gli AKA dei confermati.

### Indagine necessaria
Per implementare correttamente devo:
1. Verificare in `rsvp-handler/index.ts` che il payload `members` includa l'`alias` di ciascun guest (oggi ritorna `first_name`, `last_name`, ecc. — non sono certo includa `alias`).
2. Vedere `FormalInviteView.tsx` righe ~107-224 per capire come ordina oggi i membri e dove costruisce `buildThankYouName()`.

### Cambiamenti previsti

**1. Edge function `rsvp-handler/index.ts`** (se serve)
- Aggiungere `alias` al SELECT dei membri restituiti al frontend (probabilmente già selezionato con `*`, da verificare).

**2. `src/components/rsvp/FormalInviteView.tsx`**
- Ordinamento membri: prima del render delle card RSVP, ordinare `members` con:
  ```ts
  const sortedMembers = [...members].sort((a, b) => {
    if (a.is_child !== b.is_child) return a.is_child ? 1 : -1; // adulti prima
    return a.first_name.localeCompare(b.first_name, 'it'); // alfabetico italiano
  });
  ```
  Applicare anche al rendering nelle sezioni cerimonia/ricevimento se elencano membri.

- `buildThankYouName()`: riscrivere per usare i **membri confermati** (non solo il titolare del token):
  ```ts
  const confirmed = sortedMembers.filter(m => memberData[m.id]?.rsvpStatus === 'confirmed');
  const names = confirmed.map(m => m.alias?.trim() || m.first_name);
  // Formattazione italiana: "A", "A e B", "A, B e C"
  ```
  Se nessuno conferma (tutti declined), mostrare un messaggio diverso ("Ci dispiace non vederti…").

**3. `src/pages/RSVPPublic.tsx`** — verificare che l'`alias` sia popolato per ogni member nel `memberData` iniziale (oggi non lo passa, ma `FormalInviteView` riceve `members` direttamente da `party.members`, quindi basta che la edge function lo includa).

### Cosa NON cambia
- Logica di submit, promozione +1, theme, deadline, gift, FAQ.
- Form RSVP single guest (virtual party): l'ordinamento si applica anche lì naturalmente (1 solo membro).
- Il +1 promosso (Gianna) non comparirà nel ringraziamento di Alessandro perché viene creato **dopo** il submit; ma comparirà nel suo prossimo accesso al link (se ne ha uno proprio) o resterà invisibile nel ringraziamento immediato — comportamento accettabile in v1.

### File modificati
- `src/components/rsvp/FormalInviteView.tsx` (ordinamento + buildThankYouName)
- `supabase/functions/rsvp-handler/index.ts` (solo se `alias` non è già nel payload — da verificare in implementazione)
