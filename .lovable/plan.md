

# Sidebar Contestuale: Menu solo dentro il progetto

## Problema

Attualmente in modalita Planner il sidebar mostra SEMPRE tutte le voci di navigazione (Dashboard, Invitati, Budget, ecc.) anche quando il planner e nel Cockpit e non ha ancora selezionato un matrimonio specifico. Questo non ha senso: quelle voci sono relative a un singolo progetto.

Inoltre il toggle Sposo/Planner appare anche per chi ha un solo profilo (dove non serve).

## Soluzione

### 1. Toggle visibile solo per utenti con doppio profilo
Gia implementato: `ModeSwitcher` ritorna `null` se `!hasMultiplePersonas`. Nessuna modifica necessaria qui.

### 2. Sidebar condizionale in base alla rotta

La logica e semplice:

```text
Se activeMode === 'planner' E la rotta e /app/planner (cockpit):
  -> Sidebar mostra SOLO: Cockpit + Esci
  -> Nessun menu di navigazione progetto
  -> Nessun WorkspaceSwitcher (non serve, il cockpit e la panoramica)
  -> Header mostra "Cockpit Planner"

Se activeMode === 'planner' E la rotta e DENTRO un progetto (/app/dashboard, /app/guests, ecc.):
  -> Sidebar mostra: Cockpit (per tornare indietro) + tutte le voci progetto
  -> WorkspaceSwitcher visibile (per switchare tra matrimoni)
  -> Header mostra "Marco & Giulia"

Se activeMode === 'couple':
  -> Tutto invariato (sidebar completo, countdown, ecc.)
```

### 3. File da modificare

**`src/pages/AppLayout.tsx`** -- Modifiche principali:

- Introdurre una variabile `isOnCockpitView` (gia presente come `isOnCockpit`)
- Quando `activeMode === 'planner' && isOnCockpit`:
  - La navigation contiene solo `[{ name: "Cockpit", href: "/app/planner", icon: LayoutGrid }]`
  - Il `WorkspaceSwitcher` viene nascosto
  - Il footer countdown viene nascosto
  - Il `ModeSwitcher` resta visibile (per chi ha doppio profilo)
- Quando `activeMode === 'planner' && !isOnCockpit` (dentro un progetto):
  - La navigation include "Cockpit" come prima voce + tutte le voci progetto standard
  - Il `WorkspaceSwitcher` torna visibile
  - Appare un mini-header nel sidebar che mostra il nome del matrimonio attivo

**`src/components/workspace/ModeSwitcher.tsx`** -- Nessuna modifica (gia gestisce `hasMultiplePersonas`).

### 4. Dettaglio implementativo in AppLayout

La costruzione della `navigation` viene spostata dentro `AppLayoutInner` (che ha accesso a `location`) con questa logica:

```text
const isOnCockpit = location.pathname === '/app/planner';
const isPlannerMode = activeMode === 'planner';

if (isPlannerMode && isOnCockpit) {
  navigation = [] // nessun menu, solo cockpit page
} else {
  navigation = [
    ...(isPlannerMode ? [{ Cockpit -> /app/planner }] : []),
    Dashboard, Invitati, Budget, Tesoreria, Fornitori,
    Checklist, Calendario, Tavoli, Timeline, Impostazioni
  ]
}
```

Nel `SidebarHeader`:
- `WorkspaceSwitcher` visibile solo se `!(isPlannerMode && isOnCockpit)`
- `ModeSwitcher` sempre visibile (il componente stesso gestisce la logica `hasMultiplePersonas`)

Nel `SidebarFooter`:
- Countdown nascosto se `isPlannerMode && isOnCockpit`
- Il bottone "Esci" resta sempre visibile

Questo crea un'esperienza pulita: il planner atterra nel cockpit con sidebar minimalista, clicca su un matrimonio, e il sidebar si "espande" con tutte le voci di navigazione del progetto selezionato.
