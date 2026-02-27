

# Piano di Implementazione: Modulo Wedding Planner (B2B2C) - Fase 1 MVP

## Premessa

Il documento funzionale copre 6 capitoli e 3 fasi di rilascio. Questo piano si concentra esclusivamente sulla **Fase 1 (MVP)** come definita nel Capitolo 6, ovvero le fondamenta necessarie per abilitare la collaborazione Planner-Coppia.

---

## Cosa esiste gia

L'app ha gia una base solida su cui costruire:

- **Tabella `user_roles`** con enum `app_role` = `co_planner`, `manager`, `guest`
- **Tabella `wedding_invitations`** con flusso di invito via email
- **RLS basata su `has_wedding_role()`** e `has_wedding_access()`
- **RPC `get_user_context()`** che ritorna un singolo `wedding_id` + `role`
- **`AuthContext`** con stato `authenticated` che include `weddingId` e `role`
- **Onboarding** con selezione ruolo (`wedding_planner` come opzione gia presente)
- **Settings > Team** con invito collaboratori e gestione ruoli

## Cosa manca per l'MVP

### Lacune principali

1. **Nessun ruolo `planner` nell'enum `app_role`** - Esiste solo `co_planner`, `manager`, `guest`
2. **`get_user_context()` ritorna un solo matrimonio** - Un planner ne gestisce molti
3. **Nessun `permissions_config`** - Nessun meccanismo per nascondere dati finanziari
4. **Nessun Workspace Switcher** - L'app presuppone un singolo matrimonio per utente
5. **Nessun routing multi-wedding** - Le URL sono `/app/dashboard`, non `/app/w/:id/dashboard`
6. **Nessun "Locked State" UI** - Nessun componente per mostrare dati bloccati al planner

---

## Piano di Implementazione (5 Macro-Task)

### TASK 1: Fondamenta Backend (Database)

**Migration SQL:**

```text
1. Aggiungere 'planner' all'enum app_role
2. Aggiungere colonna permissions_config (JSONB) a user_roles
   - Default: NULL (= nessuna restrizione per owner/co_planner)
   - Per ruolo planner: {"budget_visible": false, "vendor_costs_visible": true, "guest_detail_level": 2}
3. Aggiornare RPC get_user_context() per ritornare un ARRAY di matrimoni:
   - Ritorna JSON: { weddings: [{ wedding_id, role, permissions_config, partner1_name, partner2_name, wedding_date }], active_wedding_id }
4. Creare funzione RPC get_planner_permissions(wedding_id) che ritorna il JSONB dei permessi
```

**Impatto RLS:** Le policy esistenti usano `has_wedding_role()` e `has_wedding_access()` - queste funzioni gia supportano ruoli multipli. Il nuovo ruolo `planner` viene trattato come `manager` per i permessi base, con restrizioni aggiuntive via `permissions_config`.

**Nota sicurezza:** I permessi finanziari NON vengono enforced via RLS (che filtra righe, non colonne) ma via logica applicativa + future edge functions per la sanitizzazione API.

---

### TASK 2: Refactor AuthContext per Multi-Wedding

**File: `src/contexts/AuthContext.tsx`**

Evoluzione dello stato:

```text
Stato attuale:
  authenticated: { weddingId: string, role: string }

Nuovo stato:
  authenticated: {
    weddings: Array<{ weddingId, role, permissionsConfig, partnerNames, date }>,
    activeWeddingId: string,
    activeRole: string,
    activePermissions: PermissionsConfig | null
  }
```

Nuove funzioni esposte:
- `switchWedding(weddingId: string)` - Cambia il wedding attivo, aggiorna localStorage, resetta React Query cache
- `getActivePermissions()` - Ritorna i permessi del ruolo corrente sul wedding attivo
- `isPlanner` - Booleano derivato: `activeRole === 'planner'`

**File: `src/utils/weddingStorage.ts`**

Aggiungere supporto per salvare l'ultimo weddingId attivo per utente.

**Compatibilita retroattiva:** Per gli utenti B2C (una sola wedding), il comportamento resta identico - `weddings` avra un solo elemento e `activeWeddingId` sara quello.

---

### TASK 3: Workspace Switcher e Routing

**Nuovo componente: `src/components/workspace/WorkspaceSwitcher.tsx`**

- Dropdown nella sidebar header (visibile solo se `weddings.length > 1`)
- Mostra lista matrimoni con nomi partner e data
- Al click: chiama `switchWedding()`, invalida tutte le query React Query, naviga a `/app/dashboard`
- Ricerca testuale per planner con molti matrimoni

**Modifica: `src/pages/AppLayout.tsx`**

- Sostituire il logo statico nella sidebar header con il WorkspaceSwitcher (condizionale)
- Se l'utente ha un solo matrimonio: mostra il logo come oggi
- Se ne ha piu di uno: mostra il selector con i nomi del matrimonio attivo

**Routing:** Per l'MVP, NON cambiamo la struttura delle URL (resterebbe `/app/dashboard`). Il contesto wedding viene dal `AuthContext.activeWeddingId`. Il routing esplicito (`/app/w/:id/dashboard`) e previsto per la Fase 2 per evitare un refactoring troppo invasivo ora.

---

### TASK 4: Permissions Config UI (Lato Coppia/Owner)

**Modifica: `src/pages/Settings.tsx` - Tab "Team"**

Quando un utente owner/co_planner invita un collaboratore con ruolo `planner`:

1. Dopo l'invito, mostrare i **2 Macro-Interruttori** (MVP semplificato dal doc che ne prevede 3):
   - **"Gestione Budget Globale"** (default: OFF) - Nasconde Treasury/Budget
   - **"Costi e Pagamenti Fornitori"** (default: ON) - Nasconde cifre fornitori

2. Gli interruttori aggiornano il campo `permissions_config` in `user_roles` del planner

3. Possibilita di modificare i permessi in qualsiasi momento dalla tab Team

**Nuovo componente: `src/components/settings/PlannerPermissionsCard.tsx`**

- 2 Switch con label e spiegazione del trade-off (come da doc: "Se nascondi i Costi Fornitori, il Planner non potra ricordarti le scadenze dei pagamenti")
- Feedback toast al cambio ("Il tuo Planner non vedra piu i costi")

---

### TASK 5: Locked States UI (Lato Planner)

**Nuovo componente: `src/components/ui/locked-card.tsx`**

Componente riutilizzabile per gli "stati bloccati":
- Variante **inline**: Badge `"Riservato"` con icona lucchetto al posto di un valore numerico
- Variante **full-page**: Illustrazione + titolo + sottotitolo + CTA (per MVP: il CTA e solo informativo, senza push notification)

**Modifiche alle pagine esistenti (condizionali su `activePermissions`):**

| Pagina | Se `budget_visible: false` | Se `vendor_costs_visible: false` |
|--------|---------------------------|----------------------------------|
| `Treasury.tsx` | Full-page locked state | - |
| `BudgetLegacy.tsx` | Full-page locked state | - |
| `AppLayout.tsx` (sidebar) | Nasconde le voci "Budget" e "Tesoreria" | - |
| `VendorDetails.tsx` | - | Nasconde tab "Spese", cifre in badge con lucchetto |
| `Vendors.tsx` | - | Colonna "Totale" mostra lucchetto |
| `Dashboard.tsx` | Widget budget mostra locked state | Widget pagamenti mostra locked state |

**Logica:** Ogni pagina legge `activePermissions` da `useAuth()` e renderizza condizionalmente. Per l'MVP, l'enforcement e solo frontend (i dati vengono comunque caricati ma non mostrati). L'enforcement API (sanitizzazione) e previsto per la Fase 2.

---

## Flusso Onboarding Planner (B2B)

**Modifica: `src/pages/Onboarding.tsx`**

Quando `userRole === 'wedding_planner'`:
- Lo step 1 resta uguale (nomi partner + ruolo)
- Lo step 2 resta uguale (data)
- Al submit: crea il wedding come oggi, MA il ruolo in `user_roles` sara `planner` invece di `co_planner`
- Il wedding viene creato con `created_by = planner_user_id` (il planner e il creatore tecnico)
- Futuro (Fase 2): aggiungere step 3 "Invita gli Sposi (Proprietari)" con magic link

**Nota:** Per l'MVP, il planner crea il matrimonio e puo invitare gli sposi dalla tab Team di Settings (flusso gia esistente). Il "Magic Link emozionale" e previsto per la Fase 2.

---

## Ordine di Implementazione Consigliato

```text
1. TASK 1 - Migration DB (enum + permissions_config + RPC aggiornata)
2. TASK 2 - Refactor AuthContext (multi-wedding state)
3. TASK 3 - Workspace Switcher + AppLayout
4. TASK 4 - Permissions UI in Settings
5. TASK 5 - Locked States nelle pagine
```

Ogni task e indipendente e testabile. Nessun task rompe la funzionalita esistente per gli utenti B2C (una sola wedding, nessun permission_config = nessuna restrizione).

## Cosa resta FUORI dall'MVP (Fase 2+)

- Pro Dashboard aggregata (command center multi-wedding)
- Magic Link emozionale per invitare gli sposi
- Richiesta permessi in-app con notifica push
- Sanitizzazione API server-side (edge function middleware)
- Audit Trail (chi ha fatto cosa)
- Routing esplicito con weddingId nell'URL
- Livelli granulari privacy invitati (livello 1/2/3)
- Bulk actions e keyboard shortcuts
- Color-coding per workspace
- Feature flags

