
## Piano: Section Header v1 unificato per /guests, /budget, /campaigns

L'utente ha presentato un'analisi UX dettagliata. Voglio prima chiarire lo scope di questa implementazione perché è un progetto importante con molte decisioni architetturali ancora aperte.

## Cosa propongo di fare

Implementare il pattern **Section Header v1** come componente condiviso e applicarlo alle 3 sezioni (`/guests`, `/budget`, `/campaigns` → in WedsApp è `/invitations`), con la logica `computeNextAction` deterministica.

## Componente condiviso

`src/components/shared/SectionHeader.tsx` con 4 elementi sempre nella stessa griglia:
1. **Titolo + CTA primario**
2. **Metadata line** (prosa grigia con numeri chiave)
3. **Progress visualization** polimorfica (3 varianti: `stratified` / `budget` / `funnel`)
4. **Next action card** opzionale, colorata per urgenza (viola/giallo/rosso)

```ts
type DataViz = 
  | { type: 'stratified'; segments: { label, count, color }[] }
  | { type: 'budget'; paid: number; committed: number; total: number }
  | { type: 'funnel'; stages: { label, count, percentage }[] }

type Urgency = 'low' | 'medium' | 'high'
```

## Applicazione per sezione

**`/guests`** → stratified bar (confermati/attesa/rifiutati su 196), next action: "Invia inviti formali" se ci sono nuclei pronti, oppure "Sincronizza contatti" se molti senza telefono. Dati già disponibili da `useGuestMetrics` + `useInvitationsData`.

**`/budget` (BudgetLegacy)** → budget bar 2 colori (verde pagato + viola impegnato) su totale. Next action rossa: "Paga ora" se acconto in scadenza < 7 giorni. Richiede aggregazione da `expense_items` + `payments` (status='Pagato' vs total commitment).

**`/invitations`** → funnel orizzontale (Destinatari → STD inviati → STD risposti → Inviti formali → Confermati). Dati già pronti in `useInvitationsData.funnelStats`. Next action viola: "Prepara invito" se ≥1 nucleo pronto.

## `computeNextAction` — state machine deterministica

Una funzione pura per sezione, regole if/else documentate (no AI), priorità top-down:

```ts
// guests
if (partiesReadyToSend.length > 0) → "Invia inviti formali" (medium)
else if (withoutPhone > 30%) → "Sincronizza contatti" (low)
else if (confirmedRate > 80%) → "Assegna i tavoli" (low)
else if (daysToWedding ≤ 30 && confirmedRate < 90%) → "Solleciti" (high)

// budget
if (nextPayment.daysUntil ≤ 3) → "Paga ora" (high, rosso)
else if (nextPayment.daysUntil ≤ 14) → "Prossima rata" (medium, giallo)
else if (committed/total > 100%) → "Budget superato" (high)

// invitations
if (partiesReadyToSend > 0) → "Prepara invito" (medium)
else if (stdResponseRate < 50% && stdSentDaysAgo > 7) → "Sollecita STD" (medium)
```

## Decisioni che voglio chiarire prima di codare

L'utente stesso ha sollevato 2 punti aperti che bloccano l'implementazione pulita. Ho bisogno di risposte prima di procedere.

## File modificati

- **NEW**: `src/components/shared/SectionHeader.tsx` (componente unificato)
- **NEW**: `src/lib/sectionNextActions.ts` (3 funzioni `computeNextAction*`)
- **MOD**: `src/pages/Guests.tsx` — sostituisce header attuale + KPI
- **MOD**: `src/pages/BudgetLegacy.tsx` — aggiunge header in cima
- **MOD**: `src/pages/Invitations.tsx` — sostituisce `InvitationsKPIs` con il nuovo header (o lo affianca)

## Cosa NON faccio in questo step

- ❌ Pagina `/insights` (giustamente bocciata)
- ❌ Livello 3 "chart = filtro" su gruppi (è un'altra issue, separata)
- ❌ Refactor del DB schema per `status: planned | committed | paid` (vedi domanda 2)
- ❌ Modifiche a `/vendors`, `/tables`, `/timeline` (validiamo prima il pattern sui 3)
