

# Messaggi nella Sidebar del Planner Cockpit

## Problema

Quando sei nella vista Planner Cockpit (`/app/planner`), la sidebar e completamente vuota -- nessuna voce di navigazione. La voce "Messaggi" (che porta all'Inbox multi-wedding) non e accessibile da li.

## Soluzione

### 1. Aggiungere "Messaggi" nella sidebar del Cockpit

**File**: `src/pages/AppLayout.tsx`

Modificare la logica di navigazione condizionale (linea 181-182): quando siamo in `isPlannerMode && isOnCockpit`, invece di `navigation = []`, mostrare almeno la voce "Messaggi" con il badge dei non-letti.

```text
Prima:  if (isPlannerMode && isOnCockpit) { navigation = []; }
Dopo:   if (isPlannerMode && isOnCockpit) { navigation = [{ name: "Messaggi", href: "/app/inbox", icon: MessageCircle, badge: unreadCount }]; }
```

### 2. Aggiornare contatore non-letti per Planner (multi-wedding)

Attualmente il contatore non-letti si basa solo sul `activeWeddingId`. Per il planner nel Cockpit, deve contare i non-letti su **tutti** i matrimoni gestiti.

**File**: `src/pages/AppLayout.tsx`

- Quando `isPlannerMode`, calcolare gli unread su tutti i `weddingIds` (non solo `activeWeddingId`)
- Usare una query che filtra per `wedding_id IN (...)` invece di `eq`

Questo rende il badge accurato sia nella vista Cockpit che dentro un singolo matrimonio.

## Risultato

- Nella sidebar del Cockpit Planner appare la voce "Messaggi" con badge non-letti aggregato
- Cliccando si apre `/app/inbox` con la lista di tutti i matrimoni come thread di chat
- L'Inbox gia esistente (2 colonne desktop, drill-down mobile) funziona senza modifiche

## File da Modificare

| File | Modifica |
|------|----------|
| `src/pages/AppLayout.tsx` | Aggiungere "Messaggi" nella nav del Cockpit + contatore multi-wedding |

