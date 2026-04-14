

## Piano: Preservare Aspect Ratio del File Caricato

### Problema

Il canvas di `OverlayCanvasEditor` usa `aspectRatio: "1 / 1.414"` fisso. Qualsiasi file con proporzioni diverse (A5, quadrato, landscape, ecc.) viene distorto.

### Soluzione

1. **Rilevare l'aspect ratio reale** del file caricato in `PrintStudio.tsx`:
   - Per le **immagini**: creare un `Image()` e leggere `naturalWidth / naturalHeight`.
   - Per i **PDF**: il viewport di pdfjs ha già `width` e `height` — salvarli.
   - Salvare il rapporto in un nuovo stato `templateAspectRatio: number` (default `1 / 1.414`).

2. **Passare l'aspect ratio** a `OverlayCanvasEditor` come prop `aspectRatio?: number`.

3. **Usare la prop** nel canvas div al posto del valore hardcoded:
   ```ts
   aspectRatio: `1 / ${1 / (aspectRatio || 0.707)}`,
   ```

### File coinvolti

| File | Modifiche |
|------|-----------|
| `src/components/invitations/PrintStudio.tsx` | Nuovo stato `templateAspectRatio`, calcolarlo in `handleFileSelect` e `rasterizePdfPreview`, passarlo come prop |
| `src/components/invitations/OverlayCanvasEditor.tsx` | Aggiungere prop `aspectRatio?: number`, usarla al posto del valore fisso |

### Dettagli

- In `rasterizePdfPreview`, dopo `page.getViewport()`: `setTemplateAspectRatio(viewport.width / viewport.height)`
- In `handleFileSelect` per immagini: caricare in un `new Image()`, poi `setTemplateAspectRatio(img.naturalWidth / img.naturalHeight)`
- In `OverlayCanvasEditor`, il div canvas usa: `aspectRatio: aspectRatio ? \`${aspectRatio}\` : "0.707"` (width/height ratio)
- L'immagine di sfondo già usa `object-contain`, quindi si adatterà correttamente

