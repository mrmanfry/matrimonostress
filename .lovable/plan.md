

## Piano redesign sezione Invitati (paper design)

Stesso pattern del Libretto, ma **header invariato**: tengo il `SectionHeader` attuale di `Guests.tsx` (con KPI funnel, CTA primarie, ImportDropdown) così com'è. Reskin solo del corpo pagina.

## Fase 1 — Estrazione handoff

Estraggo `Libretti_messa-handoff-2.zip` in `/tmp/handoff2/` e mappo i JSX designer → componenti TS/TSX. Report di mapping prima di scrivere codice (cosa riuso, cosa adatto).

## Fase 2 — Nuovi componenti `src/components/guests/v2/`

- **`GuestsFilterBar.tsx`** — search + filter chips paper-styled (sostituisce il chrome di `GuestFilters`, riusa la logica filtri esistente)
- **`GuestsFunnelStrip.tsx`** — strip orizzontale 5 stati cliccabili (Da Lavorare / STD / In Attesa / Confermati / Rifiutati), versione compatta delle `FunnelKPICards`
- **`GuestsListView.tsx`** — wrapper paper per `GuestNucleoCard`/`GuestSingleCard` (border caldi, `font-fraunces` sui nomi, bg `--paper-surface`)
- **`GuestsAnalyticsPanel.tsx`** — versione paper-styled del pannello analytics (collapsible desktop + sheet mobile, come oggi)

## Fase 3 — Integrazione in `Guests.tsx`

Rewrite **solo del JSX layout** (righe ~1082-1648):
- **Header**: invariato (`SectionHeader` attuale resta)
- **Body**: nuovi componenti v2 al posto di `GuestFilters` + `FunnelFilterBanner` + lista inline
- **Logica**: tutto invariato (loadData, handle*, filtering, RSVP campaigns, selezione, dialoghi)

```text
┌──────────────────────────────────────────┐
│ SectionHeader ATTUALE (invariato)        │  ← non si tocca
├──────────────────────────────────────────┤
│ GuestsFunnelStrip (5 chip cliccabili)    │  ← v2 paper
│ GuestsFilterBar (search + filtri)        │  ← v2 paper
│ GuestsAnalyticsPanel (collapsible)       │  ← v2 paper
│ GuestsListView                           │  ← v2 paper
│   ├─ GuestNucleoCard (reskin leggero)   │
│   └─ GuestSingleCard (reskin leggero)   │
│ SelectionToolbar (invariato)             │
└──────────────────────────────────────────┘
```

## Cosa NON tocco (zero rischio)

- `SectionHeader` di Guests (header attuale)
- `loadData`, handlers CRUD/RSVP, filtering logic
- Tutti i dialoghi (`RSVPCampaignDialog`, `GuestDialog`, `PartyDialog`, `CSVImportDialog`, `SmartImportDialog`, `SmartGrouperDialog`, `ContactSyncDialog`)
- `nucleusStatusHelper`, `rsvpHelpers`, `guestAnalytics`, `useInvitationsData`, `useGuestMetrics`
- `SelectionToolbar`, `GuestStatusDot`, `GuestCampaignBadges`
- `AppLayout` topbar globale (già aggiornata)
- Schema DB, edge functions

## Default applicati

1. **Reskin `GuestNucleoCard`/`GuestSingleCard`**: wrapper esterno + token swap leggero (border, bg, `font-fraunces` su nomi). No reskin profondo.
2. **Funnel**: strip orizzontale compatta in alto.
3. **Analytics**: collapsible desktop + sheet mobile (pattern attuale, solo restyle).
4. **Mobile**: layout responsive mantenuto, mobile filters/sheet invariati.

## File toccati

- **Nuovi**: `GuestsFilterBar.tsx`, `GuestsFunnelStrip.tsx`, `GuestsListView.tsx`, `GuestsAnalyticsPanel.tsx` in `src/components/guests/v2/`
- **Modificati**: `src/pages/Guests.tsx` (solo JSX body, header e logica intatti); micro-ritocchi a `GuestNucleoCard.tsx` / `GuestSingleCard.tsx` per `font-fraunces` su nomi
- **Invariati**: tutto il resto

