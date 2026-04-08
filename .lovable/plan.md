

## Piano: Riprogettazione "Progetta il tuo Invito"

### Cosa cambia

Quattro miglioramenti al design integrato degli inviti:

1. **Foto opzionale** — Switch "Inserisci una foto". Se disattivato, il foglio e bianco e il testo occupa tutta la pagina centrato.

2. **Piu font** — Aggiunta di 8 nuovi Google Fonts (Cinzel, Philosopher, Libre Baskerville, Raleway, Poppins, Merriweather, Crimson Text, Italiana), raggruppati per stile.

3. **Tutti i testi modificabili** — Ogni riga dell'invito (saluto, annuncio, prefissi "alle ore"/"presso"/"A seguire...", nomi, data, venue, indirizzi) diventa un campo editabile nella sidebar, pre-popolato dai dati del matrimonio.

4. **Indirizzo ricevimento visibile e modificabile** — L'indirizzo del ricevimento (`receptionVenueAddress`) oggi non viene mostrato ne nell'anteprima ne nel PDF. Verra aggiunto sotto il nome del ricevimento, come gia avviene per la cerimonia. Sara editabile e cancellabile come tutti gli altri testi.

### Struttura delle modifiche

**`index.html`**
- Aggiungere i nuovi Google Fonts al link esistente (Cinzel, Philosopher, Libre Baskerville, Raleway, Poppins, Merriweather, Crimson Text, Italiana).

**`src/components/print/PrintDesignStep.tsx`**

- Aggiungere i nuovi font a `FontStyle`, `FONT_MAP` e `FONT_LABELS`
- Nuova interfaccia `InvitationTexts`:
  ```
  { greeting, names, announcement, dateText, timePrefix, time,
    venuePrefix, ceremonyVenue, ceremonyAddress,
    receptionPrefix, receptionVenue, receptionAddress }
  ```
- Nuove prop: `hasPhoto`, `onHasPhotoChange`, `editableTexts`, `onEditableTextsChange`
- Sidebar: Switch "Inserisci una foto" + sezione "Testi dell'invito" con Input per ogni riga
- Anteprima: se `hasPhoto=false`, niente sezione foto, testo centrato su tutto il foglio
- Anteprima: mostrare `receptionAddress` sotto il nome del ricevimento (come gia fa `ceremonyAddress`)
- L'anteprima usa `editableTexts` invece di stringhe hardcoded

**`src/components/print/PrintInvitationEditor.tsx`**

- Nuovo stato `hasPhoto` (default `true`) e `editableTexts`
- Pre-popolare `editableTexts` dai dati wedding al caricamento (nomi, data formattata, venue, indirizzi, frasi standard)
- Persistere `hasPhoto` e `editableTexts` nel JSONB `print_design`
- Ripristinare al reload
- Passare le nuove prop a `PrintDesignStep` e `HiddenPrintNode`

**`src/components/print/HiddenPrintNode.tsx`**

- Nuove prop: `hasPhoto`, `editableTexts`
- Se `hasPhoto=false`: layout full-page centrato (niente sezione foto)
- Usare `editableTexts` per tutte le righe
- Aggiungere `receptionAddress` sotto il nome del ricevimento
- Se un testo e vuoto/cancellato, la riga non viene renderizzata

### Ordine di esecuzione

1. Font in `index.html` + aggiornare `FONT_MAP`/`FONT_LABELS`
2. Interfaccia `InvitationTexts`, prop toggle foto, campi editabili nella sidebar di `PrintDesignStep`
3. Aggiornare anteprima (layout foto/no-foto, testi dinamici, indirizzo ricevimento)
4. Aggiornare `PrintInvitationEditor` con stato e persistenza
5. Aggiornare `HiddenPrintNode` per rendering PDF con testi editabili e indirizzo ricevimento

