

## Piano: Refactoring Editor "Design Integrato" — 3 Capitoli

Questo è un refactoring sostanziale che tocca il motore di saluto, la tipografia, e la fedeltà WYSIWYG. Lo suddividiamo in step implementativi chiari.

---

### Capitolo 1: Motore Dinamico Saluti + AKA

**Stato attuale:** Il saluto è un campo di testo libero (`block.type === 'greeting'`), hardcodato a "Cari" nei default. La preview mostra sempre "Cari Famiglia Rossi". L'helper `printNameResolver.ts` ha già `resolveGreeting()` con logica genere/nucleo, ma non è collegato all'editor.

**Cosa faremo:**

1. **Nuovo file `src/lib/greetingEngine.ts`** — Funzione pura `generateGreetingString()` che accetta:
   - `greetingType`: `'informal' | 'formal' | 'none' | 'custom'`
   - `customGreeting`: stringa libera
   - `useAka`: boolean
   - `mockParty`: oggetto con membri (nome, aka, genere, isNucleo)
   
   Mappatura grammaticale italiana:
   - Singolo M: "Caro/Gentile [nome]"
   - Singola F: "Cara/Gentile [nome]"
   - Genere sconosciuto: "Gentile [nome]"
   - Coppia: "Cari/Gentilissimi [nome1] e [nome2]"
   - Nucleo (>2 o isNucleo): "Cari/Gentilissimi Famiglia [cognome]"
   - AKA: se attivo e valorizzato, usa AKA; fallback su nome formale

2. **Estensione `TextBlock`** — Aggiungere al blocco `greeting`:
   - `greetingType?: 'informal' | 'formal' | 'none' | 'custom'`
   - `customGreeting?: string`
   - `useAka?: boolean`

3. **UI Sidebar** — Quando il blocco selezionato è `type === 'greeting'`, mostrare:
   - Dropdown "Formula di saluto" (Informale/Formale/Nessuno/Personalizzato)
   - Input testo custom (visibile solo se "Personalizzato")
   - Switch "Usa soprannome (AKA)"
   - Micro-copy: "💡 In stampa il saluto si adatta al nucleo di ogni invitato"

4. **Preview reattiva** — Mock guest nell'anteprima; il testo si aggiorna in tempo reale usando `generateGreetingString()`.

5. **Integrazione `HiddenPrintNode.tsx`** — Il nodo di stampa usa già `greeting` come prop; aggiorneremo il flusso in `PrintInvitationEditor` per passare il greeting calcolato da `generateGreetingString()` con i dati reali del nucleo.

---

### Capitolo 2: Controlli Tipografia Avanzata

**Stato attuale:** La dimensione testo usa un enum "T-shirt sizing" (`primary/secondary/tertiary` → Grande/Medio/Piccolo). Font `Pinyon Script` manca dalla lista.

**Cosa faremo:**

1. **Aggiungere `Pinyon Script`** al CSS (`index.css` `@import`) e a `FONT_MAP` / `FONT_GROUPS` come font calligrafico.

2. **Sostituire T-shirt sizing con Slider numerico:**
   - Aggiungere `fontSize?: number` a `TextBlock` (range 8-72)
   - Nella toolbar e sidebar, sostituire il dropdown Piccolo/Medio/Grande con uno `<Slider min={8} max={72} />` + input numerico
   - Mantenere backward compatibility: se `fontSize` è undefined, usare i valori precedenti basati su `style`
   - Aggiornare `getBlockPreviewStyle()` e `getBlockStyle()` in `HiddenPrintNode` per usare `fontSize` se presente

3. **Styling granulare variabili (blocco greeting):**
   - Già supportato parzialmente via `fontOverride`/`colorOverride` per-block
   - Aggiungere nel pannello sidebar del greeting una sezione "Stile variabile ospite" con font, slider dimensione, e color picker dedicati
   - Questi stili si applicano solo allo `<span>` del nome ospite dentro il blocco greeting (non al prefisso "Caro/Cara")

---

### Capitolo 3: WYSIWYG Fidelity + Fix Stampa

**Stato attuale:** 
- Preview: i colori secondari/terziari usano `text-muted-foreground` (CSS var, grigio del tema) ma in stampa `HiddenPrintNode` usa `#888`/`#999` hardcodati — mismatch.
- QR in stampa: `HiddenPrintNode` riga 188 ha `border: '3px solid #eee'` e `borderRadius: '13px'` — questo è il bordo indesiderato.

**Cosa faremo:**

1. **Allineamento colori preview↔stampa:**
   - In `getBlockPreviewStyle()` (riga 1706+), quando `blockColor` è `#1a1a1a` (nero default), i colori secondary/tertiary devono essere `#888` e `#999` (stessi di `HiddenPrintNode`), non `text-muted-foreground`
   - Rimuovere il fallback a classi Tailwind CSS e usare sempre inline styles con gli stessi valori hex

2. **Fix QR border in stampa:**
   - In `HiddenPrintNode.tsx` riga 188: rimuovere `border: '3px solid #eee'` e `borderRadius: '13px'`
   - Aggiungere in `index.css` regole `@media print` per sicurezza:
     ```css
     @media print {
       body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
       .print-no-border { border: none !important; outline: none !important; box-shadow: none !important; }
     }
     ```

---

### File coinvolti

| File | Modifiche |
|------|-----------|
| `src/lib/greetingEngine.ts` | **Nuovo** — funzione pura generateGreetingString |
| `src/components/print/PrintDesignStep.tsx` | Estensione TextBlock, UI sidebar greeting, slider fontSize, fix colori preview |
| `src/components/print/HiddenPrintNode.tsx` | Rimozione bordo QR, supporto fontSize numerico |
| `src/components/print/PrintInvitationEditor.tsx` | Passaggio greetingType/useAka al flusso di stampa |
| `src/index.css` | Import Pinyon Script, regole @media print |
| `src/lib/printNameResolver.ts` | Nessuna modifica (già corretto, lo riusiamo internamente) |

### Rischi e mitigazioni

- **Backward compatibility fontSize:** Se `fontSize` è undefined, il rendering fallback su `style` (primary/secondary/tertiary) rimane invariato. Nessun dato esistente si rompe.
- **Greeting migration:** I vecchi design salvati con `greeting.value = "Cari"` continuano a funzionare; `greetingType` default a `'informal'` se assente.

