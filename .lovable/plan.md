

## Piano: Fix Corrispondenza Preview ↔ PDF Generato

### Problema

Il PDF generato non corrisponde all'anteprima per due ragioni:

1. **Font size del saluto**: Nel preview, il fontSize viene moltiplicato per `0.4` (riga 693: `fontSize * 0.4`px) per adattarsi al canvas di ~500px. Ma nel PDF engine, il fontSize viene usato **tal quale** come punti PDF (28pt diretto). Risultato: il testo nel PDF è ~2.5x più grande di quanto appare nell'anteprima.

2. **Dimensione QR code**: La posizione usa percentuali (corretto), ma il QR potrebbe apparire diverso perché il canvas di preview e la pagina PDF hanno proporzioni diverse se l'aspect ratio non viene passato correttamente.

### Causa radice

```text
Preview:   fontSize=28 → renderizzato come 28*0.4 = 11.2px in un canvas di ~500px → 2.24% della larghezza
PDF:       fontSize=28 → 28pt in una pagina di ~420pt → 6.67% della larghezza → ~3x più grande
```

### Soluzione

**File**: `src/lib/printGeneratorEngine.ts`

1. **Scalare il fontSize proporzionalmente**: Usare lo stesso fattore `0.4` e poi convertire rispetto alla larghezza della pagina PDF, usando 500 come larghezza di riferimento del canvas preview:

```typescript
// Prima (sbagliato):
const greetFontSize = greetingConfig.fontSize;

// Dopo (corretto):
const PREVIEW_CANVAS_REF_WIDTH = 500; // maxWidth del canvas CSS
const greetFontSize = (greetingConfig.fontSize * 0.4 / PREVIEW_CANVAS_REF_WIDTH) * pageW;
```

Per fontSize=28 su una pagina 419pt: `(28 * 0.4 / 500) * 419.53 ≈ 9.4pt` — proporzionalmente identico al preview.

2. **Font custom**: Attualmente usa Helvetica nel PDF ma nel preview mostra il font scelto (Great Vibes, Garamond, ecc.). Per un fix completo, embeddare il font selezionato nel PDF. Come primo step, usiamo un approccio con font embedding via fetch del Google Font e `pdfDoc.embedFont(fontBytes)`. Se troppo complesso, almeno scalare correttamente il Helvetica.

3. **Centratura testo**: Attualmente centra usando `widthOfTextAtSize` che calcola con Helvetica. Dopo il fix del font size, questo sarà più accurato.

### File modificati

| File | Modifica |
|------|----------|
| `src/lib/printGeneratorEngine.ts` | Scalare fontSize con riferimento canvas 500px, tentare embedding font Google |

### Dettaglio tecnico

Per l'embedding del font custom, il flow sarà:
1. Mappare `fontStyle` → URL Google Fonts (usando la stessa `FONT_MAP` del preview)
2. Fetch del file `.ttf` a runtime
3. `pdfDoc.embedFont(fontBytes)` al posto di `StandardFonts.Helvetica`
4. Fallback a Helvetica se il fetch fallisce

Questo garantirà che il PDF sia pixel-perfect rispetto all'anteprima sia in dimensione che in stile del font.

