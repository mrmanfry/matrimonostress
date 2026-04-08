

## Problema di Scalabilità

Un tavolo imperiale da 100 posti con la vista top-down a due lati significherebbe 50 slot per lato — completamente illeggibile, specialmente su mobile. Inoltre, nella realtà, tavoli imperiali molto lunghi hanno spesso posti anche sulle **testate** (capotavola).

## Piano Rivisto: Vista Top-Down Adattiva

### Concetto

La vista si adatta alla dimensione del tavolo:

- **≤ 20 posti**: Vista grafica top-down completa con slot individuali sui due lati lunghi
- **> 20 posti**: Vista **compatta a griglia numerata** — due colonne (Lato A / Lato B) con righe numerate, scrollabile. Stessa logica di posizionamento, ma rappresentata come tabella ordinata anziché rettangolo grafico

```text
TAVOLO PICCOLO (≤20):
┌───────────────────────────────┐
│ [1.Marco] [2.Lucia] [3.Paolo]│  Lato A
│         ██████████████       │
│ [4.Anna] [5.Giulia] [6.___] │  Lato B
└───────────────────────────────┘

TAVOLO GRANDE (>20):
┌─────────────────────────────────┐
│  Lato A              Lato B    │
│  1. Marco Rossi      2. Anna  │
│  3. Lucia Bianchi    4. Giulia│
│  5. Paolo Verdi      6. ___   │
│  ...                 ...      │
│  49. ___             50. ___  │
└─────────────────────────────────┘
```

### Cambiamenti

1. **Migrazione DB**: Aggiungere `seat_position` (integer, nullable) a `table_assignments`

2. **Nuovo `ImperialTableLayout.tsx`**:
   - Riceve tavolo, ospiti, assignments con seat_position
   - Se `capacity ≤ 20`: renderizza il rettangolo SVG/CSS con slot droppable sui lati
   - Se `capacity > 20`: renderizza griglia a due colonne con righe numerate droppable
   - Zona "Non posizionati" in entrambi i casi per ospiti assegnati ma senza posto
   - Slot vuoti droppabili, bottone X per rimuovere dal posto

3. **Modifica `TableCanvas.tsx`**: Per tavoli imperiali, usa `ImperialTableLayout` al posto della lista

4. **Modifica `Tables.tsx`**: Gestire drop su slot specifico → salva `seat_position`

5. **Modifica `pdfHelpers.ts`**: Export ordinato per `seat_position` con indicazione Lato A/B

