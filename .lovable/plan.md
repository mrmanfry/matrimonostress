
## Obiettivo
Rendere finalmente visibile e usabile dall'UI la disposizione dei posti sui tavoli imperiali con un popup dedicato in vero drag & drop, che permetta di spostare gli ospiti tra sedie e tra i due lati (Lato A / Lato B), oltre a trascinare da "Da assegnare".

## Problema attuale
- Sulla miniatura del tavolo imperiale i posti sono cerchi da 13px senza affordance → nessuno capisce che sono cliccabili.
- Il dialog che si apre cliccandoli (`SeatActionDialog`) è una lista di sedie da toccare, non drag & drop.
- Il pannello di dettaglio a destra non offre alcun modo per riordinare le sedie: mostra solo un elenco piatto "Seduti".
- Il PDF invece già stampa le posizioni corrette perché il DB salva `seat_position` — quindi la logica c'è, manca la UI.

## Cosa costruisco

### 1. Nuovo componente `ImperialSeatEditorDialog`
File: `src/components/tables/ImperialSeatEditorDialog.tsx`

Popup dedicato (max-w-3xl, mobile full-screen) contenente:

- **Header**: nome tavolo · badge "Imperiale" · contatore `seduti/capacità`.
- **Canvas del tavolo** in orizzontale, in stile PDF:
  ```text
  LATO A
  [1][2][3][4][5][6]       ← sedie grandi 52px, drop target
   ▔▔▔▔▔▔▔▔▔▔▔▔▔▔
  [ TAVOLO IMPERIALE  ]
   ▁▁▁▁▁▁▁▁▁▁▁▁▁▁
  [7][8][9][10][11][12]
  LATO B
  ```
  - Ogni sedia mostra: iniziali colorate per gruppo + nome/cognome sotto se occupata; bordo tratteggiato + "Libero" se vuota.
  - Icona ✕ in hover per rimuovere dal tavolo.
- **Sidebar "Da assegnare"** a destra (nascosta su mobile, mostrata come sezione sotto): elenco pool ospiti come chip trascinabili.

### 2. Interazioni (@dnd-kit, già in progetto)
- Trascinare un ospite seduto su:
  - **sedia libera** → sposta (`onMoveToSeat(guestId, tableId, seatIndex)`)
  - **sedia occupata** → **swap** (il servizio già supporta lo swap in `handleMoveToSeat` esistente)
  - da Lato A a Lato B e viceversa (stessa API, cambia solo `seat_position`)
- Trascinare un ospite dal pool → drop su sedia libera → `onAssignToSeat(tableId, guestId, seatIndex)`.
- Click sull'icona ✕ sopra la sedia → rimuove dal tavolo.
- `DndContext` locale al dialog (non interferisce con il DnD della sala). `DragOverlay` per il chip trascinato.

### 3. Accesso al popup — affordance chiari
- **`TableCardV2`** (griglia desktop): sulle card imperiali aggiungo un pulsante "Gestisci posti" (icona `LayoutGrid`) visibile in overlay in basso a destra sulla card.
- **`TableDetailPanel`**: se `isImperial`, aggiungo bottone "Gestisci posti" nell'header accanto a Modifica (nuovo prop `onOpenSeatEditor`).
- **`TablesGridView`**: apre il nuovo dialog invece di `SeatActionDialog` per gli imperiali (per i tondi resta invariato).
- **`MobileTableSheet`**: per imperiali, il tap su un seduto o su un nuovo pulsante "Gestisci posti" apre l'editor a full-screen.

### 4. Backend
Nessuna modifica DB o edge function. Uso le callback già presenti in `src/pages/Tables.tsx`:
- `handleMoveToSeat` (già gestisce swap)
- `handleAssignToSeat`
- rimozione via delete su `table_assignments`

## File toccati
- **Nuovo**: `src/components/tables/ImperialSeatEditorDialog.tsx`
- Modificati:
  - `src/components/tables/v2/TablesGridView.tsx`
  - `src/components/tables/v2/TableCardV2.tsx`
  - `src/components/tables/v2/TableDetailPanel.tsx` (nuovo prop `onOpenSeatEditor`)
  - `src/components/tables/MobileTableSheet.tsx`
- Passaggio props in `src/pages/Tables.tsx` (nessuna nuova logica dati)

## Fuori scopo
- Nessuna modifica ai tavoli tondi.
- Nessuna modifica al PDF export, al Tableau, alle regole di conflitto o allo schema DB.
