

## Selettore Scenario nel Budget

Oggi `/app/budget` calcola sempre nello stesso modo (legge `calculation_mode` dal wedding e poi resta fisso). Aggiungiamo un **toggle a 3 scenari** nella hero del Budget, simile a quello che già esiste in altre sezioni (`CalculationModeToggle`), così puoi vedere all'istante come cambia il conto economico al variare delle teste.

### Cosa vedrai nella pagina

Nella hero, sotto al titolo "Conto economico", appare una riga discreta:

```text
Scenario: [ Pianificato (100) ] [ Lista invitati (132) ] [ Confermati (87) ]
            ↑ stima di partenza   ↑ tutti gli inseriti    ↑ RSVP confermati
```

- **Pianificato** — usa i target salvati sul matrimonio (es. 100 adulti, 0 bambini, 0 staff). Serve quando ancora non hai la lista.
- **Lista invitati** — somma tutti gli ospiti inseriti (tranne i declinati). Stima realistica man mano che costruisci la lista.
- **Confermati** — solo RSVP confermati. Il numero "vero" che usi a ridosso del matrimonio.

Cliccando uno scenario, **tutti i numeri della pagina si ricalcolano**: KPI hero (Impegnato, Da pagare), card Allocazione, timeline cashflow, tabella spese, drawer fornitore. Le spese a importo fisso non cambiano; quelle variabili (catering, bomboniere, segnaposto…) sì.

Lo scenario scelto viene **salvato sul matrimonio** (`weddings.calculation_mode`) così la prossima volta che apri il Budget ritrovi la stessa vista.

### Dettagli tecnici

1. **Nuovo componente** `src/components/budget/v2/ScenarioSelector.tsx`
   - 3 pill in stile "paper" (riusa `paperPrimitives`).
   - Mostra accanto a ogni label il conteggio adulti dello scenario corrispondente, preso da `guestCounts`.
   - Tooltip breve su ciascuno per spiegare cosa significa.

2. **`src/pages/Budget.tsx`**
   - Sostituisce l'inizializzazione fissa di `mode` con uno stato controllato dal nuovo selettore.
   - Default: `weddings.calculation_mode` se presente, altrimenti `'planned'`.
   - Su cambio scenario: aggiorna lo stato locale (i `useMemo` esistenti già ricalcolano `uiVendors`, `totals`, `upcoming`, `next`) **e** persiste con `update weddings set calculation_mode = …` (debounced/fire-and-forget, niente toast invasivo).

3. **`src/components/budget/v2/BudgetHero.tsx`**
   - Riceve `mode`, `onModeChange`, `guestCounts` come props.
   - Renderizza `<ScenarioSelector>` sotto al sottotitolo, allineato a destra del blocco titolo.
   - Aggiunge una piccola label sopra la KPI "Impegnato" tipo "calcolato su Lista invitati · 132 adulti" così è sempre chiaro cosa stai guardando.

4. **Nessuna modifica al data layer**: `buildVendors`, `calculateExpenseAmount` e `guestCounts` già supportano i tre scenari — li stiamo solo esponendo in UI.

### Cosa NON cambia

- Niente nuove tabelle, nessuna migration.
- I "target pianificati" (100 adulti default) restano gestiti come oggi su `weddings.target_adults/children/staff` — non aggiungiamo un editor qui per non ricomplicare. Se in futuro vuoi modificarli direttamente dal Budget, lo aggiungiamo come piccola "matita" accanto al pill "Pianificato".
- Le pagine Fornitori, Tesoreria e Catering continuano a funzionare come adesso.

