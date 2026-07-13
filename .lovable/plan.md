
## Contesto — cosa fa oggi la SoD

Il sistema permessi per Manager/Planner ha solo **5 aree** in `PermissionsConfig` (`guests`, `vendors`, `vendor_costs`, `budget`, `communications`), con 3 livelli view/edit/create. Ma:

1. **Sidebar**: nasconde solo `Budget` (se `!budget.view`) e `Regali` (sempre nascosto ai collaboratori). Tutte le altre voci — Fornitori, Checklist, Messaggi, Calendario, Tavoli, Catering, Pernotto, Memories, Libretto, Timeline, Campagne — sono sempre visibili al manager, indipendentemente dai permessi.
2. **Enforcement DB**: le RLS non leggono mai `permissions_config`. Un manager, per policy tipo `Planners can manage guests` con `has_wedding_role(..., 'manager')`, ha **ALL** (INSERT/UPDATE/DELETE) su guests, vendors, expense_items, payments, tables, checklist ecc. — anche se in UI gli hai tolto "Modifica". **La SoD è solo cosmetica.**
3. **Areas mancanti**: nessun toggle per Checklist, Tavoli, Catering, Pernotto, Memories, Libretto, Timeline, Calendario, Chat/Messaggi, Regali (che è hardcoded off).

## Obiettivo

Portare la SoD a permessi granulari per sezione, coerenti tra UI (sidebar + azioni) e DB (RLS), con enforcement reale. Se non hai `view` su una sezione → sezione **nascosta in sidebar** e **route bloccata** (redirect a Dashboard); se hai `view` ma non `edit`/`create` → bottoni Modifica/Nuovo disabilitati + policy DB che rifiuta.

## Modello permessi nuovo

Areas mirror della sidebar (Dashboard e Impostazioni restano sempre visibili — Impostazioni mostra solo sotto-tab consentiti):

| Area chiave | Sezione sidebar | Livelli |
|---|---|---|
| `guests` | Invitati | view/edit/create |
| `communications` | Campagne | view/edit/create |
| `budget` | Budget & Tesoreria | view/edit/create |
| `gifts` | Regali | view/edit/create |
| `vendors` | Fornitori | view/edit/create |
| `vendor_costs` | (sotto-toggle di Fornitori) | view solo (mask cifre) |
| `checklist` | Checklist | view/edit/create |
| `chat` | Messaggi | view/edit (create=edit) |
| `calendar` | Calendario | view/edit/create |
| `tables` | Tavoli | view/edit/create |
| `catering` | Catering | view/edit/create |
| `accommodation` | Pernotto | view/edit/create |
| `memories` | Memories | view/edit/create |
| `mass_booklet` | Libretto Messa | view/edit/create |
| `timeline` | Timeline | view/edit/create |

Gerarchia forzata come oggi: `create ⇒ edit ⇒ view`. Default per un nuovo manager: tutto `false` (opt-in esplicito) — più sicuro del "tutto on" attuale.

## Fase 1 — Modello + UI (client-side)

1. **`src/contexts/AuthContext.tsx`** — estendere `PermissionsConfig` con le nuove aree; `normalizePermissions` gestisce back-compat (config vecchi senza le chiavi nuove → `false`, tranne per co_planner/planner effettivo che restano onnipotenti come oggi via `activeRole`).
2. **`CollaboratorPermissionsCard.tsx`** — sostituire i blocchi hardcoded con un array di `AREA_SPECS` che descrive ogni area (icona, titolo, label view/edit/create, hasEdit, hasCreate) e itera. Aggiungere un pulsante "Preset" (Sola lettura completa / Operativo / Nessuno).
3. **`AppLayout.tsx`** — sidebar: costruire `navigation` filtrando per `activePermissions?.<area>?.view`. Co_planner e planner ignorano il filtro (hanno tutto). Manager senza alcun permesso vede solo Dashboard + Impostazioni.
4. **Route guard**: nuovo `<PermissionGuard area="guests" level="view">` in `ProtectedRoute.tsx` / wrapper per ogni route sensibile in `App.tsx`. Se non consentito → `<Navigate to="/app/dashboard" replace />`.
5. **Azioni**: hook `usePermission(area, level)` → nascondere/disabilitare i bottoni "Nuovo …", "Modifica", "Elimina" nelle pagine chiave (Guests, Vendors, Budget/expense, Checklist, Tables, Catering, Accommodation, Gifts, Memories, MassBooklet, Timeline, Calendar, Chat, Invitations).

## Fase 2 — Enforcement DB (RLS reali)

1. **Migrazione**: security-definer function `public.has_wedding_permission(_user uuid, _wedding uuid, _area text, _level text) returns boolean` che:
   - `co_planner`/`planner` → true (bypass, come oggi);
   - `manager` → legge `user_roles.permissions_config->_area->>_level = 'true'`;
   - altri → false.
2. **Riscrivere policy** per tabelle sensibili sostituendo `has_wedding_role(..., 'manager')` con `has_wedding_permission(..., area, level)`:
   - `guests` INSERT → `create`, UPDATE → `edit`, DELETE → `edit`, SELECT → `view`.
   - `invite_parties`, `guest_groups`, `guest_conflicts` → allineate a `guests`.
   - `vendors`, `vendor_appointments`, `vendor_communications`, `vendor_contracts` → area `vendors`.
   - `expense_items`, `expense_line_items`, `payments`, `payment_allocations`, `financial_contributors` → area `budget`. Nota: `payments` policy usa subquery su `expense_items` — riscrivere.
   - `gifts` → area `gifts`.
   - `checklist_tasks` → area `checklist`.
   - `tables`, `table_assignments`, `tableau_layouts`, `ai_affinities` → area `tables`.
   - `accommodation_rooms`, `accommodation_assignments` → area `accommodation`.
   - `timeline_events`, `timeline_tokens` → area `timeline`.
   - `disposable_cameras`, `camera_photos` (owner side) → area `memories`.
   - `mass_booklets` → area `mass_booklet`.
   - `messages`, `message_reads` → area `chat`.
3. **Non toccare**: `weddings`, `user_roles`, `wedding_invitations`, `profiles` — restano role-based (solo co_planner/planner gestiscono).
4. **`vendor_costs`**: view-mask lato client + edge function `get_vendor_financials` già security-definer → aggiungere check su `has_wedding_permission(..., 'vendor_costs', 'view')` per i manager.

## Fase 3 — Test e verifica

### 3a. Report matrice atteso (consegna prima delle modifiche + rirun dopo)

Tabella markdown: **Sezione × Combinazione permessi × Comportamento sidebar / route / azioni**. Casi chiave:
- Nessun permesso → sidebar mostra solo Dashboard + Impostazioni; ogni URL diretto redirect a Dashboard.
- Solo `view` su Invitati → voce Invitati visibile, lista con "nome + iniziale cognome", bottoni "Nuovo" e "Modifica" nascosti, tentativo di INSERT via API → RLS violation.
- `view+edit` su Budget senza `create` → posso segnare pagato ma non aggiungere nuove voci.
- `vendors.view=true` + `vendor_costs.view=false` → schede fornitori aperte ma cifre mascherate, KPI budget al fornitore nascosti.
- Toggle `chat.view=false` → Messaggi sparisce, realtime channel non riceve.

### 3b. Test Playwright headless (in `/tmp/browser/sod-test/`)

Script che:
1. Login come manager di test (creato tramite `join_wedding_by_code` o SQL diretto in ambiente sandbox).
2. Per ogni combinazione di permessi (tramite `UPDATE user_roles SET permissions_config = …`), ricarica app, prende screenshot della sidebar, tenta navigazione diretta alle route protette, verifica presenza/assenza dei bottoni "Nuovo/Modifica/Elimina".
3. Tenta un INSERT/UPDATE via `supabase.from(...).insert(...)` dalla console del browser (page.evaluate) per ogni permesso disattivato — attesa: `403` / RLS error.
4. Produce un HTML report con verde/rosso per ogni cella della matrice.

Screenshot chiave salvati e commentati.

## Dettagli tecnici

- Back-compat: `permissions_config` esistenti con solo le 5 aree vecchie continuano a funzionare; `normalizePermissions` popola le nuove aree con `false` per manager (che è cambio di default — accettato perché il vecchio "tutto on implicito" era il problema). Aggiungiamo migrazione one-shot che copia lo stato attuale (che per i manager esistenti concede tutto tramite policy) trasformandolo in nuovo config `{tutte le aree: view+edit+create}` così **nessun manager perde accesso al primo deploy**.
- `has_wedding_permission` è `STABLE SECURITY DEFINER` con `SET search_path = public` — nessuna ricorsione (legge `user_roles`, non le tabelle protette).
- I planner (`role='planner'`) che oggi vedono/gestiscono tutto restano invariati; la SoD granulare si applica solo a `manager`. Se in futuro serve granularità anche sui planner, il modello è pronto.
- Impostazioni: la tab "Team/Permessi" resta visibile solo a `co_planner` (già così via `user_owns_couple_wedding`). Manager può vedere solo tab "Account".

## Rischi

- **Superficie di modifica RLS ampia** (>15 policy): rischio regressione. Mitigazione: migrazione singola, script Playwright ripetibile, seed di back-compat che concede a tutti i manager esistenti tutti i permessi.
- **`payments` policy** con subquery sensibile → serve riscrivere con join a `expense_items` mantenendo `has_wedding_permission(auth.uid(), ei.wedding_id, 'budget', <level>)`.
- **Realtime**: `realtime_topic_wedding_access` resta role-based sull'accesso al wedding; se un manager perde `chat.view` ma resta membro, riceverebbe ancora eventi realtime. Va aggiornato o filtrato lato client (nascondere i canali chat quando `!chat.view`).

## Deliverable

1. Report matrice SoD "prima" (stato attuale, evidenzia i gap) — markdown consegnato in chat.
2. PR modello + UI (Fase 1): `AuthContext`, `CollaboratorPermissionsCard`, `AppLayout`, guard di route, hook `usePermission`, edit sulle pagine per gate delle azioni.
3. Migrazione Fase 2: nuova funzione + rewrite di ~20 policy + backfill `permissions_config` per manager esistenti.
4. Script Playwright + report finale con matrice "dopo" e screenshot.

Vuoi che parta dalla Fase 1 + report, e la Fase 2 (RLS) in una seconda passata?
