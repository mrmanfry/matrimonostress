

# Notifiche Email per Messaggi Chat (Planner ↔ Sposi)

## Obiettivo
Quando il planner invia un messaggio, gli sposi ricevono un'email di notifica. Quando gli sposi scrivono, il planner riceve un'email. Bidirezionale.

## Approccio

### 1. Nuova Edge Function `notify-chat-message`

Creazione di `supabase/functions/notify-chat-message/index.ts` che:

- Riceve `{ wedding_id, sender_id, content, visibility }` come payload
- Usa il service role key per determinare chi notificare:
  - Se il sender è un **planner/manager** → notifica tutti i **co_planner** del matrimonio
  - Se il sender è un **co_planner** → notifica il **planner** del matrimonio
- Ignora messaggi con `visibility = "couple"` per il planner (non li vede)
- Recupera l'email dei destinatari via `auth.admin.getUserById()`
- Invia email via Resend (già configurato) con template branded
- Aggiunge un link diretto alla chat (`APP_URL/app/chat`)
- Rate limiting: non invia se l'ultimo messaggio notificato allo stesso utente per lo stesso wedding è stato < 5 minuti fa (per evitare spam in conversazioni attive)

### 2. Integrazione nel flusso di invio messaggio

In `src/pages/Chat.tsx` e `src/pages/PlannerInbox.tsx`, dopo l'insert del messaggio (quando non c'è errore), invocare la edge function:

```typescript
// Dopo insert riuscito
supabase.functions.invoke("notify-chat-message", {
  body: { wedding_id: weddingId, sender_id: userId, content, visibility }
});
```

Fire-and-forget (non blocca la UI).

### 3. Tabella di throttling (opzionale ma consigliata)

Per evitare email flood durante conversazioni in tempo reale, usare un approccio semplice nella edge function: controllare l'ultimo messaggio nella tabella `messages` per lo stesso wedding dove il sender è diverso dal destinatario, e inviare solo se non ci sono messaggi recenti (< 5 min) già notificati. Implementato interamente nella edge function senza nuove tabelle — usa un semplice check temporale sui messaggi esistenti.

### 4. Configurazione

- `verify_jwt = false` in config.toml per la function (validazione JWT interna)
- Usa secrets già disponibili: `RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `APP_URL`

## File da creare/modificare

| File | Azione |
|------|--------|
| `supabase/functions/notify-chat-message/index.ts` | **Nuovo** — Edge function notifica email |
| `supabase/config.toml` | Aggiungere config per la nuova function |
| `src/pages/Chat.tsx` | Aggiungere invoke dopo invio messaggio |
| `src/pages/PlannerInbox.tsx` | Aggiungere invoke dopo invio messaggio |

## Template Email

Email semplice e branda con:
- Header colorato (gradient indaco come le altre email)
- "Hai un nuovo messaggio da [Nome Mittente]"
- Preview del contenuto (troncato a ~200 char)
- CTA "Vai alla Chat →"
- Footer WedsApp

