## Problema

Nel box "Attività recente" della pagina Inviti, gli ultimi RSVP confermati/declinati non compaiono in ordine corretto (es. Cristina Calò manca anche se ha appena confermato).

## Causa

In `src/pages/Invitations.tsx` (riga 175 `recentActivity`):

1. **Timestamp sbagliato per i confermati/declinati**: viene usato `g.formal_invite_sent_at` (= quando è stato spedito l'invito, spesso uguale per tutto il batch) invece del momento in cui l'ospite ha effettivamente risposto. Di conseguenza la lista è ordinata sulla data di invio, non sulla risposta, e Cristina (invito spedito tempo fa, conferma di oggi) finisce in fondo e viene tagliata dallo `slice(0, 4)`.
2. **Dedupe troppo aggressivo**: `map.set(\`${who}|${what}\`)` deduplica per `party_name + azione`, quindi se due nuclei diversi hanno lo stesso `party_name` (caso raro) o se più membri dello stesso nucleo confermano, viene mostrata solo una voce. Il "who" inoltre mostra solo il nome del nucleo, non la persona.
3. Nessuna colonna `rsvp_responded_at` esiste in DB: come proxy affidabile dell'ultima azione del guest c'è `updated_at` (cambia quando il guest risponde all'RSVP).

## Cambiamenti (solo frontend)

### 1. `src/hooks/useInvitationsData.ts`
- Aggiungere `updated_at` (e `last_name`, già presente; verificare) alla select di `guests`.
- Aggiungere il campo `updated_at: string` all'interfaccia `InvitationGuest`.

### 2. `src/pages/Invitations.tsx` — `recentActivity` useMemo
- Per le voci `rsvp_status === 'confirmed' | 'declined'`: usare `g.updated_at` come `ts` e per `when` (fallback su `formal_invite_sent_at` se mancante).
- Dedupe per `guest.id + tipo evento` invece che per `party_name + what`, così non si perdono persone diverse con la stessa azione.
- "who": mostrare il **nome del singolo guest** (`${first_name} ${last_name}`) per le azioni RSVP confermato/declinato (è la persona che ha risposto), mantenendo `party_name` per le voci aggregate STD se preferito — per coerenza visiva usiamo nome del guest in tutte le voci.
- Aumentare lo `slice` da 4 a 6 voci per dare più contesto.

### 3. Freschezza dati
- Ridurre `staleTime` di `invitations-guests` da 30s a 0 (o aggiungere `refetchOnWindowFocus: true`) così tornando sulla pagina i nuovi RSVP appaiono subito.

## Fuori scope
- Nessuna modifica DB / migration.
- Nessuna modifica al funnel o agli altri widget.
