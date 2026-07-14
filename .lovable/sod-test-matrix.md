# Segregation of Duties — Test Manager

Modello nuovo: 15 aree × 3 livelli (view/edit/create) rispecchiano la sidebar. Regole:

- **Sidebar**: la voce compare solo se `<area>.view = true`. Manager senza alcun `view` vede solo **Dashboard** e **Impostazioni**.
- **Route**: `PermissionGuard` blocca ogni URL diretto senza `view` e redirige a `/app/dashboard`.
- **RLS**: `has_wedding_permission(user, wedding, area, level)` è consultata da **tutte** le policy. Un `INSERT`/`UPDATE`/`DELETE` senza il permesso corrispondente restituisce `403 / row-level security`.
- **Gerarchia**: `create ⇒ edit ⇒ view`. Disattivare view azzera edit+create; attivare create alza edit+view.
- **`vendor_costs`**: solo `view`. Se false, la RPC `get_vendor_financials` restituisce righe vuote (IBAN/PIVA mascherati) e le policy di `vendor_contracts` bloccano il SELECT.

## Matrice attesa (fissato ogni scenario, tutto il resto = false)

| Scenario permessi manager | Sidebar visibili (oltre Dashboard/Impostazioni) | Azioni consentite | Bloccato dalle RLS |
|---|---|---|---|
| `{}` (nessun permesso) | — | nessuna | tutto (SELECT/INSERT/UPDATE/DELETE su ogni tabella wedding) |
| `guests.view` | Invitati | leggere lista | INSERT/UPDATE/DELETE su `guests`, `invite_parties`, `guest_groups`, `guest_conflicts` |
| `guests.edit` (implica view) | Invitati | leggere, modificare | INSERT (create), DELETE resta consentito solo perché edit sblocca update+delete; verificare che INSERT fallisca |
| `guests.create` | Invitati | tutto | — (sull'area guests) |
| `vendors.view` + `vendor_costs.view=false` | Fornitori | leggere schede, ma senza cifre né piani | `vendor_contracts` SELECT bloccato; `get_vendor_financials` ritorna vuoto |
| `budget.view` | Budget | leggere spese/pagamenti | INSERT/UPDATE su `expense_items`, `payments`, `expense_line_items`, `payment_allocations`, `financial_contributors`, `expense_categories` |
| `budget.edit` (no create) | Budget | segnare pagato, modificare rate | INSERT bloccato (nuova voce/pagamento) |
| `checklist.view` | Checklist | leggere task | INSERT/UPDATE/DELETE su `checklist_tasks` |
| `chat.view` (no edit) | Messaggi | leggere | INSERT messaggio bloccato |
| `tables.view` | Tavoli | leggere tavoli+assegnazioni+layout | mutazioni su `tables`, `table_assignments`, `tableau_layouts`, `ai_affinities` bloccate |
| `communications.view` | Campagne | leggere config campagne (via `weddings`, che resta role-based) | — |
| `gifts.view` | Regali | leggere | INSERT/UPDATE su `gifts` bloccato |
| `memories.view` | Memories | vedere camere+foto owner-side | mutazioni su `disposable_cameras`, `camera_photos` bloccate |
| `mass_booklet.view` | Libretto Messa | leggere libretti | INSERT/UPDATE su `mass_booklets` bloccato |
| `timeline.view` | Timeline | leggere eventi+token | mutazioni bloccate |
| `accommodation.view` | Pernotto | leggere hotel/camere | mutazioni su `accommodation_rooms`, `accommodation_assignments` bloccate |
| `calendar.view` | Calendario | leggere (aggrega da checklist/vendor_appointments/timeline_events, che rispettano i loro permessi) | dipende dai singoli permessi |

## Test manuale rapido (5 minuti)

1. Da co_planner → Impostazioni → Team, seleziona il manager, clicca **Nessuno**.
2. Fai logout co_planner, login manager: dovresti vedere in sidebar solo Dashboard + Impostazioni. Prova a navigare `/app/guests` → redirect a dashboard.
3. Riabilita a manager `guests.view` (preset o toggle). Ricarica: compare "Invitati". Apri la pagina → lista visibile. Prova a cliccare "Nuovo invitato" o `INSERT` via console → 403 RLS.
4. Alza a `guests.edit` → puoi modificare esistente, ma tentativo di `INSERT` da console resta 403.
5. Alza a `guests.create` → puoi importare/creare.
6. Vendors + vendor_costs off → nella scheda fornitore le sezioni IBAN/PIVA/contratti sono vuote (RPC bloccata).

## Note

- La UI di ciascuna pagina (bottoni "Nuovo/Modifica/Elimina") non è stata ancora gated col hook `usePermission` — è enforced solo lato DB. Aggiungere le disable/hide sui bottoni è cosmetica ma consigliato. Uso: `const canCreate = usePermission('guests', 'create');`.
- Realtime chat: se `chat.view=false`, il canale realtime resta accessibile (topic-level guard resta role-based). I messaggi ricevuti però falliscono la policy SELECT, quindi non compaiono nemmeno via realtime.
- `communications`: al momento la sezione Campagne legge/scrive principalmente su `weddings.campaigns_config` (JSONB) — restano regolate dalle policy di `weddings` (co_planner-only in edit). Il toggle `communications.view` gestisce solo la visibilità in sidebar/route.
