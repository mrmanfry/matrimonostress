
# Fix: Invito collaboratore fallisce (weddingId mancante)

## Problema

La edge function `send-wedding-invitation` si aspetta un campo `weddingId` nel body della richiesta per verificare che l'utente abbia il ruolo `co_planner` su quel matrimonio. Ma il codice in `Settings.tsx` (riga 292-301) non lo include nel body inviato alla funzione.

Il log della edge function conferma: `invalid input syntax for type uuid: "undefined"` -- il `weddingId` arriva come `undefined`, la query SQL fallisce e restituisce 403.

## Soluzione

### File: `src/pages/Settings.tsx`

Aggiungere `weddingId: wedding.id` al body della chiamata `supabase.functions.invoke('send-wedding-invitation')` alla riga 293:

```typescript
const { error: emailError } = await supabase.functions.invoke('send-wedding-invitation', {
  body: {
    email: inviteEmail,
    weddingId: wedding.id,          // <-- AGGIUNTO
    weddingNames: `${wedding.partner1_name} & ${wedding.partner2_name}`,
    weddingDate: wedding.wedding_date,
    role: inviteRole,
    accessCode: wedding.access_code,
    inviterName: inviterName,
  },
});
```

Nessuna modifica necessaria alla edge function -- il campo `weddingId` e gia previsto nell'interfaccia `InvitationEmailRequest`.

## Nota sui Permessi Configurabili

I permessi per il Planner Professionista si configurano nella sezione **Impostazioni > Team** tramite il componente `PlannerPermissionsCard`, che appare automaticamente quando almeno un utente con ruolo "planner" e presente nel team. I due toggle disponibili sono:

1. **Gestione Budget Globale** -- controlla se il Planner puo vedere Tesoreria e Budget
2. **Costi e Pagamenti Fornitori** -- controlla se il Planner puo vedere cifre e piani pagamento

Questi toggle aggiornano il campo `permissions_config` (JSONB) nella tabella `user_roles` per tutti i ruoli planner del matrimonio. Non serve alcuna modifica a questa parte: funziona correttamente, ma diventa visibile solo dopo che un planner accetta l'invito.
