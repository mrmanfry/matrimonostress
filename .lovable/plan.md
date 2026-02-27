

# Switch di Ruolo "Sposo / Planner" -- Modello Airbnb

## Problema Attuale

Oggi il sistema tratta tutti gli utenti allo stesso modo: chi ha 2+ matrimoni vede il Cockpit nel sidebar, altrimenti no. Ma la realta e diversa:

- **Uno sposo** vuole atterrare direttamente nella Dashboard del suo matrimonio. Il Cockpit non gli serve.
- **Un wedding planner** vuole atterrare nel Cockpit e navigare tra i matrimoni dei clienti. La Dashboard singola e secondaria.
- **Un caso ibrido** (es. Filippo, sia sposo che manager) deve poter switchare tra le due "modalita".

## Soluzione: Concetto di "Modalita Attiva"

Introduciamo una `activeMode: 'couple' | 'planner'` nel contesto Auth, persistita in `localStorage`. Funziona come il toggle Host/Guest di Airbnb.

### Come si determina la modalita

```text
Al login / page load:
1. Leggi activeMode da localStorage
2. Se non presente, inferisci:
   - Se l'utente ha ALMENO un ruolo 'planner' -> activeMode = 'planner'
   - Altrimenti -> activeMode = 'couple'
3. L'utente puo switchare in qualsiasi momento
```

### Cosa cambia per modalita

| Aspetto | Modalita "Sposo" | Modalita "Planner" |
|---------|-----------------|-------------------|
| Landing page dopo login | `/app/dashboard` (matrimonio attivo) | `/app/planner` (cockpit) |
| Sidebar | Dashboard, Invitati, Budget, Tesoreria, Fornitori, Checklist, Calendario, Tavoli, Timeline, Impostazioni | Cockpit (prima voce), poi le stesse voci per il matrimonio selezionato |
| Header | "Marco & Giulia - 45 giorni" | "Cockpit Planner" o "Marco & Giulia" se dentro un matrimonio |
| Footer sidebar | Countdown matrimonio | Nascosto o generico |
| WorkspaceSwitcher | Mostra solo i matrimoni "propri" (co_planner/owner) | Mostra tutti i matrimoni gestiti |

### Switch di Modalita -- UI

Nel **SidebarHeader**, sotto il logo/workspace switcher, appare un toggle discreto simile ad Airbnb:

```text
+----------------------------------+
|  [Heart] WedsApp                 |
|  [Toggle: Sposo | Planner]      |  <-- solo se ha entrambi i profili
+----------------------------------+
```

Il toggle e visibile SOLO se l'utente ha sia matrimoni "propri" (ruolo co_planner/owner) sia matrimoni come "planner". Se ha solo un tipo, non serve il toggle e la modalita e fissa.

## Dettagli Tecnici

### File: `src/contexts/AuthContext.tsx`

Modifiche:
- Aggiungere `activeMode: 'couple' | 'planner'` allo stato `AuthState` (solo nel caso `authenticated`)
- Aggiungere `switchMode(mode: 'couple' | 'planner')` al context
- Aggiungere `hasMultiplePersonas: boolean` (computed: ha sia matrimoni come owner/co_planner che come planner)
- Persistere `activeMode` in localStorage (`wedsapp_active_mode`)
- All'init, inferire la modalita: se l'utente ha almeno un ruolo `planner` e nessun matrimonio proprio, default `planner`; se ha solo matrimoni propri, default `couple`; se ha entrambi, leggi da localStorage o default `couple`

### File: `src/pages/AppLayout.tsx`

Modifiche:
- Leggere `activeMode` dal context
- Sidebar navigation condizionale: in modalita `planner`, "Cockpit" e la prima voce
- In modalita `couple`, il cockpit non appare (a meno che non abbia comunque 2+ matrimoni propri -- ma e raro)
- Il toggle Sposo/Planner appare nel SidebarHeader solo se `hasMultiplePersonas`
- Il footer con countdown appare solo in modalita `couple` o quando si e dentro un matrimonio specifico

### File: `src/pages/AppLayout.tsx` -- Redirect Intelligente

Al mount di AppLayout, se la rotta e `/app` o `/app/dashboard`:
- Se `activeMode === 'planner'` e la rotta e `/app/dashboard` e NON si e appena fatto uno switchWedding, redirect a `/app/planner`
- Se `activeMode === 'couple'`, resta su `/app/dashboard`

### File: `src/components/workspace/WorkspaceSwitcher.tsx`

Modifiche:
- In modalita `couple`: mostra solo matrimoni con ruolo `co_planner`/`owner`
- In modalita `planner`: mostra tutti i matrimoni (soprattutto quelli con ruolo `planner`/`manager`)
- Aggiungere il toggle Sposo/Planner come primo elemento del dropdown (se `hasMultiplePersonas`)

### Nuovo file: `src/utils/modeStorage.ts`

Utility semplice per persistere la modalita attiva:
- `get(): 'couple' | 'planner' | null`
- `set(mode: 'couple' | 'planner'): void`
- `clear(): void`

### File: `src/guards/ProtectedRoute.tsx`

Modifiche minime:
- Quando `requireWedding` e true e `activeMode === 'planner'`, il redirect di default dopo login va a `/app/planner` invece che `/app/dashboard`

## Flusso Utente

### Caso 1: Wedding Planner puro (solo matrimoni come planner)
1. Login -> activeMode = `planner` (automatico, nessun toggle visibile)
2. Atterra su `/app/planner` (Cockpit)
3. Clicca "Apri" su un matrimonio -> switchWedding -> `/app/dashboard`
4. Nel sidebar vede "Cockpit" come prima voce per tornare indietro
5. Nessun countdown nel footer (non e il suo matrimonio)

### Caso 2: Sposo puro (solo il suo matrimonio)
1. Login -> activeMode = `couple` (automatico, nessun toggle visibile)
2. Atterra su `/app/dashboard`
3. Sidebar normale, countdown nel footer
4. Nessun Cockpit visibile

### Caso 3: Filippo (sia sposo che manager)
1. Login -> legge localStorage, default `couple`
2. Atterra su `/app/dashboard` del suo matrimonio
3. Nel sidebar header vede il toggle [Sposo | Planner]
4. Clicca "Planner" -> activeMode = `planner`, redirect a `/app/planner`
5. Vede il Cockpit con tutti i matrimoni che gestisce
6. Clicca "Sposo" -> torna a `/app/dashboard` del suo matrimonio

## File Coinvolti

| File | Tipo | Modifica |
|------|------|----------|
| `src/utils/modeStorage.ts` | Nuovo | Utility localStorage per activeMode |
| `src/contexts/AuthContext.tsx` | Modifica | Aggiungere activeMode, switchMode, hasMultiplePersonas |
| `src/pages/AppLayout.tsx` | Modifica | Toggle UI, navigation condizionale, redirect intelligente |
| `src/components/workspace/WorkspaceSwitcher.tsx` | Modifica | Filtrare matrimoni per modalita, toggle nel dropdown |
| `src/guards/ProtectedRoute.tsx` | Modifica | Redirect post-login basato su activeMode |

Nessuna modifica al database necessaria -- tutto e frontend/context.

