## Problema

Sui tavoli imperiali non si riesce a riposizionare un ospite già seduto. Da desktop il click su un posto occupato lo rimuove e basta; da mobile la scheda tavolo mostra solo un elenco senza numeri di posto né azione "Sposta".

## Obiettivo

Permettere, sia da mobile che da desktop, di **spostare un ospite già seduto in un altro posto del tavolo imperiale** (con swap automatico se il posto di destinazione è già occupato), in modo coerente con la logica già usata in `handleAssignToSeat` su `Tables.tsx` (che fa già lo swap se il posto è occupato).

## Cosa cambia

### 1. Desktop — `src/components/tables/v2/ImperialTableSvg.tsx`
- Sostituire l'azione "click su posto occupato = rimuovi" con un piccolo **Popover** contestuale che mostra:
  - Nome ospite (header)
  - "Sposta in posto…" → apre una griglia compatta dei posti del tavolo (1…N), evidenziando liberi/occupati; selezionando un posto si chiama `onAssignToSeat(tableId, guest.id, nuovoPosto)` (lo swap è già gestito).
  - "Rimuovi dal tavolo" → chiama l'attuale `onSeatClick` (unassign).
- Rendere il `<g>` dell'ospite anche **draggable** (`useDraggable({ id: guest.id })`) così su desktop si può trascinare un ospite seduto in un altro posto dello stesso tavolo (o di un altro tavolo). Drop su `seat_*` è già gestito in `handleDragEnd`.
- Nessuna modifica alle props pubbliche oltre all'aggiunta opzionale di `onMoveToSeat?: (guest, newSeat) => void`, che `TableCardV2` / `TablesGridView` mappano a `onAssignToSeat(tableId, guestId, seat)` già esistente.

### 2. Mobile — `src/components/tables/MobileTableSheet.tsx`
- Aggiungere `tableType`, `onAssign`/`onUnassign` già presenti; serve un nuovo prop opzionale `onMoveSeat(assignmentId, newSeat)` che mappa su `handleUpdateSeatPosition` di `Tables.tsx` (più swap, vedi sotto).
- Per i tavoli **imperiali** mostrare gli ospiti seduti in **due colonne (Lato A / Lato B)** con il **numero di posto** davanti al nome.
- Tap su un ospite seduto → apre un piccolo Sheet/Drawer con:
  - "Sposta in un altro posto" → griglia 2 colonne dei posti A/B, ogni cella mostra n° posto + nome occupante (se c'è); selezionando si esegue lo spostamento (con swap se occupato).
  - "Rimuovi dal tavolo".
- Per i tavoli **tondi** mantenere l'UI attuale (non hanno seat_position significativa).

### 3. Wiring in `src/pages/Tables.tsx`
- Esporre/usare una funzione `handleMoveSeat(assignmentId, newSeat)` che riusa la stessa logica di swap già presente in `handleAssignToSeat` (cerca occupante del posto, lo libera, poi aggiorna).
- Passarla a `MobileTableSheet` e a `TablesGridView` → `TableCardV2` → `ImperialTableSvg`.

## Cosa NON cambia

- Logica DB/RLS, schema `table_assignments`.
- Comportamento dei tavoli tondi.
- Drag&drop dalla pool ai tavoli (già funzionante).
- Conteggi capacità (già corretti dopo il fix precedente sui +1).

## Verifica

- Mobile: aprire un tavolo imperiale, toccare "Giuseppe Vecchio", scegliere "Sposta", selezionare il posto accanto a "Carlotta" → i due si scambiano se necessario.
- Desktop: stessa cosa via Popover sul posto, e in più drag del cerchio ospite su un altro posto dello stesso tavolo.