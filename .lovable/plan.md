# Piano: Interfaccia Mobile WedsApp

Obiettivo: rendere tutte le pagine `/app/*` perfettamente utilizzabili sotto `md` (768px), **senza toccare backend, dati o logiche di business**. Solo layout/responsive.

## Stato attuale (cosa abbiamo già)

- `index.html`: meta viewport già corretto (`width=device-width, initial-scale=1.0`) — il "fix dei 5 secondi" è già a posto.
- `AppLayout.tsx` usa `SidebarProvider` di shadcn: su mobile la sidebar diventa **già un drawer off-canvas** (Sheet). Quindi il drawer del punto 1 dell'handoff è di fatto già presente.
- Manca invece: **bottom-nav mobile**, **header mobile compatto**, padding-bottom per la safe-area, e i collassi di griglie pagina-per-pagina.

## 1. Shell mobile (`src/pages/AppLayout.tsx`)

- Aggiungere una **bottom-nav fissa** visibile solo `< md` (`flex md:hidden`), con 5 tab: Dashboard, Invitati, Budget, Checklist, **Altro**.
  - "Altro" apre il drawer della sidebar via `setOpenMobile(true)`.
  - Stile: `fixed bottom-0 inset-x-0 z-50 border-t bg-paper-surface pb-[env(safe-area-inset-bottom)]`.
  - Tab attiva evidenziata in base a `location.pathname`.
- Header (`<header>`): su mobile mostrare hamburger (`SidebarTrigger`) + titolo pagina compatto + TrialBadge. Nascondere il blocco countdown centrale (già `hidden md:flex`, ok). Il blocco brand a sinistra resta ma più corto.
- `<main>`: aggiungere `pb-24 md:pb-6` per non sovrapporre l'ultima riga alla bottom-nav.

## 2. Collassi di griglie (mobile-first)

Regola: ogni `grid-cols-N` fisso → `grid-cols-1 md:grid-cols-N`. I KPI rimangono `grid-cols-2 md:grid-cols-4`.

Pagine da rivedere (interventi puramente di className):

- **Budget** (`src/pages/Budget.tsx` + `src/components/budget/v2/*`)
  - Striscia KPI → `grid-cols-2 md:grid-cols-4`.
  - Riga Allocazione+Fondi → `grid-cols-1 md:grid-cols-[1.4fr_1fr]`.
  - Header tabella spese → `flex-col md:flex-row`, search full-width su mobile.
  - Callout prossimo pagamento → `flex-wrap`.
  - `VendorDrawer` → `w-full` su mobile.
  - Hero titolo `text-3xl md:text-4xl`.
- **Fornitori** (`src/pages/Vendors.tsx`, `src/pages/VendorDetails.tsx`)
  - Stat di stato → `grid-cols-2 md:grid-cols-4`.
  - Header lista + filtri → `flex-col md:flex-row`, search full-width.
  - Dettaglio: `md:grid-cols-[320px_1fr]` con 1 colonna su mobile; pannello profilo da `sticky` → `static` su mobile.
- **Invitati** (`src/pages/Guests.tsx`, `src/components/guests/v2/detail/GuestsDetailPanel.tsx`)
  - Già usa `Sheet` bottom su mobile per il dettaglio — ok.
  - Verificare che lo split `md:grid-cols-[1fr_460px]` collassi correttamente.
  - Topbar editoriale: nascondere nav centrale e contatore confermati (`hidden md:flex`).
- **Tavoli** (`src/pages/Tables.tsx`, `src/components/tables/*`)
  - Stats header → `flex-col` + `overflow-x-auto`.
  - Barra azioni → `overflow-x-auto`.
  - GuestPool sidebar → `hidden md:block` (su mobile niente drag&drop, si usa "Aggiungi ospite" dal pannello tavolo).
  - Griglia card tavoli → 1 colonna su mobile (già `auto-fill minmax(~220px,1fr)`, verificare).
  - Pannello dettaglio tavolo da `w-[380px]` fisso → `inset-x-2 bottom-2 w-auto max-h-[70vh]` su mobile.
- **Campagne / Invitations** (`src/pages/Invitations.tsx`)
  - Header → `grid-cols-1 md:grid-cols-[1fr_auto]`.
  - Funnel 5 stati → `grid-cols-2 md:grid-cols-5`.
  - Card azione / campagne / print → `grid-cols-1 md:grid-cols-2`.
- **Checklist** (`src/pages/Checklist.tsx`)
  - Header → `grid-cols-1 md:grid-cols-[1fr_auto]`.
  - Vista Calendario → `grid-cols-1 md:grid-cols-[minmax(0,1fr)_360px]`.

Altre pagine (`Dashboard`, `Catering`, `Accommodation`, `Calendar`, `Memories`, `MassBooklet`, `Timeline`, `Settings`, `Chat`): pass rapido a verificare che eventuali `grid-cols-N` o pannelli fissi diventino mobile-friendly con la stessa regola. Niente rifacimenti.

## 3. Pannelli & Drawer

- Tutti i Drawer/Sheet già esistenti che hanno larghezze fisse → su mobile `w-full` o `inset-x-2`.
- Elementi `sticky` con altezze calcolate (es. `h-[calc(100vh-110px)]`) → `static h-auto md:sticky md:h-[calc(100vh-110px)]`.

## 4. Cosa NON tocchiamo

- Nessuna modifica a query Supabase, edge functions, RLS, calcoli (`calculateExpenseAmount`, classificazione ospiti), routing.
- Nessuna nuova libreria.
- Nessuna modifica a `src/integrations/supabase/*`, schemi DB, `.env`.

## Approccio di esecuzione

1. **Shell**: bottom-nav + padding main + header mobile in `AppLayout.tsx`. (1 file)
2. **Pagina per pagina**: applicare i collassi e i fix `sticky→static` / `w-full`, partendo dalle 5 prioritarie (Budget, Fornitori, Invitati, Tavoli, Checklist), poi le altre.
3. Verifica visiva nel preview a 375px, 414px e 768px.

## Domande aperte

- **Bottom-nav, quali 5 tab?** L'handoff propone Dashboard / Invitati / Budget / Checklist / Altro. Confermi o preferisci sostituirne una (es. Fornitori al posto di Checklist, visto che è uno dei moduli centrali della tesoreria)?
- **Procedo tutto in una sola passata** (shell + tutte le pagine) o preferisci una **prima PR solo con lo shell** (bottom-nav + header mobile + drawer già funzionante) così la vedi subito girare, e poi pagina-per-pagina?
