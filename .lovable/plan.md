

# Fix: Layout overlap + shutter non funzionante su mobile

## Problema 1 — Sovrapposizione layout

`CameraViewfinder` ha una propria barra controlli (shutter + contatore) in basso. `CameraPublic` piazza la nav "Scatta/Galleria" come `absolute bottom-0` sopra di essa. Le due barre si sovrappongono.

**Soluzione**: Aggiungere padding-bottom alla barra controlli del viewfinder per fare spazio alla nav bar, e rendere la nav bar con uno z-index superiore. In alternativa (approccio migliore), rimuovere il posizionamento absolute della bottom nav e renderla parte del flusso normale del layout:

In `CameraPublic.tsx`:
- Cambiare la bottom nav da `absolute bottom-0` a un elemento nel flusso del flex container (dopo il `<div className="flex-1 overflow-hidden">`)
- Rimuovere `pb-24` dalla gallery view (non più necessario)

In `CameraViewfinder.tsx`:
- Aggiungere `pb-20` (80px) alla barra controlli per lasciare spazio alla nav sottostante, OPPURE meglio: spostare il padding al contenitore `flex-1` nel parent

Approccio scelto — la bottom nav diventa parte del flex layout normale:

```
CameraPublic layout:
┌──────────────────┐
│ Hero Header      │
│ KPI Bar          │
│ ┌──────────────┐ │
│ │ Viewfinder   │ │  ← flex-1, min-h-0, overflow-hidden
│ │ + controls   │ │
│ └──────────────┘ │
│ [Scatta][Galleria]│  ← nel flusso, non absolute
└──────────────────┘
```

## Problema 2 — Foto non scattata

`processPhoto` legge `videoWidth`/`videoHeight` dal video. Su mobile il video potrebbe non aver caricato i frame quando l'utente preme il pulsante, risultando in dimensioni 0×0 → canvas vuoto → `toBlob` restituisce `null` → reject silenzioso.

**Soluzione** in `CameraViewfinder.tsx`:
1. Impostare `cameraReady = true` solo dopo l'evento `loadedmetadata` del video, non subito dopo `getUserMedia`
2. In `captureFromVideo`, aggiungere un check: se `videoWidth === 0`, non procedere (o attendere con un breve retry)
3. Aggiungere un `onLoadedMetadata` handler al `<video>` element

### File modificati

1. **`src/pages/CameraPublic.tsx`** — Bottom nav da absolute a flusso flex
2. **`src/components/memories/CameraViewfinder.tsx`** — Fix video readiness + padding per la nav

### Dettagli tecnici

**CameraPublic.tsx** (linee 332-453):
- Il `div` wrapper rimane `flex flex-col` con `fixed inset-0`
- Il contenuto (viewfinder/gallery) è nel `flex-1 overflow-hidden min-h-0`
- La bottom nav diventa l'ultimo figlio del flex, senza `absolute`, con `shrink-0` e safe-area padding

**CameraViewfinder.tsx**:
- Rimuovere `setCameraReady(true)` da `startCamera` (linea 42)
- Aggiungere `onLoadedMetadata={() => setCameraReady(true)}` al `<video>` (linea 192)
- In `captureFromVideo`: check `videoRef.current.videoWidth > 0` prima di processare
- La barra controlli non ha bisogno di padding extra perché la nav è ora fuori dal viewfinder

