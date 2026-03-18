

# Fix: KPI "Scatti disponibili" e download mobile

## Problema 1 — KPI "Scatti disponibili" mostra 2500

Il KPI "Scatti disponibili" usa `hardLimit - totalPhotos` (2500 - 0 = 2500). Questo è il limite tecnico di storage, non il limite di visibilità. Deve invece mostrare quante foto l'utente può **vedere** con il suo piano attuale e invitare all'upgrade.

**Soluzione**: Sostituire il KPI "Scatti disponibili" con un KPI "Piano attivo" che mostra il tier corrente (es. "Base — 150 foto") e, se ci sono foto oltre il limite o se il piano è base, mostrare un badge cliccabile "Upgrade" che scrolla alla sezione tier nella gallery.

Alternativa più semplice: cambiare il valore da `hardLimit - totalPhotos` a `unlockedPhotoLimit` con label "Limite foto" e sub-label che indica il piano. Badge "Upgrade" se il limite è < 2500.

## Problema 2 — Download mobile: ZIP + WebP scomodo

Su mobile, scaricare uno ZIP con file .webp è inutilizzabile per la maggior parte degli utenti. 

**Soluzione**:
- **Singola foto** (lightbox): convertire il WebP in JPEG lato client (via Canvas API) prima del download, con filename `.jpg`. Funziona ovunque.
- **Selezione multipla**: su mobile (< 768px), invece dello ZIP, scaricare le foto una alla volta come JPEG con un piccolo delay tra una e l'altra, oppure usare la Web Share API (`navigator.share`) se disponibile per condividere i file direttamente.
- Fallback: se `navigator.share` non è supportato e sono selezionate > 1 foto, mostrare un avviso che suggerisce di scaricare una alla volta oppure procedere con ZIP come ultima risorsa.

## File da modificare

1. **`src/components/memories/MemoriesKPIs.tsx`** — Cambiare KPI "Scatti disponibili": mostrare `unlockedPhotoLimit` come valore, label "Limite foto", badge "Upgrade" cliccabile se < 2500
2. **`src/components/memories/PhotoLightbox.tsx`** — Nel `handleDownload`, convertire WebP→JPEG via Canvas prima di salvare. Filename con `.jpg`
3. **`src/components/memories/MemoriesGallery.tsx`** — Nel `downloadSelected`:
   - Su mobile: usare `navigator.share()` con File objects (JPEG) se disponibile
   - Fallback mobile: download sequenziale come JPEG singoli
   - Desktop: mantenere ZIP ma convertire in JPEG

## Dettagli tecnici

### Conversione WebP → JPEG (utility riusabile)
```typescript
async function convertToJpeg(blob: Blob): Promise<Blob> {
  const img = new Image();
  const url = URL.createObjectURL(blob);
  await new Promise((resolve) => { img.onload = resolve; img.src = url; });
  URL.revokeObjectURL(url);
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  canvas.getContext("2d")!.drawImage(img, 0, 0);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.92));
}
```

### KPI "Limite foto"
- Valore: `unlockedPhotoLimit` (150 / 500 / 1500 / 2500)
- Sub: nome del piano (Base / Starter / Plus / Premium)
- Badge: "Upgrade" con icona Sparkles se < 2500

