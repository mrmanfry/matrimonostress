## Redesign Block Editor — Elevated sage workspace

Mantengo intatte tutte le funzionalità (undo/redo, drag&drop, visibility, duplicate, delete, inspector, style editor, salvataggio, impostazioni campagna, anteprima live). Cambia solo la presentazione, allineandola al prototipo scelto.

### Cosa cambia visivamente

**Container modale**
- Sfondo modale `bg-stone-200/50`, card `rounded-3xl`, ombra morbida `shadow-[0_32px_64px_-16px_rgba(0,0,0,0.15)]`, bordo `stone-200`.
- Header più compatto, azioni (Undo/Redo/Default/Annulla/Salva) restano in alto a destra ma con spacing rivisto e Salva in verde sage (`emerald-800`).

**Sidebar sinistra (Blocchi)**
- Sfondo `stone-50/50`, separatori `stone-100`.
- "Impostazioni campagna" diventa un toggle pill pulito; quando aperto, il pannello collassabile (deadline + WhatsApp template) mantiene gli stessi campi.
- "Aggiungi blocco" diventa CTA primaria sage piena (`bg-emerald-800`).
- Ogni card blocco: pill bianca con bordo sottile, drag handle a sinistra, icona+label, azioni (eye/duplicate/delete) **rivelate solo on hover** per ridurre rumore visivo.
- Stato attivo: sfondo `emerald-50` + ring `emerald-600/20`, label in `emerald-900` semibold.
- Blocchi nascosti: opacity ridotta.

**Pannello centrale (Anteprima)**
- Sfondo `stone-100`.
- Badge "Anteprima Live" in alto centro con dot verde pulsante.
- Telefono con **bezel realistico**: cornice scura `stone-800` `rounded-[3rem]`, ring esterno `stone-900`, notch in alto. L'anteprima della pagina pubblica resta identica dentro lo schermo.

**Sidebar destra (Inspector)**
- Header sezione "Proprietà Blocco" con stile uppercase tracking.
- Empty state ridisegnato: icona in tile arrotondata `stone-50`, titolo + descrizione su due righe.
- Quando un blocco è selezionato: `BlockInspector` + `BlockStyleEditor` esistenti renderizzati nello stesso slot (zero modifiche alla logica dei campi).
- **Stile Globale** spostato in un footer dedicato dentro la sidebar destra (non più barra a tutta larghezza sotto al modale): icona pill, grid 2 colonne (Font / Colore con swatch), riga Countdown con valore. Il vecchio `GlobalStyleBar` viene rimosso dal layout principale e i suoi controlli effettivi (font/colore/countdown) restano editabili — viene riusato lo stesso componente, integrato nel pannello destro.

### Cosa NON cambia (zero disruption)

- Hook `useInvitationPageEditor`, schema dati `InvitationPageSchema`, salvataggio su `weddings.campaigns_config.pages`, retro-compatibilità con campi legacy (`deadline_date`, `whatsapp_message_template`).
- Componenti figli: `BlockListEditor`, `AddBlockMenu`, `BlockInspector`, `BlockStyleEditor`, `PublicInvitationPage`. Solo il loro wrapper visivo cambia.
- Drag&drop, undo/redo, toggle visibilità, duplica, elimina: identici.

### Dettagli tecnici

File toccati:
1. **`src/components/invitations/editor/BlockEditorModal.tsx`** — refactor del layout (header, 3 colonne, phone bezel, footer Stile Globale dentro sidebar destra). Nessuna modifica alle prop o alla logica di load/save.
2. **`src/components/invitations/editor/BlockListEditor.tsx`** — restyling card blocco (pill bianca, hover-reveal azioni, stato attivo sage). Nessuna modifica all'API.
3. **`src/components/invitations/editor/GlobalStyleBar.tsx`** (se presente come componente separato) — adattato per essere renderizzato compatto nel footer dell'inspector. In alternativa, inline nel modale mantenendo le stesse callback.

Token: uso le classi Tailwind del prototipo (`stone-*`, `emerald-*`) — coerenti con la palette sage già adottata nell'app. Nessuna modifica a `index.css` o `tailwind.config.ts`.

Nessuna modifica a DB, edge functions, RLS, o alla pagina pubblica RSVP/STD.
