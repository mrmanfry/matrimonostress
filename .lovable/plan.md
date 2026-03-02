
# Completamento Piano: Modifiche Rimanenti

## Cosa manca

Tutti i componenti principali (Chat, Inbox, Badge Delegato, Audit Trail) sono gia implementati. Restano 5 integrazioni "collante" che collegano il tutto.

---

## 1. Bridge Task-Chat (Messaggio automatico)

**File**: `src/pages/Checklist.tsx`

Dopo l'inserimento di un task delegato (riga ~519, dopo `setTasks(prev => [...prev, data])`), inserire automaticamente un messaggio di sistema nella chat:

```text
INSERT INTO messages: {
  wedding_id, sender_id (planner), 
  content: "Ti ho assegnato un nuovo task: [Titolo] con scadenza il [Data]",
  visibility: "all", message_type: "system",
  system_action_type: "task_created",
  system_action_ref_id: task.id
}
```

Il deep link nel ChatMessage.tsx navighera a `/app/checklist?task_id=<id>` al click sui messaggi di sistema.

## 2. Aggiornamento `last_seen_at`

**File**: `src/contexts/AuthContext.tsx`

Dopo il caricamento del contesto utente (quando `authState` diventa `authenticated`), fare un `UPDATE profiles SET last_seen_at = NOW() WHERE id = user.id`. Una sola chiamata, non ad ogni render.

## 3. Mostrare "Ultimo accesso" nel Cockpit Planner

**File**: `src/pages/PlannerCockpit.tsx`
- Nella query `crossData`, aggiungere una fetch di `profiles.last_seen_at` per tutti gli utenti co_planner dei matrimoni gestiti.

**File**: `src/components/planner/WeddingCard.tsx`
- Aggiungere prop `lastSeenAt?: string` a `WeddingCardData`
- Mostrare "Ultimo accesso: 2h fa" sotto la data del matrimonio, usando `formatDistanceToNow` di date-fns

## 4. Badge messaggi non letti nella Sidebar

**File**: `src/pages/AppLayout.tsx`
- Aggiungere un contatore non-letti con query Supabase (messaggi dove `sender_id != userId` e non presenti in `message_reads` per l'utente corrente)
- Mostrare un badge numerico rosso accanto a "Messaggi" nella sidebar
- Sottoscriversi a Realtime su `messages` per aggiornare il contatore in tempo reale

## 5. Realtime checklist_tasks nel PlannerCockpit

**File**: `src/pages/PlannerCockpit.tsx`
- Aggiungere subscription Supabase Realtime su `checklist_tasks` (gia abilitato nel DB)
- Al ricevimento di un UPDATE (status cambiato), invalidare la query `planner-cockpit` per aggiornare KPI e feed

---

## File da Modificare

| File | Modifica |
|------|----------|
| `src/pages/Checklist.tsx` | Inserire messaggio di sistema dopo creazione task delegato |
| `src/contexts/AuthContext.tsx` | Aggiornare `last_seen_at` al login |
| `src/pages/PlannerCockpit.tsx` | Fetch `last_seen_at`, Realtime subscription |
| `src/components/planner/WeddingCard.tsx` | Prop e UI "Ultimo accesso" |
| `src/pages/AppLayout.tsx` | Badge non-letti per "Messaggi" |
| `src/components/chat/ChatMessage.tsx` | Click handler per messaggi di sistema (deep link) |

## Dettagli Tecnici

### Bridge Task-Chat
- Il messaggio viene inserito lato frontend subito dopo il successo dell'insert del task
- Se l'insert del messaggio fallisce, non blocca il flusso (fire-and-forget)
- `system_action_ref_id` contiene l'UUID del task per il deep link

### Badge Non-Letti
- Query iniziale: `SELECT COUNT(*) FROM messages WHERE wedding_id = X AND visibility = 'all' AND sender_id != me AND id NOT IN (SELECT message_id FROM message_reads WHERE user_id = me)`
- Realtime: incrementa al ricevimento di nuovi messaggi, decrementa quando l'utente apre la chat

### Last Seen
- Aggiornamento una sola volta per sessione (flag `useRef` per evitare chiamate multiple)
- `formatDistanceToNow(lastSeenAt, { addSuffix: true, locale: it })` per display "2 ore fa"
