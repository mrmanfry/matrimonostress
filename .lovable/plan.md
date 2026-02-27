

# Piano: TASK 4 (Permissions UI) + TASK 5 (Locked States) + Onboarding Fix

## Stato completato
- TASK 1: Migration DB (enum planner + permissions_config + RPC) -- FATTO
- TASK 2: Refactor AuthContext (multi-wedding state) -- FATTO
- TASK 3: Workspace Switcher + AppLayout sidebar filtering -- FATTO

## Cosa rimane

### TASK 4: Permissions Config UI (Settings > Team)

**4A. Aggiornare il selettore ruolo invito** (`src/pages/Settings.tsx`, riga ~1179-1188)

Il dropdown attuale offre solo `co_planner` e `manager`. Aggiungere `planner` come opzione:

```text
- Co-Planner (Controllo Totale)
- Planner Professionista (con permessi configurabili)   <-- NUOVO
- Manager (Gestione Operativa)
```

Aggiornare anche `getRoleLabel()` e `getRoleIcon()` per gestire il ruolo `planner`.

**4B. Nuovo componente `PlannerPermissionsCard`** (`src/components/settings/PlannerPermissionsCard.tsx`)

Visibile solo quando esiste almeno un collaboratore con ruolo `planner` nella lista `roles`. Contiene 2 Switch:

1. **"Gestione Budget Globale"** (mappa a `budget_visible`)
   - Default: OFF (false)
   - Descrizione: "Se attivo, il Planner puo vedere Tesoreria e Budget"

2. **"Costi e Pagamenti Fornitori"** (mappa a `vendor_costs_visible`)
   - Default: ON (true)
   - Descrizione: "Se disattivi, il Planner non vedra cifre e piani di pagamento dei fornitori"
   - Warning: "Attenzione: il Planner non potra ricordarti le scadenze dei pagamenti"

Al toggle: aggiorna `user_roles.permissions_config` via Supabase per tutti i planner del wedding, mostra toast di conferma.

**4C. Rendering nella tab Team** (`src/pages/Settings.tsx`)

Inserire `<PlannerPermissionsCard>` tra la lista collaboratori e il form di invito, solo se l'utente corrente e `co_planner` o owner e ci sono planner attivi.

---

### TASK 5: Locked States UI

**5A. Nuovo componente `LockedCard`** (`src/components/ui/locked-card.tsx`)

Due varianti:
- **inline**: Un `<Badge>` con icona lucchetto e testo "Riservato", da usare al posto di valori numerici
- **full-page**: Card centrata con icona lucchetto grande, titolo, sottotitolo, e messaggio informativo

**5B. Pagine con locked state condizionale**

| Pagina | Condizione | Comportamento |
|--------|-----------|---------------|
| `Treasury.tsx` | `isPlanner && !activePermissions?.budget_visible` | Full-page locked: "Sezione riservata agli sposi" |
| `BudgetLegacy.tsx` | `isPlanner && !activePermissions?.budget_visible` | Full-page locked |
| `VendorDetails.tsx` | `isPlanner && activePermissions?.vendor_costs_visible === false` | Nasconde tab Spese, badge inline lucchetto sulle cifre |
| `Vendors.tsx` | `isPlanner && activePermissions?.vendor_costs_visible === false` | Colonna totale mostra badge lucchetto |
| `Dashboard.tsx` | condizionale su entrambi i permessi | Widget budget/pagamenti mostrano locked inline |

Ogni pagina legge `isPlanner` e `activePermissions` da `useAuth()`. Il check e: se `isPlanner` e true E il permesso specifico e `false` (o non presente nel JSON), mostra locked state.

---

### TASK Bonus: Onboarding planner role

**Modifica `src/pages/Onboarding.tsx`**

Quando `userRole === 'wedding_planner'`, dopo la creazione del wedding il trigger `assign_co_planner_role` assegna automaticamente `co_planner`. Dobbiamo aggiornare questo comportamento:

- Dopo il trigger automatico, se il ruolo selezionato e `wedding_planner`, aggiornare il record in `user_roles` da `co_planner` a `planner`
- Oppure: inserire manualmente il ruolo `planner` e cancellare quello auto-generato

---

## Dettagli tecnici

### Flusso dati permissions_config

```text
Settings (owner) --> user_roles.permissions_config (JSONB) --> AuthContext.activePermissions --> UI condizionale
```

Il JSON ha questa forma:
```json
{
  "budget_visible": false,
  "vendor_costs_visible": true
}
```

- `null` o assente = nessuna restrizione (default per owner/co_planner)
- Solo i planner hanno restrictions configurabili

### File modificati

1. `src/components/settings/PlannerPermissionsCard.tsx` -- NUOVO
2. `src/components/ui/locked-card.tsx` -- NUOVO
3. `src/pages/Settings.tsx` -- aggiunta planner nel dropdown ruoli + rendering PlannerPermissionsCard
4. `src/pages/Treasury.tsx` -- guard con locked state full-page
5. `src/pages/BudgetLegacy.tsx` -- guard con locked state full-page
6. `src/pages/Vendors.tsx` -- badge lucchetto su totali
7. `src/pages/VendorDetails.tsx` -- nascondere tab spese, badge lucchetto
8. `src/pages/Dashboard.tsx` -- locked inline su widget finanziari
9. `src/pages/Onboarding.tsx` -- assegnare ruolo `planner` invece di `co_planner`

### Ordine di esecuzione

1. Creare `locked-card.tsx` (componente base)
2. Creare `PlannerPermissionsCard.tsx`
3. Modificare `Settings.tsx` (ruolo + card)
4. Modificare `Onboarding.tsx` (ruolo planner)
5. Applicare locked states a Treasury, BudgetLegacy, Vendors, VendorDetails, Dashboard

