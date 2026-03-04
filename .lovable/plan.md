

# Messaggi: Comportamento Contestuale per il Planner

## Situazione Attuale

Quando il planner e dentro un matrimonio specifico, cliccando "Messaggi" nella sidebar viene portato a `/app/inbox` (la vista multi-wedding). Questo e sbagliato: dovrebbe vedere solo la chat del matrimonio attivo, come fa la coppia.

## Piano

### 1. Sidebar: routing condizionale per "Messaggi" (`src/pages/AppLayout.tsx`)

Cambiare la logica di navigazione:
- **Planner nel Cockpit** (`/app/planner`): "Messaggi" porta a `/app/inbox` (vista multi-wedding WhatsApp-like)
- **Planner dentro un matrimonio** (qualsiasi altra pagina): "Messaggi" porta a `/app/chat` (chat singola del matrimonio attivo)

```text
Prima:  "Messaggi", href: isPlannerMode ? "/app/inbox" : "/app/chat"
Dopo:   "Messaggi", href: (isPlannerMode && isOnCockpit) ? "/app/inbox" : "/app/chat"
```

Nella nav del cockpit (riga 190), resta `/app/inbox` -- gia corretto.

### 2. Chat.tsx: supporto planner dentro un matrimonio (`src/pages/Chat.tsx`)

Attualmente Chat.tsx mostra il toggle di visibilita solo per `co_planner`. Per il planner dentro un matrimonio, deve funzionare allo stesso modo ma senza il toggle (il planner vede solo messaggi `visibility: "all"`).

Nessuna modifica necessaria: Chat.tsx gia filtra in base alle RLS policies (il planner vede solo `visibility: "all"` grazie alla policy `can_see_couple_messages`). Il toggle `showVisibilityToggle` e gia `false` per non-co_planner.

### 3. Nessuna modifica a PlannerInbox.tsx

La pagina Inbox multi-wedding resta invariata -- funziona gia come WhatsApp con la lista dei matrimoni a sinistra e la chat a destra.

## File da Modificare

| File | Modifica |
|------|----------|
| `src/pages/AppLayout.tsx` | Cambiare href di "Messaggi" nella nav non-cockpit: usare `/app/chat` anche per il planner quando e dentro un matrimonio |

Modifica minima: una sola riga, cambiare la condizione dell'href da `isPlannerMode` a `isPlannerMode && isOnCockpit`.

