

## Epic 3: Print Studio — Upload Custom PDF + QR Overlay

### Cosa c'e oggi

Il Print Studio attuale (`PrintInvitationEditor.tsx`) genera inviti A5 con un design built-in (foto + testo + QR). Funziona bene, ma non permette di usare un design proprio da Canva/InDesign.

### Cosa costruiremo

Un secondo flusso nel Print Studio: "Porta il tuo design". L'utente carica un PDF o immagine, posiziona un QR code trascinandolo, e genera uno ZIP con un PDF per nucleo.

### Struttura dei cambiamenti

**1. Database + Storage**
- Migrazione: aggiungere a `weddings` le colonne `custom_pdf_template_url` (text, nullable) e `qr_overlay_config` (jsonb, nullable — `{x, y, width, color, quietZone}`)
- Creare bucket `invitation-designs` (privato) con RLS: upload/download solo per utenti autenticati con accesso al wedding
- Indice su `guests(party_id, rsvp_status)` per velocizzare il funnel

**2. UI: Scelta modalita in Invitations.tsx**
- La card "Prepara per la Stampa" apre un dialog con 2 opzioni:
  - **Design Integrato** (il wizard attuale `PrintInvitationEditor`)
  - **Carica il tuo Design** (nuovo flusso `PrintStudio`)

**3. Nuovo componente `PrintStudio.tsx`** — Dialog full-screen, 3 step:

- **Step 1 — Upload**: drag-and-drop area per PDF (max 2 pagine, 25MB), PNG, JPG. Validazione formato/dimensione con messaggi in italiano. Per PDF, rasterizza la prima pagina con `pdfjs-dist` per la preview. Warning su mobile: "Usa un computer per la massima precisione".

- **Step 2 — Posiziona QR**: Canvas split-screen (solo desktop).
  - Preview del design caricato a sinistra
  - Placeholder QR trascinabile e ridimensionabile (min 60x60px)
  - Selettore colore QR: Nero, Oro (#C9A84C), Bianco, Custom
  - Toggle quiet zone bianca (default ON)
  - Salva coordinate in `weddings.qr_overlay_config`

- **Step 3 — Genera**: 
  - Selettore nuclei (riusa `PrintAudienceStep` esistente)
  - Genera token mancanti automaticamente
  - `pdf-lib` per iniettare QR SVG nelle coordinate
  - Progress bar durante generazione
  - Output: ZIP via `jszip`, un PDF per nucleo

**4. Nuovo componente `QRCanvasEditor.tsx`**
- Canvas con immagine di sfondo (il design caricato)
- QR placeholder trascinabile (pointer events, come gia fatto in `PrintDesignStep`)
- Resize dai bordi con vincolo minimo 60px
- Anteprima QR reale con `qrcode.react`

**5. Engine di rendering `PrintGeneratorEngine.ts`**
- Funzione pura: riceve template (PDF bytes o immagine), coordinate QR, lista nuclei con token
- Usa `pdf-lib` per: caricare il PDF originale, generare QR SVG, iniettarlo nelle coordinate
- Per immagini: crea un PDF A5 con l'immagine e ci sovrappone il QR
- Genera ZIP con `jszip`, segmenta se >500MB

### Librerie nuove
- `pdf-lib` — manipolazione PDF client-side
- `pdfjs-dist` — rasterizzazione preview PDF
- Gia presenti: `jszip`, `qrcode.react` (o `qrcode` puro)

### Code splitting
- Lazy import di `pdf-lib` e `pdfjs-dist` solo quando l'utente entra nel Print Studio custom

### File da creare/modificare

```text
src/components/invitations/PrintStudio.tsx        (nuovo — dialog 3-step)
src/components/invitations/QRCanvasEditor.tsx      (nuovo — drag-drop QR)
src/lib/printGeneratorEngine.ts                    (nuovo — pdf-lib rendering)
src/pages/Invitations.tsx                          (modifica — scelta tra i 2 flussi)
supabase/migrations/XXXX_print_studio.sql          (nuovo — colonne + bucket + indice)
```

### Ordine di esecuzione
1. Migrazione DB (colonne + bucket + RLS + indice)
2. `QRCanvasEditor.tsx` — il canvas drag-drop
3. `printGeneratorEngine.ts` — il motore pdf-lib
4. `PrintStudio.tsx` — il wizard 3-step
5. Integrazione in `Invitations.tsx` — chooser tra i due flussi

