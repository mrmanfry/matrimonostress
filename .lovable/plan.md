

# Piano di Implementazione: Capitoli 1-3 (Executive Briefing)

## Analisi dello Stato Attuale

Il sistema ha gia una solida base multi-tenant:
- **RBAC**: `user_roles` con enum `app_role` (co_planner, planner, manager, guest)
- **RLS**: Policy basate su `has_wedding_access()` e `has_wedding_role()`
- **Multi-tenant**: `WorkspaceSwitcher`, `ModeSwitcher`, `PlannerCockpit`
- **Permessi granulari**: Sistema 3 livelli (View/Edit/Create) per area, appena implementato

Quello che **manca** sono i Capitoli 2 e 3: Task Delegati e Chat.

---

## Fase 1: Task Delegati (Capitolo 2)

### 1.1 Migrazione Database

Aggiungere colonne alla tabella `checklist_tasks`:

```text
ALTER TABLE checklist_tasks ADD COLUMN delegated_by_user_id UUID REFERENCES auth.users(id);
ALTER TABLE checklist_tasks ADD COLUMN delegated_at TIMESTAMPTZ;
ALTER TABLE checklist_tasks ADD COLUMN completed_at TIMESTAMPTZ;
ALTER TABLE checklist_tasks ADD COLUMN completed_by_user_id UUID REFERENCES auth.users(id);
```

Nessuna nuova tabella necessaria -- riusiamo `checklist_tasks` con campi extra.

### 1.2 Frontend: Badge "Assegnato dal Planner"

**File**: `src/pages/Checklist.tsx`
- Aggiungere `delegated_by_user_id` e `delegated_at` all'interfaccia `Task`
- Nella query Supabase, selezionare anche i nuovi campi
- Nel rendering dei task, mostrare un badge visivo "Richiesto dal Planner" quando `delegated_by_user_id` e presente
- Il badge usa un colore distinto (es. blu) con icona utente

**File**: `src/components/checklist/DelegatedBadge.tsx` (nuovo)
- Componente riutilizzabile con icona e nome planner

### 1.3 Azione "Delega Task" (Vista Planner)

**File**: `src/pages/Checklist.tsx`
- Quando il planner crea un task in un matrimonio dove il suo ruolo e `planner`, il campo `delegated_by_user_id` viene valorizzato automaticamente con il suo `user.id`
- Possibilita di convertire un task esistente in "delegato" tramite menu contestuale

### 1.4 Audit Trail

- Al completamento di un task, salvare `completed_at = NOW()` e `completed_by_user_id = auth.uid()`
- Visibile al planner nella card del task

### 1.5 Sincronizzazione Realtime

- Abilitare `ALTER PUBLICATION supabase_realtime ADD TABLE checklist_tasks`
- Nella vista PlannerCockpit, sottoscriversi ai cambiamenti di stato per aggiornare KPI e feed in tempo reale

---

## Fase 2: Sistema Chat (Capitolo 3)

### 2.1 Migrazione Database

Creare 2 nuove tabelle:

```text
-- Messaggi
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'all' CHECK (visibility IN ('couple', 'all')),
  message_type TEXT NOT NULL DEFAULT 'user' CHECK (message_type IN ('user', 'system')),
  system_action_type TEXT,       -- 'task_created', 'task_completed', etc.
  system_action_ref_id UUID,     -- ID del task/payment collegato
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Conferme di lettura
CREATE TABLE message_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id)
);
```

Abilitare Realtime:
```text
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE message_reads;
```

### 2.2 RLS Policies

```text
-- messages: Tutti i membri vedono i messaggi 'all'
-- Solo co_planner vedono i messaggi 'couple'
-- Il planner NON vede mai i messaggi 'couple'
```

Policy chiave:
- **SELECT**: `has_wedding_access(uid, wedding_id) AND (visibility = 'all' OR role IN ('co_planner'))`
- **INSERT**: `has_wedding_access(uid, wedding_id) AND sender_id = uid`
- **No UPDATE/DELETE** (messaggi immutabili per MVP)

### 2.3 Frontend: Pagina Chat (Vista Sposi)

**Nuova route**: `/app/chat`

**File**: `src/pages/Chat.tsx` (nuovo)
- Thread singolo per il matrimonio attivo
- Toggle "Privato / Condiviso con Planner":
  - Privato: sfondo grigio, icona lucchetto
  - Condiviso: sfondo con bordo primario, placeholder "Scrivi a [Nome Planner]..."
- Infinite scroll: carica ultimi 50 messaggi, poi paginazione cursor-based
- Messaggi di sistema (card centrate, stile notifica)
- Optimistic UI: messaggio appare subito, fallback in caso di errore
- Typing indicator via Supabase Presence

**File**: `src/components/chat/ChatMessage.tsx` (nuovo)
- Bolla messaggio con timestamp, read receipt, icona lucchetto per messaggi privati

**File**: `src/components/chat/VisibilityToggle.tsx` (nuovo)
- Toggle Privato/Condiviso con cambio colore dell'input area

### 2.4 Frontend: Inbox Planner (Vista Planner)

**File**: `src/pages/PlannerInbox.tsx` (nuovo)
- Layout a 2 colonne (desktop) / drill-down (mobile)
- Colonna sinistra: lista matrimoni con ultimo messaggio, badge non-letti, ordinata per ultimo messaggio
- Colonna destra: thread attivo del matrimonio selezionato
- Bottone "Vai ai dettagli Matrimonio" nella testata

**Nuova route**: `/app/inbox` (visibile solo in planner mode)

### 2.5 Messaggi Automatici (Bridge Task-Chat)

Quando il planner crea un task delegato, inserire automaticamente un messaggio di sistema:

```text
INSERT INTO messages (wedding_id, sender_id, content, visibility, message_type, system_action_type, system_action_ref_id)
VALUES (wedding_id, planner_user_id, 'Ti ho assegnato un nuovo task: [Titolo] con scadenza il [Data]', 'all', 'system', 'task_created', task_id);
```

Deep link nel messaggio: cliccando si naviga a `/app/checklist?highlight=task_id`.

### 2.6 Contatore Non-Letti (Sidebar)

**File**: `src/pages/AppLayout.tsx`
- Aggiungere voce "Chat" / "Messaggi" nella sidebar
- Badge numerico con conteggio messaggi non letti (query `messages LEFT JOIN message_reads`)

---

## Fase 3: Miglioramenti Cap. 1 (Gap Residui)

### 3.1 "Ultimo Accesso" degli Sposi

- Aggiungere colonna `last_seen_at TIMESTAMPTZ` alla tabella `profiles`
- Aggiornare via trigger o chiamata frontend al login
- Mostrare nel `PlannerCockpit` e `WeddingCard`: "Ultimo accesso: 2 ore fa"

### 3.2 Transfer Ownership

- Edge function `transfer-ownership` che cambia il `created_by` e ri-assegna i ruoli
- Accessibile solo dal co_planner corrente, nella sezione Settings

---

## Sequenza di Implementazione Consigliata

| Step | Cosa | Stima |
|------|------|-------|
| 1 | Migrazione DB: colonne task delegati | 10 min |
| 2 | Badge "Delegato" + auto-fill planner | 30 min |
| 3 | Audit trail (completed_at/by) | 15 min |
| 4 | Realtime su checklist_tasks | 10 min |
| 5 | Migrazione DB: tables messages + message_reads + RLS | 20 min |
| 6 | Pagina Chat sposi (thread singolo) | 45 min |
| 7 | Inbox Planner (multi-thread) | 45 min |
| 8 | Bridge task-chat (messaggi automatici) | 20 min |
| 9 | Contatore non-letti sidebar | 15 min |
| 10 | Last seen + Transfer Ownership | 20 min |

**Totale stimato: ~4 ore di sviluppo**

## Rischi e Mitigazioni

| Rischio | Mitigazione |
|---------|-------------|
| Data leak messaggi "couple" al planner | RLS rigida: `visibility = 'couple'` bloccato per ruolo planner. Test E2E obbligatorio |
| Race condition completamento task | Debounce 5s prima di generare notifica/messaggio di sistema |
| Limiti Realtime Supabase | MVP ok, monitorare connessioni concorrenti in produzione |
| Messaggi immutabili | Scelta deliberata per MVP -- nessun "elimina per tutti" |

## File Nuovi

- `src/pages/Chat.tsx`
- `src/pages/PlannerInbox.tsx`
- `src/components/chat/ChatMessage.tsx`
- `src/components/chat/VisibilityToggle.tsx`
- `src/components/chat/ChatInput.tsx`
- `src/components/chat/InboxList.tsx`
- `src/components/checklist/DelegatedBadge.tsx`

## File da Modificare

- `src/pages/AppLayout.tsx` (nuove voci sidebar)
- `src/pages/Checklist.tsx` (campi delegati, badge, audit)
- `src/pages/PlannerCockpit.tsx` (realtime, last seen)
- `src/App.tsx` (nuove route /app/chat, /app/inbox)
- `src/contexts/AuthContext.tsx` (nessuna modifica strutturale necessaria)

