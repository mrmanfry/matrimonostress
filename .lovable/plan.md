

## Piano: Overlay Dinamico — Casella Saluto + QR su Design Esterno

### Cosa cambia

Il flusso "Carica il tuo Design" (PrintStudio) attualmente gestisce solo il posizionamento del QR Code. Lo estendiamo per posizionare anche una **Casella Saluto** draggable/resizable sullo stesso canvas, con controlli dedicati nella sidebar.

---

### Architettura

Il `QRCanvasEditor` diventa un **OverlayCanvasEditor** che gestisce due oggetti:
- **Oggetto A**: QR Code (già implementato)
- **Oggetto B**: Casella Saluto (nuovo)

Entrambi sono draggable e resizable. La sidebar diventa contestuale: mostra i controlli dell'oggetto selezionato.

```text
┌──────────────────────────────────────────────┐
│  Sidebar (contextual)  │   Canvas Preview    │
│                        │                     │
│  [QR] [Saluto] tabs    │   ┌─────────────┐   │
│                        │   │  Background  │   │
│  — Se "Saluto":        │   │    Image     │   │
│    • Formula dropdown  │   │             │   │
│    • AKA toggle        │   │  [QR]  [Hi] │   │
│    • Font selector     │   │             │   │
│    • Font size slider  │   └─────────────┘   │
│    • Color picker      │                     │
│    • Stress test btns  │                     │
└──────────────────────────────────────────────┘
```

---

### Dettagli implementativi

**1. Estendere `QROverlayConfig` con greeting overlay**

Aggiungere un nuovo tipo `GreetingOverlayConfig`:
```ts
interface GreetingOverlayConfig {
  x: number;        // % da sinistra
  y: number;        // % dall'alto
  width: number;    // % larghezza canvas
  fontStyle: FontStyle;
  fontSize: number;  // 8-72
  color: string;
  greetingType: GreetingType;
  customGreeting?: string;
  useAka: boolean;
}
```

**2. Refactoring `QRCanvasEditor.tsx`**

- Aggiungere un secondo elemento draggable/resizable per il saluto
- Sidebar con due tab/sezioni: "QR Code" e "Saluto"
- Sezione Saluto contestuale con:
  - Dropdown Formula (Informale/Formale/Nessuno/Personalizzato) — riusa `GreetingType` da `greetingEngine.ts`
  - Toggle AKA
  - Font selector (riusa `FONT_MAP`/`FONT_GROUPS` da `PrintDesignStep`)
  - Slider fontSize (8-72)
  - Color picker
  - Alert info: "💡 In stampa il saluto si adatta al nucleo di ogni invitato"
  - 3 bottoni "Simula Anteprima": Singolo / Coppia / Nucleo — aggiornano il testo nella casella usando `generateGreetingString()`

**3. Aggiornare `PrintStudio.tsx`**

- Aggiungere stato `greetingConfig` con default
- Persistere `greeting_overlay_config` su Supabase (nel campo `qr_overlay_config` esteso, o come campo separato)
- Passare `greetingConfig` al canvas editor

**4. Aggiornare `printGeneratorEngine.ts`**

- Accettare `GreetingOverlayConfig` come parametro opzionale
- Per ogni party, calcolare il saluto con `generateGreetingString()` usando i dati reali del party
- Disegnare il testo sul PDF alle coordinate indicate, con il font, dimensione e colore scelti

**5. Persistenza DB**

Il campo `qr_overlay_config` JSONB sulla tabella `weddings` viene esteso per includere anche `greeting_overlay`. Nessuna migrazione necessaria — è JSONB opzionale.

---

### File coinvolti

| File | Modifiche |
|------|-----------|
| `src/components/invitations/QRCanvasEditor.tsx` | Aggiunta secondo oggetto draggable + sidebar contestuale con tab QR/Saluto |
| `src/components/invitations/PrintStudio.tsx` | Stato `greetingConfig`, persistenza, passaggio al canvas |
| `src/lib/printGeneratorEngine.ts` | Rendering testo saluto nel PDF con font embedding |
| `src/lib/greetingEngine.ts` | Nessuna modifica — riusato as-is |

### Mock per stress test

```ts
const STRESS_MOCKS = {
  single: { isNucleo: false, members: [{ name: 'Marco', lastName: 'Rossi', gender: 'M' as const }] },
  couple: { isNucleo: false, members: [{ name: 'Marco', lastName: 'Rossi', gender: 'M' }, { name: 'Giulia', lastName: 'Rossi', gender: 'F' }] },
  nucleus: { isNucleo: true, nucleusName: 'Rossi', members: [{ name: 'Marco', lastName: 'Rossi', gender: 'M' }, { name: 'Giulia', lastName: 'Rossi', gender: 'F' }, { name: 'Luca', lastName: 'Rossi', gender: 'M' }] },
};
```

### Rischi

- **Font embedding in PDF**: `pdf-lib` supporta l'embedding di font custom. Per i Google Fonts, scaricheremo il `.ttf` a runtime via fetch e lo embedderemo nel PDF. Per Better Saturday, useremo il `.woff2` locale convertito.
- **Backward compatibility**: Se `greeting_overlay` è assente nel config salvato, la casella saluto non viene mostrata (opt-in). L'utente la aggiunge cliccando "Aggiungi saluto".

