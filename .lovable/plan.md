

## Piano: Campi personalizzati nell'invito

### Problema
I testi dell'invito sono fissi (saluto, nomi, annuncio, data, ora, cerimonia, ricevimento). L'utente non può aggiungere righe extra né riordinarle — ad esempio inserire "Dress code: abito lungo" tra il luogo e l'indirizzo del ricevimento.

### Soluzione
Trasformare `InvitationTexts` da un oggetto a chiavi fisse a un **array ordinato di blocchi**, dove ogni blocco ha un tipo (predefinito o custom) e un valore. L'utente può:
- Aggiungere campi personalizzati con un bottone "+" tra qualsiasi riga
- Riordinare i campi tramite drag (icona grip) o frecce su/giù
- Eliminare i campi custom (quelli predefiniti si svuotano ma restano)

### Struttura dati

```typescript
// Ogni riga dell'invito diventa un "blocco"
interface TextBlock {
  id: string;           // uuid stabile per key/drag
  type: 'greeting' | 'names' | 'announcement' | 'dateText' | 'timePrefix_time' 
      | 'venuePrefix' | 'ceremonyVenue' | 'ceremonyAddress'
      | 'receptionPrefix' | 'receptionVenue' | 'receptionAddress'
      | 'custom';
  label: string;        // etichetta sidebar ("Saluto", "Nomi", o custom)
  value: string;        // testo mostrato
  style: 'primary' | 'secondary' | 'tertiary'; // dimensione/colore nell'invito
}
```

L'ordine dell'array è l'ordine di rendering. I campi predefiniti vengono inizializzati nell'ordine attuale; i custom si inseriscono dove l'utente clicca "+".

### Retrocompatibilità
Al caricamento, se `print_design.editableTexts` è il vecchio oggetto piatto (`InvitationTexts`), viene convertito automaticamente nell'array di `TextBlock[]`. Nessuna migrazione DB necessaria.

### File modificati

**`src/components/print/PrintDesignStep.tsx`**
- Sostituire `InvitationTexts` con `TextBlock[]` (esportato come tipo)
- Sidebar: renderizzare i blocchi in ordine con Input per ciascuno, bottone grip per drag, bottone "×" per custom, bottoni "+" tra ogni riga per inserire un campo personalizzato
- Per i campi custom: input per label + input per valore + select per stile (primario/secondario/terziario)
- `renderTextContent` legge dall'array ordinato e applica lo stile corretto per tipo/style
- Funzione `migrateTextsToBlocks(old: InvitationTexts): TextBlock[]` per retrocompatibilità

**`src/components/print/PrintInvitationEditor.tsx`**
- Stato `textBlocks: TextBlock[]` al posto di `editableTexts: InvitationTexts`
- Pre-popola i blocchi predefiniti dai dati wedding
- Persiste `textBlocks` nel JSONB `print_design`
- Al caricamento: se trova il vecchio formato, chiama `migrateTextsToBlocks`
- Passa `textBlocks` a `PrintDesignStep` e `HiddenPrintNode`

**`src/components/print/HiddenPrintNode.tsx`**
- Prop `textBlocks: TextBlock[]` al posto di `editableTexts`
- Il `textBlock` JSX itera sull'array e renderizza ogni blocco con lo stile appropriato (fontSize, fontWeight, color basati su `style`)

### Ordine di esecuzione
1. Definire `TextBlock`, funzione migrazione, aggiornare `PrintDesignStep` (sidebar + preview)
2. Aggiornare `PrintInvitationEditor` (stato, persistenza, pre-popolamento)
3. Aggiornare `HiddenPrintNode` (rendering PDF da array)

