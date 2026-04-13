

## Caselle Testo Indipendenti nell'Editor Inviti

### Situazione attuale
Tutti i blocchi testo sono impilati verticalmente e si muovono insieme come un unico gruppo (`textPosition.y`). Il font e il colore sono globali per tutti i blocchi.

### Cosa cambia
Ogni blocco testo diventa una **casella indipendente** posizionabile liberamente sul canvas, con font, colore e dimensione propri.

---

### Piano tecnico

#### 1. Estendere `TextBlock` — `PrintDesignStep.tsx`

Aggiungere proprietà per-blocco:

```
interface TextBlock {
  id: string;
  type: TextBlockType;
  label: string;
  value: string;
  style: TextBlockStyle;
  // NUOVI campi:
  x: number;        // % da sinistra (default 50)
  y: number;        // % dall'alto (default calcolato)
  fontStyle?: FontStyle;  // override font (se null usa globale)
  color?: string;         // override colore (se null usa globale)
}
```

#### 2. Drag individuale nel canvas — `PrintDesignStep.tsx`

- Ogni blocco testo diventa un `<div>` posizionato con `position: absolute; left: x%; top: y%` sul canvas
- Ogni blocco ha il suo `onPointerDown` per il drag individuale (stesso pattern del QR code drag)
- Cliccando un blocco nella preview, si seleziona → la sidebar mostra i controlli di quel blocco (font, colore, dimensione)
- Stato `selectedBlockId` per sapere quale blocco è selezionato
- Bordo tratteggiato attorno al blocco selezionato nella preview

#### 3. Sidebar: controlli per blocco selezionato

Quando un blocco è selezionato nella sidebar si mostra:
- **Font**: Select con le stesse opzioni font già esistenti (override per-blocco)
- **Colore**: Stessa palette colori già esistente (override per-blocco)  
- **Dimensione**: Select Grande/Medio/Piccolo (già esiste come `style`)
- **Testo**: Input per il contenuto
- **Bottone "Usa stile globale"**: per resettare font/colore al default

#### 4. Bottone "Aggiungi casella testo"

- Bottone prominente in cima alla sezione testi nella sidebar
- Crea un nuovo `TextBlock` di tipo `custom` con `x: 50, y: 50` (centro del canvas)
- Si seleziona automaticamente per editing immediato

#### 5. Rimuovere `textPosition` globale

- La vecchia `textPosition.y` viene eliminata (ogni blocco ha la sua `y`)
- Migrazione: i blocchi esistenti senza `x`/`y` ricevono `x: 50` e una `y` calcolata in sequenza (es. 30%, 35%, 40%...)
- Rimuovere lo slider "Posizione testo" (sostituito dal drag individuale)

#### 6. Aggiornare `HiddenPrintNode.tsx` (rendering PDF)

- Ogni blocco testo è un `<div>` posizionato con `position: absolute; left: x%; top: y%`
- Usa `fontFamily` e `color` dal blocco se specificati, altrimenti fallback ai valori globali
- Non più un unico contenitore verticale centrato

#### 7. Aggiornare `PrintInvitationEditor.tsx`

- Rimuovere `textPosition` dallo stato e dal `PrintDesignConfig`
- I blocchi portano le loro coordinate
- Aggiornare `saveDesign` / load per il nuovo schema (retrocompatibile: blocchi senza `x`/`y` ricevono default)

### File da modificare
- `src/components/print/PrintDesignStep.tsx` — drag individuale, sidebar per-blocco, bottone aggiungi
- `src/components/print/HiddenPrintNode.tsx` — rendering per-blocco posizionato
- `src/components/print/PrintInvitationEditor.tsx` — rimozione textPosition, migrazione schema

### Compatibilità
I design salvati senza `x`/`y` nei blocchi vengono migrati automaticamente al caricamento con posizioni di default sequenziali.

