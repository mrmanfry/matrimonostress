
# Piano: Editor Immagine Canva-like per Inviti Cartacei

## Cosa vuole l'utente

1. **Drag & Resize dell'immagine** nella metà superiore dell'invito — poter spostare e ridimensionare la foto dentro il contenitore
2. **Guide di centratura** (linee rosse al centro orizzontale/verticale) che appaiono durante il drag, come Canva
3. **Supporto PNG con trasparenza** — sfondo bianco del foglio visibile dove la PNG è trasparente, nessuno "stacco" visivo

## Approccio tecnico

Nessuna libreria esterna necessaria. Implementiamo drag + resize con mouse/touch events nativi e stato React.

### Nuovo stato immagine (in PrintInvitationEditor)

```typescript
interface ImageTransform {
  x: number;      // offset X in % (-50 to 50)
  y: number;      // offset Y in % (-50 to 50)  
  scale: number;  // 0.5 to 2.0
}
```

Stato iniziale: `{ x: 0, y: 0, scale: 1 }`. Passato a `PrintDesignStep` e `HiddenPrintNode`.

### Interazioni nella Preview (PrintDesignStep)

**Drag per riposizionare:**
- `onMouseDown` / `onTouchStart` sulla zona foto → traccia il delta di movimento
- Aggiorna `x, y` del transform in tempo reale
- Cursore `grab` / `grabbing`

**Slider per scala:**
- Nella sidebar, aggiungere un `Slider` (shadcn) sotto l'upload foto: "Dimensione immagine" (range 50%-200%)
- Controlla `transform.scale`

**Guide di centratura (snap lines):**
- Quando `|x| < 2` → mostra linea verticale rossa al centro
- Quando `|y| < 2` → mostra linea orizzontale rossa al centro
- Opzionale: snap magnetico quando vicino al centro

### Rendering dell'immagine (sia Preview che HiddenPrintNode)

Invece di `background-image` con `cover`, usiamo un `<img>` tag posizionato:

```css
/* Container */
position: relative; overflow: hidden;

/* Immagine */
position: absolute;
left: 50%; top: 50%;
transform: translate(calc(-50% + Xoffset), calc(-50% + Yoffset)) scale(S);
/* Niente object-fit — l'immagine mantiene le sue dimensioni naturali */
/* PNG con trasparenza: sfondo bianco del container traspare */
```

Il `mask-image` gradient viene applicato al **container**, non all'immagine, per mantenere l'effetto sfumato.

### File modificati

1. **`PrintInvitationEditor.tsx`** — Aggiungere stato `imageTransform`, passarlo a PrintDesignStep e HiddenPrintNode
2. **`PrintDesignStep.tsx`** — Ridisegno zona foto:
   - Immagine come `<img>` con `transform` dinamico
   - Mouse drag handlers (`onMouseDown`, `onMouseMove`, `onMouseUp`)
   - Guide di centratura (2 div assoluti rossi, visibili solo durante drag quando vicini al centro)
   - Slider "Dimensione" nella sidebar
   - Accept `.png` esplicitamente nell'input file
3. **`HiddenPrintNode.tsx`** — Applicare stesso transform all'immagine per coerenza col PDF
4. **`PrintDesignStep.tsx` props** — Aggiungere `imageTransform` e `onImageTransformChange`

### Dettagli UX

- Le guide rosse appaiono **solo durante il drag** e solo quando l'immagine è vicina al centro (threshold ~2%)
- Snap magnetico opzionale: se entro 2% dal centro, scatta a 0
- Il slider scala ha step di 0.05 per controllo fine
- Il file input accetta `image/*` (include PNG)
- La zona foto ha sfondo bianco, quindi PNG trasparenti si integrano naturalmente

