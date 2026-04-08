
Problema individuato: i bottoni non sono “rotti” di per sé; la generazione PDF fallisce prima di creare il file. Dai log il blocco è preciso:

```text
Failed to fetch font from https://fonts.gstatic.com/... : 404
```

Il punto critico è `src/components/mass-booklet/pdf/pdfStyles.ts`, dove `Font.register()` usa URL remoti per Lora/Source Sans 3. Almeno uno di questi URL non esiste più, quindi `@react-pdf/renderer` lancia errore e sia “Mostra anteprima” sia “Scarica PDF” non producono nulla.

Piano di fix:

1. Correggere la strategia font nel PDF
- Sostituire i font remoti in `pdfStyles.ts`.
- Approccio preferito: usare font locali/statici dentro il progetto invece di URL `fonts.gstatic.com`.
- Fallback sicuro se vogliamo sbloccare subito: usare font built-in di `@react-pdf/renderer` (`Times-Roman`, `Helvetica`, `Times-Bold`, `Times-Italic`) così il PDF non dipende dalla rete.

2. Rendere il flusso robusto in UI
- In `BookletStepPreview.tsx`, oltre a `console.error`, mostrare un toast o messaggio inline tipo “Impossibile generare il PDF. Riprova tra poco”.
- Così, se in futuro un asset manca, l’utente capisce cosa è successo.

3. Sistemare la gestione preview
- Quando si rigenera l’anteprima, revocare il precedente `previewUrl` con `URL.revokeObjectURL`.
- Aggiungere cleanup in `useEffect` su unmount per evitare leak di blob URL.

4. Verificare compatibilità tipografica
- Controllare che gli stili usino pesi/fontStyle realmente registrati.
- Esempio: se registriamo solo regular/bold/italic, evitare pesi non definiti che potrebbero causare fallback strani.

5. Test mirati dopo la modifica
- “Mostra anteprima PDF” deve aprire l’iframe con il PDF.
- “Scarica PDF” deve scaricare il file senza errori in console.
- Verificare sia con rito eucaristico sia con liturgia della parola, perché il documento cambia struttura.

File da aggiornare:
- `src/components/mass-booklet/pdf/pdfStyles.ts`
- `src/components/mass-booklet/BookletStepPreview.tsx`

Dettaglio tecnico
- Root cause: dipendenza runtime da font esterni non affidabili.
- Fix più stabile: asset locali o font built-in.
- Effetto atteso: la chiamata `await pdf(doc).toBlob()` torna correttamente un Blob, quindi sia preview che download tornano a funzionare.
