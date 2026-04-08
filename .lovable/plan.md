

## Fix DOCX Export + Personalizzazione Stile Libretto

### Problema 1: DOCX non scaricabile
**Root cause**: `Packer.toBuffer()` (riga 356 di `bookletDocxExport.ts`) usa `nodebuffer` che non esiste nel browser. Fix: sostituire con `Packer.toBlob()` che funziona client-side.

### Problema 2: Personalizzazione stile
L'utente vuole controllare l'aspetto del libretto: font, colori, dimensioni testo, immagine copertina, layout copertina.

---

### Piano

#### 1. Fix DOCX — `src/lib/bookletDocxExport.ts`
- Sostituire `Packer.toBuffer(doc)` con `Packer.toBlob(doc)` (una riga)

#### 2. Aggiungere schema stile — `src/lib/massBookletSchema.ts`
Nuovo oggetto `style` dentro `massBookletContentSchema`:
```
style: {
  heading_font: 'Times New Roman' | 'Georgia' | 'Garamond' | 'Palatino',
  body_font: 'Arial' | 'Helvetica' | 'Calibri' | 'Lato',
  heading_color: string (hex, default '#1a1a1a'),
  subtitle_color: string (hex, default '#8b7355'),
  rubric_color: string (hex, default '#8b4513'),
  body_size: number (9-13, default 10.5),
  heading_size: number (12-20, default 14),
  cover_image_url: string | null,
  cover_image_height: number (default 200, px logici),
  cover_layout: 'text_only' | 'image_top' | 'image_bottom' | 'image_background',
}
```

#### 3. Nuovo step "Stile" — Stepper a 6 step
- Rinumerare: Setup (1), Rito (2), Letture (3), Canti/Preghiere (4), **Stile (5)**, Anteprima (6)
- `BookletStepper.tsx`: aggiungere icona Palette per step 5
- `MassBooklet.tsx`: aggiungere `currentStep === 5` con nuovo componente

#### 4. Nuovo componente `BookletStepStyle.tsx`
UI con:
- **Font titoli**: Select con 4 opzioni serif
- **Font corpo**: Select con 4 opzioni sans-serif
- **Colore titoli**: Input color picker (hex)
- **Colore sottotitoli/accenti**: Input color picker
- **Dimensione corpo testo**: Slider 9-13pt
- **Dimensione titoli**: Slider 12-20pt
- **Immagine copertina**: Upload file (salva come data URL base64 o in storage) con preview
- **Dimensione immagine**: Slider altezza
- **Layout copertina**: 4 opzioni radio (solo testo, immagine sopra, immagine sotto, immagine sfondo)
- Preview live mini della copertina in sidebar/card

#### 5. Aggiornare PDF — `pdfStyles.ts` + `BookletPdfDocument.tsx` + `PdfCoverPage.tsx`
- `pdfStyles.ts`: convertire da `StyleSheet.create()` statico a **funzione** `createStyles(style)` che riceve i valori di stile e genera lo stylesheet dinamico
- `PdfCoverPage.tsx`: gestire immagine copertina (`<Image>` di react-pdf) con i 4 layout possibili
- `BookletPdfDocument.tsx`: passare `style` ai componenti figli

#### 6. Aggiornare DOCX — `bookletDocxExport.ts`
- Leggere `content.style` per applicare font, colori e dimensioni dinamici
- Gestire immagine copertina nel DOCX (embed come `ImageRun`)

#### 7. Aggiornare `BookletStepPreview.tsx`
- Riceve step 6 invece di 5

### File da creare
- `src/components/mass-booklet/BookletStepStyle.tsx`

### File da modificare
- `src/lib/bookletDocxExport.ts` (fix blob + stili dinamici)
- `src/lib/massBookletSchema.ts` (schema stile)
- `src/components/mass-booklet/BookletStepper.tsx` (6 step)
- `src/pages/MassBooklet.tsx` (step 5 = stile, step 6 = preview)
- `src/components/mass-booklet/pdf/pdfStyles.ts` (funzione dinamica)
- `src/components/mass-booklet/pdf/PdfCoverPage.tsx` (immagine + layout)
- `src/components/mass-booklet/pdf/BookletPdfDocument.tsx` (passaggio stili)
- `src/components/mass-booklet/BookletStepPreview.tsx` (minor)

