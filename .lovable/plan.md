

## Multi-selezione, Raggruppamento e Undo/Redo nell'Editor Inviti

### Cosa viene aggiunto

1. **Multi-selezione**: Click + Shift/Ctrl per selezionare più caselle testo contemporaneamente. Le caselle selezionate mostrano un bordo evidenziato.

2. **Drag di gruppo**: Quando più caselle sono selezionate, trascinandone una si muovono tutte insieme mantenendo le posizioni relative.

3. **Undo/Redo**: Ctrl+Z per annullare, Ctrl+Shift+Z (o Ctrl+Y) per ripristinare. Anche un bottone visibile nella toolbar. Funziona su tutte le modifiche: spostamenti, testo, stili, aggiunta/rimozione caselle.

---

### Piano tecnico

#### 1. Undo/Redo — `PrintInvitationEditor.tsx`

Implementare uno stack di history a livello del componente padre, dove già vivono `textBlocks`, `qrPosition`, `textColor`, ecc.

- Nuovo hook custom `useUndoRedo<T>(initialState)` che gestisce `past[]`, `present`, `future[]`
- Wrappare `textBlocks` con questo hook: ogni chiamata a `setTextBlocks` passa per `pushState()` che salva lo stato precedente nello stack
- Stack limitato a ~50 entry per non consumare troppa memoria
- Passare `canUndo`, `canRedo`, `undo()`, `redo()` come props a `PrintDesignStep`
- Listener `useEffect` su `keydown` per `Ctrl+Z` / `Ctrl+Shift+Z`

#### 2. Multi-selezione — `PrintDesignStep.tsx`

- Cambiare `selectedBlockId: string | null` → `selectedBlockIds: Set<string>`
- Click su un blocco: lo seleziona (deseleziona gli altri)
- Shift+Click o Ctrl+Click: aggiunge/toglie dalla selezione
- Click sullo sfondo: deseleziona tutto
- Sidebar: mostra controlli per-blocco solo se un singolo blocco è selezionato; se più blocchi selezionati, mostra solo azioni comuni (colore, font, dimensione — applicate a tutti)
- Bordo evidenziato su tutti i blocchi selezionati

#### 3. Drag di gruppo — `PrintDesignStep.tsx`

- Quando si inizia a trascinare un blocco che è parte della multi-selezione:
  - Calcolare l'offset `(dx, dy)` dal punto di partenza
  - Applicare lo stesso delta a tutti i blocchi selezionati
  - `blockDragRef` salva le posizioni originali di tutti i blocchi selezionati, non solo uno
- Se si trascina un blocco NON selezionato, prima deselezionare tutti e selezionare solo quello (comportamento standard)

#### 4. UI bottoni Undo/Redo — `PrintDesignStep.tsx`

- Due bottoni piccoli (icone `Undo2` e `Redo2` di Lucide) nella toolbar sopra la preview o nella sidebar
- Disabilitati quando lo stack è vuoto
- Tooltip con shortcut keyboard

### File da modificare
- `src/components/print/PrintInvitationEditor.tsx` — hook undo/redo, keydown listener, passaggio props
- `src/components/print/PrintDesignStep.tsx` — multi-selezione, drag di gruppo, bottoni undo/redo, sidebar adattiva

### File da creare
- Nessuno (logica undo/redo inline o come hook locale nel file editor)

