## Obiettivo
Avere **un solo metodo** che calcola i 3 scenari di headcount, richiamato ovunque (Dashboard pie, ScenarioSelector, Budget, Vendors, Catering). Niente più drift tra widget.

## Decisione semantica (confermata)
Gli **sposi sono sempre dentro come adulti confermati** in tutti e 3 gli scenari. Lo staff resta separato. Il pie/KPI mostreranno gli sposi come parte di "Confermati Adulti" (non più card separata "Sposi" che crea confusione di totali).

## Nuovo helper centralizzato
File: `src/lib/guestScenarios.ts`

```ts
export type ScenarioId = 'planned' | 'expected' | 'confirmed';
export interface ScenarioCount { adults: number; children: number; staff: number; total: number; }
export interface ScenarioBundle { planned: ScenarioCount; expected: ScenarioCount; confirmed: ScenarioCount; }

export function buildGuestScenarios(
  guests: Guest[],                // tutti gli ospiti del wedding (couple incluso)
  vendorStaffTotal: number,       // somma staff_meals_count dai vendors
  weddingTargets: { target_adults?: number|null; target_children?: number|null }
): ScenarioBundle
```

Regole interne (uniche, riusate):
- `adults` = righe non-staff e non-child (inclusi `is_couple_member`)
- `children` = righe non-staff con `is_child`
- `staff` = `vendorStaffTotal` (catering), **non** righe guest
- **planned**: `target_adults / target_children` dal wedding (fallback: scenario expected); staff = vendorStaffTotal
- **expected**: nucleus-aware via `calculateExpectedCounts` esistente (già scritto), + couple sempre incluso
- **confirmed**: `countHeadsByRsvp(..., 'confirmed')` + **tutti i couple members** (gli sposi sono di fatto confermati) + staff

## Refactor (sostituzioni meccaniche)
1. `src/pages/Dashboard.tsx` (l. 190–200) → `buildGuestScenarios(...)`
2. `src/pages/Budget.tsx` (l. 150–160) → idem
3. `src/pages/Vendors.tsx` (l. 189–200) → idem
4. `src/components/dashboard/GuestSummaryWidget.tsx` → pie "Confermati" = `scenarios.confirmed.adults + .children` (sposi già dentro). Rimuovo segment/card "Sposi" separato per evitare doppi conteggi visivi; resta una piccola nota "include sposi".
5. `src/components/budget/v2/ScenarioSelector.tsx` → già allineato (`adults + children`); ora i numeri tornano coerenti col pie.

## Aggiornamento memoria
Aggiorno `mem://architectural-principles/unificazione-metrizzazione-ospiti` e la Core memory: **gli sposi rientrano negli adulti CONFERMATI in tutti gli scenari**. Il nuovo helper `buildGuestScenarios()` è obbligatorio per chiunque mostri conteggi di scenario.

## Risultato atteso
- Stessi numeri ovunque (Dashboard pie = bottone ScenarioSelector = Budget = Vendors).
- Un solo punto da modificare in futuro (`guestScenarios.ts`).
- Nessuna modifica DB.
