

## Miglioramenti Imperial Table Layout

L'utente chiede 3 cose:

1. **Non posizionati draggabili** — rendere gli ospiti nella zona "Non posizionati" trascinabili sugli slot vuoti
2. **Click su slot vuoto** — aprire un popover/dialog per selezionare un ospite (prima tra i non posizionati, poi tra quelli non ancora assegnati al tavolo)
3. **Iniziali + tooltip nei box grafici** — nei box della vista top-down mostrare solo le iniziali (es. "BP") con tooltip al hover per il nome completo. Aggiungere sotto il rettangolo grafico una lista "Posizionati" con numero e nome completo

### Cambiamenti in `ImperialTableLayout.tsx`

**A. Non posizionati draggabili**
- Importare `useDraggable` da `@dnd-kit/core`
- Wrappare ogni ospite nella `UnpositionedZone` con `useDraggable({ id: guest.id })` + attributi drag
- Questo li rende trascinabili sugli slot (che sono già droppable)

**B. Iniziali + Tooltip nei seat slot grafici (non-compact)**
- Nel `SeatSlot` non-compact, sostituire `guest.first_name` troncato con le iniziali: `${first_name[0]}${last_name[0]}`
- Wrappare il box con `Tooltip` (da `@/components/ui/tooltip`) che mostra `"Nome Cognome"` al hover
- Rimuovere il bottone X dal box grafico (troppo stretto) — la rimozione avviene dalla lista posizionati

**C. Lista "Posizionati" sotto il rettangolo**
- Dopo il rettangolo grafico e le label Lato A/B, aggiungere una sezione "Posizionati" che elenca: `{seatIndex}. {first_name} {last_name}` con bottone X per rimuovere dal posto
- Ordinata per seat_position, divisa in Lato A e Lato B

**D. Click su slot vuoto → Popover di selezione ospite**
- Aggiungere una prop `allGuests` e `allAssignments` (o gli ospiti non assegnati) al componente
- Quando si clicca su uno slot vuoto: aprire un `Popover` con una lista searchable (usando `Command` da shadcn)
- La lista mostra prima "Non posizionati al tavolo" (assegnati ma senza seat), poi "Da assegnare" (non assegnati a nessun tavolo)
- Al click su un ospite: chiamare `onUpdateSeatPosition` per i non posizionati, oppure una nuova callback `onAssignToSeat(guestId, seatPosition)` per i non assegnati

### Cambiamenti in `TableCanvas.tsx`
- Passare `guests` (pool completo) e `assignments` a `ImperialTableLayout` — già fatto
- Aggiungere prop `onAssignToSeat` callback

### Cambiamenti in `Tables.tsx`
- Creare handler `handleAssignToSeat(tableId, guestId, seatPosition)` che inserisce assignment con seat_position
- Passarlo a `TableCanvas` → `ImperialTableLayout`

### Props aggiornate di `ImperialTableLayout`
```text
+ allGuests: Guest[]           // tutti gli ospiti per il popover di selezione
+ allAssignments: Assignment[] // tutti gli assignment per sapere chi è libero
+ onAssignToSeat: (guestId: string, seatPosition: number) => void
```

