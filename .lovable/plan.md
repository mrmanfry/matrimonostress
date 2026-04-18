

## Contesto aggiornato

Hai caricato `Libretti_messa-handoff.zip` (handoff completo del designer, presumibilmente con tutti i JSX referenziati nel `Libretti_messa.html` originale + asset). In chat mode non posso estrarre lo zip (richiede `code--exec`), quindi **l'estrazione è il primo step in default mode**.

Il piano resta lo stesso del precedente — confermato dai default — ma ora con la sorgente completa invece dei soli token CSS.

## Approccio (3 fasi)

### Fase 1 — Estrazione & inventario handoff
1. Estraggo `Libretti_messa-handoff.zip` in `/tmp/handoff/`
2. Inventario di tutto: JSX (icons, data, ui, app-shell, preview, library, editor, tweaks, main), eventuali asset (font, immagini, SVG), README/docs
3. Mappo ogni componente designer → componente target nel nostro stack (TS/TSX + Tailwind + shadcn)
4. **Report di mapping in chat prima di scrivere codice di produzione** (cosa riuso 1:1, cosa adatto, cosa scarto)

### Fase 2 — Design tokens condivisi (globali, riusabili in tutta l'app)
Aggiungo a `tailwind.config.ts` + `src/index.css`:
- Palette "warm paper" (beige caldo, grigi caldi, accent viola `#8B5CF6`) come CSS vars HSL
- Font family aggiuntive: `fraunces`, `instrument-serif`, `jetbrains-mono` (Inter è già coperta)
- Eventuali shadow/radius/spacing custom dal designer
- Asset font/immagini → `src/assets/` (con `lov-copy` dallo zip estratto)

Token globali = la futura topbar e il design system sono pronti per estendersi a `/app/*`.

### Fase 3 — Rebuild Libretto Messa in split-screen

```text
┌─────────────────────────────────────────────────────────┐
│ TOPBAR: ← back │ titolo │ status save │ esporta PDF/DOCX │
├──────────────────────────────┬──────────────────────────┤
│ EDITOR (accordion sezioni)   │ PREVIEW A5 LIVE          │
│  • Setup • Rito • Letture    │  PDFViewer @react-pdf    │
│  • Personalizzazioni • Stile │  con debounce 800ms      │
└──────────────────────────────┴──────────────────────────┘
```

**Nuovi** in `src/components/mass-booklet/v2/`:
- `BookletShell.tsx` — layout split + topbar
- `BookletEditor.tsx` — accordion che orchestra i 5 BookletStep* esistenti
- `BookletLivePreview.tsx` — `<PDFViewer>` con debounce

**Invariati** (zero rischio): `BookletPdfDocument.tsx`, tutti i `Pdf*.tsx`, `BookletStepSetup/Rite/Readings/Custom/Style.tsx`, `massBookletSchema.ts`, `bookletDocxExport.ts`, auto-save, validation, RPC.

**Mobile** (≤768px): fallback allo stepper attuale (lo split A5 non funziona, già coerente con il constraint `invitation-editor-mobile-access`).

### Topbar globale (NON in questo PR)
Pilotata prima dentro Libretto. Dopo la tua conferma, in un PR successivo la promuoviamo in `AppLayout.tsx`.

## Default applicati (dal piano precedente, già impliciti)

1. Stepper vecchio → **eliminato** dopo rebuild
2. Preview live → **`<PDFViewer>` con debounce 800ms** (1:1 garantito)
3. Topbar globale → **valutata dopo il pilot**

## File toccati (stima)

- **Nuovi**: `BookletShell.tsx`, `BookletEditor.tsx`, `BookletLivePreview.tsx` (in `src/components/mass-booklet/v2/`), eventuali asset in `src/assets/`
- **Modificati**: `src/pages/MassBooklet.tsx` (rewrite layout, save logic invariata), `tailwind.config.ts`, `src/index.css`
- **Invariati**: schema, PDF engine, DOCX export, step components, auto-save, RPC

