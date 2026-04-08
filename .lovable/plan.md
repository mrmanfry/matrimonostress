

## Fix: Impaginazione PDF + Export Word

### Problemi identificati

1. **Causa principale del taglio letture**: Tutto il contenuto (intro, letture, consenso, preghiere, eucaristia, ringraziamenti) è dentro **un singolo `<Page>`**. `@react-pdf/renderer` non fa auto-paginazione del contenuto che eccede la pagina — va tutto fuori margine.
2. **`wrap={false}` su `ReadingBlock`**: impedisce lo spezzamento delle letture lunghe, che vengono tagliate se non entrano nella pagina.
3. **Nessun export Word** per permettere personalizzazione libera.

### Piano di intervento

#### 1. Fix impaginazione PDF — `BookletPdfDocument.tsx`

Ristrutturare il documento: ogni sezione liturgica diventa un **`<View break>`** separato (non `wrap={false}`), permettendo a `@react-pdf/renderer` di spezzare automaticamente su più pagine.

Modifiche chiave:
- Wrappare tutto il contenuto (esclusa la cover) in **un unico `<Page wrap>`** — la prop `wrap` (default `true`) abilita l'auto-paginazione
- Rimuovere `wrap={false}` da `ReadingBlock` in `PdfReadingSection.tsx` — le letture lunghe devono potersi spezzare
- Aggiungere `minPresenceAhead={60}` sui titoli di sezione per evitare titoli orfani a fondo pagina (il titolo va alla pagina successiva se non c'è spazio per almeno 60pt di contenuto dopo)
- Aggiungere `break` prop su sezioni principali (`View break`) per forzare inizio pagina su: Liturgia della Parola, Rito del Matrimonio, Liturgia Eucaristica

#### 2. Fix `PdfReadingSection.tsx`

- Rimuovere `wrap={false}` da `ReadingBlock` — le letture devono potersi spezzare su più pagine
- Aggiungere `minPresenceAhead={40}` sul titolo (`subTitle`) per evitare orfani

#### 3. Fix `PdfFixedTexts.tsx`

- Stesso pattern: permettere wrap su blocchi lunghi (consenso, memoria battesimo)
- Mantenere `wrap={false}` solo su blocchi brevi (Padre Nostro, risposte singole)

#### 4. Export Word — `BookletStepPreview.tsx`

Aggiungere un bottone "Scarica Word (.docx)" che genera il libretto come documento Word editabile usando la libreria `docx` (npm).

Creare un nuovo file `src/lib/bookletDocxExport.ts`:
- Funzione `generateBookletDocx(content, partner1, partner2): Promise<Blob>`
- Usa `docx` (Document, Paragraph, TextRun, etc.)
- Formato A5, font Times New Roman per titoli e Arial per corpo
- Struttura identica al PDF: copertina, intro, letture, consenso, preghiere, eucaristia, ringraziamenti
- Sostituisce placeholder `{{partner1}}` / `{{partner2}}` come nel PDF
- L'utente riceve un `.docx` che può aprire e modificare liberamente in Word/Google Docs

Aggiornare `BookletStepPreview.tsx`:
- Aggiungere bottone "Scarica Word" accanto al bottone PDF
- Icona FileText differenziata
- Stessa logica async con loading state e toast errore

#### 5. Installazione dipendenza

- Aggiungere `docx` al `package.json` (per generazione Word client-side)

### File da modificare
- `src/components/mass-booklet/pdf/BookletPdfDocument.tsx` — ristrutturare paginazione
- `src/components/mass-booklet/pdf/PdfReadingSection.tsx` — rimuovere `wrap={false}`
- `src/components/mass-booklet/pdf/PdfFixedTexts.tsx` — permettere wrap su blocchi lunghi
- `src/components/mass-booklet/BookletStepPreview.tsx` — aggiungere bottone Word export

### File da creare
- `src/lib/bookletDocxExport.ts` — motore generazione DOCX

### Dipendenze
- `docx` (npm) — generazione Word client-side, zero server

