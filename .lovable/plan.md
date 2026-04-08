

## Piano: Testo e QR trascinabili nell'anteprima

### Problema attuale

Il layout e rigido: foto = 50% superiore, testo = 50% inferiore, QR fisso in fondo. Se la foto e piccola e spostata in alto, il testo resta ancorato in basso lasciando un vuoto. Il QR non e riposizionabile ne ridimensionabile.

### Soluzione

Aggiungere due nuovi "oggetti trascinabili" nell'anteprima del design integrato:

1. **Blocco testo** — trascinabile verticalmente (su/giu). L'utente afferra il blocco testo e lo sposta per allinearlo sotto la foto o dove preferisce.

2. **QR Code** — trascinabile liberamente (X e Y) + ridimensionabile con handle, come gia avviene nel QRCanvasEditor del Print Studio custom.

### Dettagli tecnici

**Nuovi tipi di stato** (in `PrintInvitationEditor.tsx`):

```
textPosition: { y: number }         // % dall'alto (default 55 con foto, 30 senza)
qrPosition: { x: number, y: number, size: number }  // % left, top, size in % della larghezza
```

Persistiti nel JSONB `print_design` insieme al resto.

**`PrintDesignStep.tsx`** — Modifiche all'anteprima:

- Il blocco testo diventa un `div` con `position: absolute`, `top: {textPosition.y}%`, trascinabile verticalmente via pointer events (stesso pattern della foto). Cursore grab, guide di snap.
- Il QR placeholder in fondo al `renderTextContent` viene rimosso e sostituito con un overlay QR indipendente posizionato con `left/top` in percentuale, ridimensionabile con handle in basso a destra (stesso pattern di `QRCanvasEditor`).
- Sidebar: aggiungere slider "Posizione testo" e slider "Dimensione QR" per controllo fine, oltre al drag visuale.

**`HiddenPrintNode.tsx`** — Modifiche al rendering PDF:

- Il blocco testo usa `top: {textPosition.y}%` invece di essere ancorato al 50%.
- Il QR viene posizionato con `left/top/width` in percentuale invece che inline nel flusso testo.

**Props aggiunte** a `PrintDesignStep` e `HiddenPrintNode`:

```
textPosition: { y: number }
onTextPositionChange: (pos) => void
qrPosition: { x: number, y: number, size: number }
onQrPositionChange: (pos) => void
```

### File modificati

1. **`src/components/print/PrintInvitationEditor.tsx`** — Nuovi stati `textPosition` e `qrPosition`, default, persistenza, passaggio props
2. **`src/components/print/PrintDesignStep.tsx`** — Anteprima con testo e QR trascinabili, slider nella sidebar, props aggiornate
3. **`src/components/print/HiddenPrintNode.tsx`** — Rendering PDF con posizioni dinamiche di testo e QR

### Ordine di esecuzione

1. Aggiungere stati e persistenza in `PrintInvitationEditor`
2. Implementare drag testo + drag/resize QR nell'anteprima di `PrintDesignStep`
3. Aggiornare `HiddenPrintNode` per posizioni dinamiche

