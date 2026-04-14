

## Formati Carta, Raggruppamento e Allineamento nell'Editor Inviti

### 1. Scelta formato carta

Attualmente il formato e fisso A5 (aspect ratio 1:1.414, HiddenPrintNode usa 1748x2480px).

Aggiungere un selettore formato nella sidebar di `PrintDesignStep` e propagare le dimensioni a `HiddenPrintNode`:

| Formato | Dimensioni mm | Pixel (300dpi) | Aspect ratio |
|---------|--------------|----------------|--------------|
| A5 | 148x210 | 1748x2480 | 1:1.414 |
| 11x17 cm | 110x170 | 1299x2008 | 1:1.545 |
| A6 | 105x148 | 1240x1748 | 1:1.410 |
| Quadrato | 148x148 | 1748x1748 | 1:1 |

- Nuovo campo `format` in `PrintDesignConfig` e nello stato di `PrintInvitationEditor`
- Nuovo tipo `PaperFormat` con le opzioni sopra
- La preview cambia `aspectRatio` in base al formato
- `HiddenPrintNode` riceve `W` e `H` come props (non piu costanti hardcoded)
- Default: A5 (retrocompatibile)

### 2. Raggruppamento blocchi (Group/Ungroup)

Aggiungere un concetto di "gruppo" persistente che lega piu blocchi:

- Nuovo campo opzionale `groupId?: string` su `TextBlock`
- Quando l'utente seleziona 2+ blocchi e preme "Raggruppa": tutti ricevono lo stesso `groupId`
- Quando si clicca un blocco con `groupId`, automaticamente si selezionano tutti i blocchi dello stesso gruppo
- Quando si trascina un blocco con gruppo, si muovono tutti i blocchi del gruppo
- Bottone "Separa" (Ungroup): rimuove il `groupId` dai blocchi selezionati
- I bottoni Raggruppa/Separa appaiono nel pannello multi-selezione (gia esistente, righe 882-938)

### 3. Allineamento e distribuzione

Quando 2+ blocchi sono selezionati, mostrare una toolbar con 6 azioni:

- **Allinea a sinistra**: tutti i blocchi prendono il `min(x)` della selezione
- **Centra orizzontalmente**: tutti i blocchi prendono la media di `x`
- **Allinea a destra**: tutti prendono il `max(x)`
- **Allinea in alto**: tutti prendono il `min(y)`
- **Centra verticalmente**: tutti prendono la media di `y`
- **Allinea in basso**: tutti prendono il `max(y)`
- **Distribuisci orizzontalmente**: i blocchi vengono distribuiti equamente tra `min(x)` e `max(x)`
- **Distribuisci verticalmente**: i blocchi vengono distribuiti equamente tra `min(y)` e `max(y)`

Icone: `AlignLeft`, `AlignCenter`, `AlignRight`, `AlignStartVertical`, `AlignCenterVertical`, `AlignEndVertical` da Lucide. Per distribuzione: icone custom o `Rows3`/`Columns3`.

UI: riga di bottoni compatti nel pannello multi-selezione, sopra i controlli font/colore/dimensione.

---

### File da modificare

- **`src/components/print/PrintDesignStep.tsx`**
  - Aggiungere `groupId` a `TextBlock`
  - Selettore formato carta nella sidebar
  - Logica gruppo: auto-seleziona blocchi dello stesso gruppo al click
  - Bottoni Raggruppa/Separa nel pannello multi-selezione
  - Toolbar allineamento/distribuzione (8 bottoni) nel pannello multi-selezione
  - Prop `aspectRatio` dal formato scelto nella preview

- **`src/components/print/PrintInvitationEditor.tsx`**
  - Nuovo stato `paperFormat` + salvataggio/caricamento in `PrintDesignConfig`
  - Passare formato a `PrintDesignStep` e `HiddenPrintNode`

- **`src/components/print/HiddenPrintNode.tsx`**
  - Ricevere `width`/`height` come props invece di costanti `W`/`H`

