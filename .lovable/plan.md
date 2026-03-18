

# Piano: Redesign Mobile Camera + Poster QR + Galleria Ospite Retro

## Cosa costruiamo

Tre macro-interventi ispirati ai riferimenti visivi forniti:

### 1. Redesign CameraPublic — Layout mobile dark/gold premium

Riscrittura completa del layout di `CameraPublic.tsx` per replicare l'estetica delle reference (sfondo nero, accenti gold `#C9A96E`, tipografia elegante):

- **Hero header**: nome del matrimonio + data (da `disposable_cameras` → join con `weddings` per recuperare nomi e data). Se la coppia ha un cover photo, mostrarla come sfondo del hero con overlay gradient.
- **KPI bar**: Shots Taken / Participants / Days Left — icone gold con numeri grandi, sotto il hero.
- **Bottom nav**: due bottoni grandi "Camera" e "Galleria" con bordo gold, fissi in basso (sticky), stile pill come nel reference.
- **Viewfinder redesign**: frame con angoli stile mirino (corner brackets), label "FILM 400" in basso a destra, contatore grande `15 / 24 SHOTS` sotto il viewfinder, shutter button con anello luminoso gold.
- **Galleria ospite**: grid 3 colonne con `FilmFrame` aggiornato per avere bordo scuro + label "DISPOSABLE CAMERA" in alto (stile polaroid retro), effetto pellicola sui bordi.

### 2. Poster QR Code — Editor stampabile A3

Nuovo componente `QRPosterEditor` con wizard simile a `PrintInvitationEditor`, riutilizzando lo stesso pattern architetturale:

- **Step 1 — Design**: Upload foto di sfondo, scelta font (riuso `FontStyle`/`FONT_MAP`), testo personalizzabile (titolo, sottotitolo, istruzioni), posizionamento QR code, anteprima live.
- **Step 2 — Export**: Generazione PDF A3 (297×420mm) ad alta qualità via `jsPDF` + `html2canvas` con scale 3 per 300 DPI.
- **Layout poster**: composizione verticale — foto grande in alto, testo elegante al centro, QR code in basso con caption "Scansiona per scattare!".
- **Persistenza**: salvataggio config poster in `disposable_cameras.poster_design` (JSONB, stessa strategia di `print_design` su weddings).
- **Accesso**: nuovo bottone "Crea Poster" nel `ShareCameraDialog` o nella toolbar del MemoriesReel.

DB migration necessaria: aggiunta colonna `poster_design jsonb` a `disposable_cameras`.

### 3. FilmFrame retro + galleria guest migliorata

- **FilmFrame v2**: bordo esterno scuro con texture pellicola, header con testo "DISPOSABLE CAMERA" in font mono piccolo, sprocket holes sui lati (CSS pseudo-elements), data in formato analogico.
- **Galleria guest su CameraPublic**: mostra contatore "X foto scattate, Y rimanenti" in alto, grid 3 colonne con film frames retro, scroll fluido.
- **Shot counter nel viewfinder**: numeri grandi stile contatore meccanico (digit singoli in box separati), label "SHOTS" accanto.

## Dettagli tecnici

**File da creare:**
- `src/components/memories/QRPosterEditor.tsx` — wizard editor poster (2 step: design + export)
- `src/components/memories/QRPosterPreview.tsx` — hidden render node per html2canvas (A3 ratio)

**File da modificare:**
- `src/pages/CameraPublic.tsx` — redesign completo layout mobile
- `src/components/memories/CameraViewfinder.tsx` — frame mirino, contatore stile meccanico, shutter gold
- `src/components/memories/FilmFrame.tsx` — estetica retro con sprocket holes e header pellicola
- `src/components/memories/ShareCameraDialog.tsx` — aggiunta bottone "Crea Poster"
- `src/pages/MemoriesReel.tsx` — integrazione QRPosterEditor

**Migration SQL:**
- `ALTER TABLE disposable_cameras ADD COLUMN poster_design jsonb DEFAULT NULL`

**Nessuna nuova dipendenza** — riuso di `jsPDF`, `html2canvas`, `react-qr-code` già installati.

**Palette CSS** per la vista pubblica guest:
- Background: `#1A1A1A`
- Gold accent: `#C9A96E`
- Text primary: `#FFFFFF`
- Text secondary: `rgba(255,255,255,0.5)`

