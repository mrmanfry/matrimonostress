

## Fix: Allineamento blocchi — assi X e Y invertiti

### Problema
Le funzioni di allineamento orizzontale (`alignLeft`, `alignCenterH`, `alignRight`) modificano la coordinata `x` dei blocchi — il che è corretto a livello di codice, dato che `x` controlla `left` (posizione orizzontale). Tuttavia il comportamento percepito dall'utente suggerisce che le etichette, le icone, e le aspettative sono disallineate.

L'utente vuole:
- **"Allinea a sinistra"** → tutti i blocchi si spostano al bordo sinistro (stessa `x` = `min`)
- **"Centra"** → tutti i blocchi si centrano sulla stessa verticale (stessa `x` = media o 50%)
- **"Allinea a destra"** → tutti i blocchi al bordo destro (stessa `x` = `max`)

Il codice attuale fa già questo, ma probabilmente il problema è che i blocchi partono con valori `x` simili e `y` diversi, quindi il risultato è impercettibile — oppure le icone Lucide `AlignLeft/Center/Right` (che mostrano righe di testo) confondono l'utente, che le associa a un allineamento verticale (mettere sulla stessa riga).

### Soluzione

1. **Riordinare i bottoni nella toolbar**: mettere prima gli allineamenti verticali (alto/centro/basso — che spostano su Y) e poi quelli orizzontali, con separatori e tooltip più chiari.

2. **Usare icone più intuitive**: sostituire `AlignLeft/Center/Right` (che sembrano text-align) con icone più esplicite per il posizionamento spaziale: `AlignHorizontalJustifyStart`, `AlignHorizontalJustifyCenter`, `AlignHorizontalJustifyEnd`, `AlignVerticalJustifyStart`, `AlignVerticalJustifyCenter`, `AlignVerticalJustifyEnd` (disponibili in Lucide).

3. **Aggiungere tooltip esplicativi**: es. "Allinea tutti sulla stessa X (a sinistra)" per chiarire l'asse coinvolto.

4. **Verificare che la logica funzioni**: aggiungere un log temporaneo o riesaminare il codice per assicurarsi che `onTextBlocksChange` venga effettivamente invocato e lo stato si aggiorni.

### File da modificare
- **`src/components/print/PrintDesignStep.tsx`** — icone, ordine bottoni, tooltip

