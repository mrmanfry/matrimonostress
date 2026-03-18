

# Piano: Download foto + Limite 2000

## Cosa si fa

### 1. Migration SQL — Alzare limite a 2000
Aggiornare il default di `hard_storage_limit` da 500 a 2000 nella tabella `disposable_cameras`, e aggiornare i record esistenti.

### 2. Nuovo componente `PhotoLightbox.tsx`
Dialog full-screen per visualizzare una foto senza cornice FilmFrame:
- Navigazione prev/next con frecce
- Pulsante "Scarica" (fetch → blob → `<a download>` con nome `{guestName}_{dd-MM-yyyy_HH-mm}.webp`)
- Pulsante "Elimina" con conferma AlertDialog
- Metadata: nome ospite, data/ora

### 3. Aggiornare `MemoriesGallery.tsx`
- **Click su foto** → apre PhotoLightbox (se non in modalità selezione)
- **Toolbar selezione**: toggle "Seleziona", checkbox su ogni foto sbloccata, "Seleziona tutto", pulsante "Scarica selezionate" che genera ZIP con `jszip`
- **CTA sblocco sempre visibile**: mostrare il banner "Sblocca Album" anche quando foto < 100 (se non sbloccato), con testo "Sblocca per garantire che le foto non vengano eliminate dopo 30 giorni"
- **Callback onDelete**: per rimuovere foto dalla lista dopo eliminazione dal lightbox

### 4. Aggiornare `MemoriesKPIs.tsx`
- Warning badge arancione quando foto > 90% del limite
- Warning badge rosso quando foto = limite

### File coinvolti
1. **Migration SQL** — `ALTER COLUMN hard_storage_limit SET DEFAULT 2000` + UPDATE esistenti
2. **`src/components/memories/PhotoLightbox.tsx`** — nuovo
3. **`src/components/memories/MemoriesGallery.tsx`** — selezione, lightbox, CTA, toolbar
4. **`src/components/memories/MemoriesKPIs.tsx`** — warning badge
5. **`package.json`** — aggiungere `jszip`

