

# Cockpit del Wedding Planner -- Dashboard Multi-Matrimonio

## Visione

Oggi il planner che gestisce 10 matrimoni vede la stessa Dashboard di una coppia: un singolo matrimonio alla volta, con il WorkspaceSwitcher nel menu laterale come unico modo per passare da uno all'altro. Questo e inefficiente.

L'idea e creare una **rotta dedicata `/app/planner`** che funzioni come un vero "centro di comando": una vista panoramica su TUTTI i matrimoni del planner, con calendario aggregato, scadenze cross-wedding, e accesso rapido a ciascun progetto.

---

## Architettura della Soluzione

### Routing e Navigazione

- Nuova rotta: `/app/planner` (visibile solo se `isPlanner` o se l'utente ha 2+ matrimoni)
- Nel sidebar, per i planner la voce "Dashboard" punta a `/app/planner` invece che a `/app/dashboard`
- Cliccando su un matrimonio specifico nel cockpit, si esegue `switchWedding()` e si naviga a `/app/dashboard` (la dashboard del singolo matrimonio)

### Componenti della Pagina Cockpit

```text
+-------------------------------------------------------+
|  COCKPIT WEDDING PLANNER                               |
+-------------------------------------------------------+
|                                                        |
|  [KPI Globali]                                         |
|  Matrimoni attivi: 5  |  Prossimo: 12 giorni           |
|  Pagamenti in scadenza: 3  |  Task urgenti: 7          |
|                                                        |
+-------------------------------------------------------+
|                                                        |
|  [Calendario Matrimoni]                                |
|  Vista mensile con pallini colorati per ogni matrimonio |
|  Hover/click mostra i dettagli del matrimonio          |
|                                                        |
+-------------------------------------------------------+
|                                                        |
|  [Lista Matrimoni - Cards]                             |
|  +------------------+  +------------------+            |
|  | Marco & Giulia   |  | Luca & Sara      |           |
|  | 15 Giu 2026      |  | 20 Set 2026      |           |
|  | 45 giorni        |  | 142 giorni       |           |
|  | 3 task urgenti   |  | 1 pagamento      |           |
|  | [Apri] [Dettagli]|  | [Apri] [Dettagli]|           |
|  +------------------+  +------------------+            |
|                                                        |
+-------------------------------------------------------+
|                                                        |
|  [Scadenze Cross-Wedding]                              |
|  Lista unificata delle prossime scadenze               |
|  (pagamenti + task) da tutti i matrimoni               |
|                                                        |
+-------------------------------------------------------+
```

### Funzionalita del Cockpit

1. **KPI Globali Aggregati**
   - Numero matrimoni attivi (con data futura)
   - Prossimo matrimonio (nome + countdown)
   - Totale pagamenti in scadenza nei prossimi 30 giorni (cross-wedding)
   - Totale task urgenti/scaduti (cross-wedding)

2. **Calendario Matrimoni**
   - Vista mensile che mostra le date dei matrimoni come eventi colorati
   - Ogni matrimonio ha un colore assegnato automaticamente
   - Click su una data di matrimonio apre i dettagli rapidi
   - Mostra anche le scadenze pagamenti/task come punti secondari

3. **Cards Matrimoni**
   - Griglia di card, una per matrimonio
   - Ogni card mostra: nomi coppia, data, countdown, ruolo del planner
   - Mini-KPI: invitati confermati/totali, task completati/totali, prossimo pagamento
   - Badge con stato (es. "In corso", "Completato", "Urgente")
   - CTA "Apri" che fa switchWedding + naviga a Dashboard

4. **Feed Scadenze Unificato**
   - Lista cronologica delle prossime 10-15 scadenze da tutti i matrimoni
   - Ogni riga mostra: nome matrimonio (badge colorato), tipo (task/pagamento), titolo, data
   - Click naviga direttamente al matrimonio e alla sezione giusta

5. **Azioni Rapide**
   - "Crea nuovo matrimonio" (link a onboarding)
   - "Unisciti con codice" (riusa JoinWeddingDialog)

---

## Dettagli Tecnici

### Nuovi File

| File | Descrizione |
|------|-------------|
| `src/pages/PlannerCockpit.tsx` | Pagina principale del cockpit |
| `src/components/planner/WeddingCard.tsx` | Card singolo matrimonio con mini-KPI |
| `src/components/planner/PlannerCalendar.tsx` | Calendario con date matrimoni |
| `src/components/planner/CrossWeddingFeed.tsx` | Feed scadenze aggregate |
| `src/components/planner/PlannerKPIs.tsx` | Barra KPI globali |

### File Modificati

| File | Modifica |
|------|----------|
| `src/App.tsx` | Aggiungere rotta `/app/planner` |
| `src/pages/AppLayout.tsx` | Sidebar: se planner, mostra "Cockpit" come prima voce |
| `src/guards/ProtectedRoute.tsx` | Nessuna modifica necessaria (usa la stessa logica `requireWedding`) |

### Fetch dei Dati Cross-Wedding

Il cockpit deve leggere dati da TUTTI i matrimoni del planner. L'approccio:

1. Iterare su `authState.weddings` per ottenere la lista di `weddingId`
2. Per ogni wedding, fare query parallele (con `Promise.all`) per:
   - `checklist_tasks` con status pending e due_date prossima
   - `payments` con status "Da Pagare" e due_date prossima
   - `guests` count per RSVP summary
3. Le RLS policies esistenti gia permettono la lettura a chi ha `has_wedding_access` -- il planner con ruolo assegnato puo gia leggere questi dati

### Sidebar Condizionale

```text
Se isPlanner o weddings.length > 1:
  - Cockpit (icona LayoutGrid) -> /app/planner
  - [separatore]
  - Dashboard -> /app/dashboard (matrimonio corrente)
  - ... resto menu

Se coppia (singolo matrimonio):
  - Dashboard -> /app/dashboard
  - ... resto menu (invariato)
```

### Considerazioni

- Il cockpit NON richiede nuove tabelle DB -- usa i dati esistenti con le RLS gia in piedi
- Le query cross-wedding sono parallelizzate per performance
- Il calendario riusa il componente Calendar di react-day-picker gia nel progetto
- I colori per distinguere i matrimoni sono generati da una palette predefinita (es. 6 colori che ciclano)

