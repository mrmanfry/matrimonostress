# Generatore Tableau de Mariage

Studio di stampa per creare il tableau: l'utente carica lo sfondo (es. esportato da Canva), l'app sovrappone i tavoli e gli ospiti confermati come blocchi tipografici, e produce un file pronto per la tipografia.

## 1. Database & Storage

**Migration**: nuova tabella `public.tableau_layouts`
- `id`, `wedding_id` (unique, FK → weddings), `background_path` text
- `width_cm` numeric default 70, `height_cm` numeric default 100, `orientation` text default 'portrait'
- `style` jsonb (fontFamily, fontColor, baseFontSize, textAlign, displayMode)
- `blocks` jsonb default `'{}'` — mappa `table_id → { x_pct, y_pct, w_pct }`
- `status` text default 'draft' check in ('draft','frozen')
- `created_at`, `updated_at` con trigger
- GRANT a `authenticated` + `service_role`; RLS via `has_wedding_access(auth.uid(), wedding_id)`

**Storage**: bucket privato `tableau-backgrounds` con policy RLS per-wedding (path `{wedding_id}/...`), stessa struttura di `vendor-documents`.

## 2. Rotta & entry point

- Nuova pagina `src/pages/TableauGenerator.tsx` alla rotta `/app/tableau` in `src/App.tsx` (dentro `AppLayout`, `ProtectedRoute requireWedding`).
- In `src/pages/Tables.tsx`, aggiungo un pulsante "Genera Tableau" (icona `LayoutTemplate`) in `headerActions` che naviga a `/app/tableau`. Nessun'altra modifica a Tables.tsx.

## 3. Setup flow (prima visita)

1. Step upload sfondo: PNG/JPG, max 15MB, validazione client-side, upload su `tableau-backgrounds/{wedding_id}/bg-{timestamp}.{ext}`.
2. Step formato di stampa: preset (70×100 verticale, 100×70 orizzontale, 50×70, A1 594×841) + modalità custom (cm).
3. Insert riga in `tableau_layouts`, poi apre workspace.

## 4. Workspace — logica dati

**One-way binding**: il generatore NON scrive mai su `tables`, `table_assignments`, `guests`. Legge solo.

Al caricamento (e su realtime opzionale):
- Fetch `tables` + `table_assignments` + `guests` (filtrando `rsvp_status.eq.confirmed,rsvp_status.eq.Confermato` con `.or()` come in Tables.tsx) + `invite_parties` per il display "Per Famiglia".
- Ricostruisco i +1 virtuali con la stessa logica di Tables.tsx (allow_plus_one + plus_one_name, esclusi quelli già promossi).
- Per ogni tavolo non vuoto costruisco `{ tableId, title: table.name, guests: [...] }`.
- Merge con `blocks` salvati:
  - blocchi salvati per tavoli inesistenti → pruning silenzioso
  - tavoli non vuoti senza posizione → Staging Area sidebar + toast "Hai un nuovo tavolo da posizionare!"
- Il contenuto testuale è SEMPRE ricalcolato al volo → gli ospiti rimossi/declined scompaiono automaticamente.

## 5. Canvas & editing

- Container letterboxed che rispetta strettamente l'aspect ratio fisico (`width_cm / height_cm`), scala per riempire lo schermo disponibile.
- Sfondo caricato via signed URL dallo Storage.
- Drag & drop con `@dnd-kit/core` (già in uso); posizioni salvate come percentuali (`x_pct`, `y_pct`).
- Handle di resize orizzontale opzionale per `w_pct` del blocco.
- Pannello stile globale (applica a TUTTI i blocchi):
  - **Font Family**: dropdown popolato dalle chiavi di `GOOGLE_FONT_TTF_MAP` (importato da `printGeneratorEngine.ts`); caricamento live via `<link>` Google Fonts CSS per far combaciare anteprima ed export.
  - **Font Color**: color picker.
  - **Base Font Size**: slider (8–32pt); titolo tavolo = 1.4×, nomi ospiti = 1×.
  - **Text Alignment**: left / center / right.
  - **Display Mode**: `full` "Nome Cognome" | `first` "Solo Nome" | `family` (raggruppa per `invite_parties.party_name` → "Famiglia Rossi (4)"; senza party listato individualmente).
- Autosave: debounce 800ms → upsert `tableau_layouts`; indicatore "Salvato" discreto in header.

## 6. Export

**PDF** (bottone "Esporta per la Stampa"):
- Riutilizzo pattern di `src/lib/printGeneratorEngine.ts`:
  - `pdf-lib` PDFDocument, pagina di dimensioni `width_cm * 28.3465` × `height_cm * 28.3465` pt.
  - `embedJpg`/`embedPng` sullo sfondo full-bleed.
  - Font Google fetchato via `fetchGoogleFontBytes()` (esporto la funzione da `printGeneratorEngine.ts` o duplico in un nuovo helper `tableauGeneratorEngine.ts`), fallback Helvetica.
  - Testo disegnato vettorialmente con `page.drawText`, mappatura `% → pt` identica al pattern esistente (`PREVIEW_CANVAS_REF_WIDTH` / `PREVIEW_FONT_SCALE`).
  - Testo vettoriale = qualità infinita, il 300 DPI è nativamente soddisfatto per il testo.

**PNG 300 DPI** (bottone secondario):
- Rendering via `<canvas>` alle dimensioni `width_cm / 2.54 * 300` px, disegno sfondo + testo con `ctx.fillText` usando il font Google già caricato.

**Post-export**: aggiorno `status = 'frozen'`. Banner persistente nel workspace: "Tableau esportato — le modifiche successive agli ospiti/tavoli non sono riflesse nella stampa" con bottone "Riporta in bozza" (`status = 'draft'`). Se frozen e il contenuto ricomputato differisce dallo snapshot dell'ultimo export (salvo hash del contenuto in `style.lastExportHash`), banner in colore warning.

## 7. UX

- Mobile (`useIsMobile`): preview read-only + notice "L'editing richiede desktop".
- Loading state con lo stesso pattern degli altri moduli (Heart pulse).
- Empty state per matrimoni senza tavoli confermati.
- Toast in italiano per tutti gli errori (upload, save, export).
- Copy interamente in italiano, tono coerente con l'app.

## Dettagli tecnici

- Nuovo file `src/lib/tableauGeneratorEngine.ts` con `generateTableauPDF()` e `generateTableauPNG()`; import `GOOGLE_FONT_TTF_MAP` e `fetchGoogleFontBytes` da `printGeneratorEngine.ts` (esporto la funzione se non lo è già).
- Componenti in `src/components/tableau/`:
  - `TableauSetupWizard.tsx` (upload + formato)
  - `TableauCanvas.tsx` (container + dnd-kit)
  - `TableauBlock.tsx` (blocco draggable)
  - `TableauStylePanel.tsx` (pannello destro)
  - `TableauStagingArea.tsx` (sidebar sinistra)
  - `TableauExportBanner.tsx`
- Hook `useTableauLayout(weddingId)` per fetch/upsert con debounce.
- Nessuna modifica a: engine inviti, logica assegnazione tavoli, altri flussi Tables.tsx (solo aggiunta pulsante).
