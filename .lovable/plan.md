

## Sprint 2: Wizard UI — Generatore Libretto Messa

### Obiettivo
Creare la pagina `/app/mass-booklet` con un wizard a 5 step, routing, voce nella sidebar, auto-save a Supabase, e navigazione libera tra gli step.

### File da creare

**1. `src/pages/MassBooklet.tsx`** — Pagina principale
- Carica/crea il record `mass_booklets` da Supabase (upsert al primo accesso)
- Stato locale: `content: MassBookletContent`, `currentStep`, `templateStyle`, `status`, `saving`
- Auto-save debounced (3s) su ogni modifica di `content`
- Save esplicito al cambio step ("Avanti"/"Indietro")
- Pulsante "Salva ed esci" sempre visibile nell'header
- Indicatore "Salvato" stile Google Docs
- Pre-popola `church_name`, `ceremony_date_text` dai dati del matrimonio se il booklet è nuovo
- Renderizza il componente dello step corrente

**2. `src/components/mass-booklet/BookletStepSetup.tsx`** — Step 1
- Campi: nome chiesa, nome celebrante, data cerimonia (testo libero)
- Ruoli: testimoni sposo/sposa (array dinamico +/−), lettori (array), musicisti
- Layout singola colonna, max-w-2xl centrato

**3. `src/components/mass-booklet/BookletStepRite.tsx`** — Step 2
- Scelta radio: "Messa con Eucaristia" / "Solo Liturgia della Parola"
- Descrizione breve per ogni opzione
- Card selezionabili con icona

**4. `src/components/mass-booklet/BookletStepReadings.tsx`** — Step 3
- 4 sezioni Accordion: Prima Lettura, Salmo, Seconda Lettura, Vangelo
- Ogni sezione: Select con opzioni da `liturgia.json` + anteprima testo in sola lettura
- Toggle "Usa testo personalizzato" → mostra Textarea al posto del Select
- Seconda Lettura opzionale (badge "Opzionale")

**5. `src/components/mass-booklet/BookletStepCustom.tsx`** — Step 4
- Sezione Canti: input per ingresso, offertorio, comunione, comunione 2, uscita, gloria, santo, pace, frazione
- Sezione Preghiere dei Fedeli: campo ritornello + array dinamico di intenzioni (max 6, max 300 char ciascuna, contatore visibile)
- Sezione Ringraziamenti: textarea (max 2000 char)

**6. `src/components/mass-booklet/BookletStepPreview.tsx`** — Step 5
- Riepilogo completezza con `validateBookletCompleteness()` — campi mancanti linkabili allo step corretto
- Anteprima placeholder (messaggio "L'anteprima PDF sarà disponibile nello Sprint 3")
- Checkbox disclaimer obbligatorio
- Pulsante "Genera PDF" disabilitato (Sprint 3)

**7. `src/components/mass-booklet/BookletStepper.tsx`** — Progress bar + navigazione
- Barra 5 step con icone e label
- Step cliccabili per navigazione libera
- Indicazione step completati/corrente

### File da modificare

**`src/App.tsx`**
- Import `MassBooklet` page
- Aggiungere route `<Route path="mass-booklet" element={<MassBooklet />} />`

**`src/pages/AppLayout.tsx`**
- Aggiungere voce "Libretto Messa" nella sidebar con icona `BookOpen` (da lucide-react), posizionata dopo "Memories" e prima di "Timeline"

### Dettagli tecnici

- **Auto-save**: `useCallback` + `setTimeout` da 3s, cancellato ad ogni nuova modifica. Al cambio step si salva immediatamente (abort del debounce pendente).
- **Supabase interaction**: `supabase.from('mass_booklets').upsert(...)` con `wedding_id` come chiave. Il campo `content` è JSONB, si salva l'intero oggetto `MassBookletContent`.
- **Liturgia data**: import statico di `liturgia.json`, nessuna chiamata di rete.
- **Sanitizzazione**: `sanitizeBookletText()` applicata ai campi testo libero prima del salvataggio.
- **Navigazione libera**: nessuna validazione bloccante sugli step 1-4. Solo lo Step 5 mostra i campi mancanti.

### Ordine di esecuzione
1. `BookletStepper` (componente UI riusabile)
2. Step 1-4 (i 4 form component)
3. Step 5 (preview/validazione)
4. `MassBooklet.tsx` (pagina con logica auto-save)
5. Routing + sidebar

