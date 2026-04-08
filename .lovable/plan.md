

## Sprint 3: Motore PDF — Generatore Libretto Messa

### Obiettivo
Sostituire il placeholder nello Step 5 con un motore di rendering PDF completo basato su `@react-pdf/renderer`. L'utente potrà visualizzare un'anteprima live del libretto e scaricarlo come PDF pronto per la stampa.

### Architettura

Il PDF viene generato interamente client-side (zero costi server). Il componente `@react-pdf/renderer` riceve l'oggetto `MassBookletContent` e i dati da `liturgia.json`, e produce un documento A5 impaginato con:
- Copertina (nomi sposi, data, chiesa)
- Riti di introduzione (testi fissi)
- Liturgia della Parola (letture scelte o custom)
- Rito del Matrimonio (consenso, anelli — testi fissi con placeholder nomi)
- Liturgia Eucaristica (se selezionata)
- Preghiere dei Fedeli
- Ringraziamenti
- Pagine bianche di padding (multiplo di 4)

### File da creare

**1. `src/components/mass-booklet/pdf/BookletPdfDocument.tsx`**
- Componente `@react-pdf/renderer` principale (`<Document>`)
- Registra font Google (es. Lora per titoli, Source Sans per corpo)
- Riceve `content: MassBookletContent` + partner names
- Compone le sezioni nell'ordine liturgico corretto
- Logica padding pagine bianche (multiplo di 4)
- Stili A5 (148mm x 210mm), margini 1.5cm interni / 1cm esterni

**2. `src/components/mass-booklet/pdf/PdfCoverPage.tsx`**
- Pagina di copertina: nomi sposi, data cerimonia, nome chiesa
- Layout tipografico centrato, elegante

**3. `src/components/mass-booklet/pdf/PdfReadingSection.tsx`**
- Sezione riutilizzabile per letture: titolo, riferimento, testo
- Gestisce sia letture da `liturgia.json` che testi custom
- Logica `break` per evitare titoli orfani a fine pagina

**4. `src/components/mass-booklet/pdf/PdfFixedTexts.tsx`**
- Riti introduttivi, consenso, scambio anelli, Padre Nostro
- Sostituisce i placeholder `{{partner1}}`, `{{partner2}}`, `{{name}}`

**5. `src/components/mass-booklet/pdf/PdfPrayersSection.tsx`**
- Preghiere dei Fedeli con ritornello tra ogni intenzione
- Sezione ringraziamenti

**6. `src/components/mass-booklet/pdf/pdfStyles.ts`**
- `StyleSheet.create()` centralizzato
- Font sizes: titoli 14pt, sottotitoli 12pt, corpo 10.5pt, didascalie 9pt

### File da modificare

**`src/components/mass-booklet/BookletStepPreview.tsx`**
- Rimuovere placeholder "Sprint 3"
- Aggiungere `<PDFViewer>` per anteprima live inline (con fallback loading)
- Aggiungere pulsante "Scarica PDF" con `<BlobProvider>` per download diretto
- Mostrare contatore pagine generato

**`src/pages/MassBooklet.tsx`**
- Passare `partnerNames` (da `authState.weddings`) al componente Preview
- Nessun altro cambiamento strutturale

**`package.json`**
- Aggiungere dipendenza `@react-pdf/renderer`

### Dettagli tecnici

- **Font**: Registrati via `Font.register()` con URL Google Fonts (Lora + Source Sans 3). Supporto completo caratteri accentati italiani.
- **Formato**: A5 (148.5mm x 210mm) — standard libretti messa
- **Padding multiplo di 4**: Dopo il rendering, il componente calcola il numero di pagine e aggiunge `<Page />` vuote fino al prossimo multiplo di 4.
- **Sezioni condizionali**: La Liturgia Eucaristica appare solo se `rite_type === 'messa_eucaristia'`; i canti di comunione vengono nascosti per "Solo Liturgia della Parola".
- **Placeholder nomi**: I testi fissi di `liturgia.json` contengono `{{partner1}}`, `{{partner2}}`, `{{name}}` — sostituiti a runtime con i nomi reali degli sposi.
- **Performance**: `<PDFViewer>` renderizza in un iframe. Nessun Web Worker necessario per A5 con ~12-20 pagine.

### Ordine di esecuzione
1. Installare `@react-pdf/renderer`
2. `pdfStyles.ts` (stili condivisi)
3. Sotto-componenti PDF (Cover, Readings, FixedTexts, Prayers)
4. `BookletPdfDocument.tsx` (composizione)
5. Aggiornare `BookletStepPreview.tsx` con viewer e download
6. Aggiornare `MassBooklet.tsx` per passare i nomi sposi

