

## Piano: Redesign Sezione Guests — "Calm by default, loud by exception"

### Obiettivo
Trasformare `/app/guests` da pagina sovrastimolata ("rainbow UI") a interfaccia gerarchica e calma, applicando il Design System v1.0 che hai definito. Focus su riduzione del carico cognitivo per la coppia che gestisce 196 invitati.

### Strategia di approccio
Procederò in **modalità chirurgica**: non riscrivo da zero, ma sostituisco i pattern visivi rumorosi con quelli "quiet" mantenendo intatta la logica di business (filtri, selezioni, party, RSVP, campagne). Niente modifiche al database, niente refactor della logica `useInvitationsData`/`Guests.tsx`.

Il DS completo (Tailwind tokens, fonts Inter/Fraunces, dark mode, ecc.) è un'iniziativa più grande. Per **questa iterazione** mi concentro solo sulla sezione Guests con un approccio "additivo": uso classi Tailwind già disponibili in modo disciplinato, senza stravolgere `tailwind.config.ts` o `index.css` (che impatterebbero tutta l'app).

---

### Modifiche concrete

#### 1) `GuestSingleCard.tsx` — Refactor visivo
- **Stato RSVP** → da `<GuestCampaignBadges compact>` a **dot 8px** accanto al nome (verde/rosso/giallo/grigio). Tooltip on hover per il dettaglio.
- **Save the Date** → rimuovere il chip viola. Diventa testo `text-xs text-muted-foreground` sotto al nome ("Save the date inviato · 12 mar"), mostrato solo se presente.
- **Gruppo** → da `<Badge variant="outline">` a **dot 6px colorato + testo grigio** (es. `• Enel` invece di chip pieno). Colore deterministico via hash del `group_name` su 8 tonalità.
- **Alias "aka"** → integrato nel nome con virgolette: `Alberto "Albe" Rossi` invece di chip separato.
- **Badge "Coppia"/"Bambino"/"+1"** → ridotti a icone piccole inline (Heart/Baby/Plus) in `text-muted-foreground`, senza fill.
- **Telefono / conteggi** → restano come testo discreto, già abbastanza calmi.
- **Bordi card** → `border` standard + hover `shadow-sm`. Niente shadow di default.

#### 2) `GuestNucleoCard.tsx` — Stesso trattamento
- Header nucleo: nome del party + dot RSVP aggregato (verde se tutti confermati, giallo se misto, grigio se nessuna risposta).
- Strip colorata laterale (`getStatusStripColor`) → rimossa o ridotta a 2px sottile in colore desaturato.
- Lista membri: ogni guest segue lo stesso pattern di `GuestSingleCard` (dot + nome + alias inline).
- Badge "STD discrepancy" → sostituito con icona `AlertCircle` piccola + tooltip, niente background giallo.
- Campaign badges aggregati nucleo → testo prosa ("Save the date inviato a 3 su 4") invece di chip multipli.

#### 3) Nuovo componente `GuestStatusDot.tsx`
Componente riusabile:
```tsx
<GuestStatusDot status="confirmed" size="sm" tooltip="Confermato il 12 mar" />
```
- 4 stati: `confirmed` (verde), `declined` (rosso), `maybe` (giallo), `pending` (grigio)
- Colori desaturati (non i Tailwind default a piena saturazione)
- Dot circolare 8px con tooltip integrato

#### 4) Nuovo componente `GroupDot.tsx`
- Dot 6px + label
- Hash deterministico del `group_name` → indice 0-7
- Palette di 8 colori desaturati (Indigo, Rose, Teal, Amber, Cyan, Orange, Lime, Neutral)

#### 5) `Guests.tsx` (page) — Pulizia header e warning
- **Banner "Hai N nuclei pronti..."** → ridotto a single-line discreto sopra la lista, con CTA testuale ("Invia inviti") invece di card colorata.
- **Warning "44 senza telefono" / "1 non raggruppati"** → da chip gialli a **link testuali piccoli** (`text-xs text-muted-foreground`) con icona piccola, allineati orizzontalmente.
- **CTA "+ Crea"** → unico bottone primario (viola brand) della pagina. Altri bottoni (Importa, Campagne, Analisi) → `variant="ghost"` o `variant="outline"`.
- **Filtri** → invariati (già abbastanza puliti), solo verifica che usino `variant="outline"` non pieni.

#### 6) `GuestCampaignBadges.tsx` — Modalità "quiet"
Aggiungere prop `variant="quiet"` (oltre a `compact`):
- `quiet=true` → nessun background colorato, solo testo + icona piccola
- Usato dentro le card guest per ridurre rumore
- La versione "loud" resta disponibile per dashboard/analytics dove ha senso

---

### File toccati

| File | Tipo | Modifica |
|------|------|----------|
| `src/components/guests/GuestStatusDot.tsx` | **nuovo** | Componente dot RSVP riusabile |
| `src/components/guests/GroupDot.tsx` | **nuovo** | Componente dot gruppo deterministico |
| `src/components/guests/GuestSingleCard.tsx` | edit | Refactor visivo "quiet" |
| `src/components/guests/GuestNucleoCard.tsx` | edit | Refactor visivo "quiet" |
| `src/components/guests/GuestCampaignBadges.tsx` | edit | Aggiunta variante `quiet` |
| `src/pages/Guests.tsx` | edit | Pulizia header, warning testuali, CTA singolo |

**Non tocco**: logica di filtro, query Supabase, `Guests.tsx` business logic, party CRUD, RSVP campaigns, dialoghi, analytics dashboard, altre pagine app (Dashboard, Budget, ecc.).

---

### Principi applicati (dal tuo DS)
- ✅ Color encodes meaning (dot solo per stati reali)
- ✅ Un solo CTA primario visibile per vista
- ✅ Warning silenziosi se non urgenti
- ✅ Massimo 6 colori per vista
- ✅ Border 1px sottile, niente shadow di default
- ✅ Niente chip colorati ripetuti su 196 card
- ✅ Progressive disclosure (tooltip per dettagli)

---

### Cosa **NON** include questo piano
- ❌ Refactor globale `tailwind.config.ts` (impatto su tutta l'app)
- ❌ Cambio font da Lato/EB Garamond a Inter/Fraunces (richiede caricamento font + audit globale)
- ❌ Migrazione altre sezioni (Dashboard, Budget, Tables) — fuori scope
- ❌ Dark mode (già non supportato strutturalmente in app)
- ❌ Modifiche al DB o agli edge functions
- ❌ KPI/analytics di adozione (può essere uno step successivo)

Se vuoi procedere col DS completo (Sprint 1 Foundations del tuo doc) lo possiamo fare in un secondo piano dedicato dopo aver validato il pattern sulla sezione Guests.

---

### Verifica post-implementazione
1. Aprire `/app/guests` con dataset reale (Ludovica & Filippo, 196 invitati)
2. Contare colori unici visibili → target <6
3. Verificare scroll fluidity (no layout shift dovuto a dot/icone)
4. Test mobile 375px → card devono restare leggibili
5. Tooltip RSVP funzionano on hover desktop e tap mobile
6. Filtri e selezioni continuano a funzionare identici

