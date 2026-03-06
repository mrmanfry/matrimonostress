

# Piano: Ridisegno Layout Invito Cartaceo (Foglio Pieghevole)

## Cosa cambia

L'invito attuale e un foglio singolo con sfondo + testo sovrapposto. Il nuovo layout e un **foglio da piegare a meta**: la meta superiore mostra la foto (con bordi acquarellati/sfumati), la meta inferiore contiene il testo formale con i dettagli del matrimonio presi dalle impostazioni.

## Nuovo Layout del "Foglio" (Preview + HiddenPrintNode)

```text
┌──────────────────────────┐
│                          │
│   FOTO (con bordi        │
│   sfumati/acquarellati)  │
│                          │
│                          │
├─ ─ ─ ─ piega ─ ─ ─ ─ ─ ┤
│                          │
│   Cari Famiglia Rossi    │
│                          │
│   Anna Rossi e           │
│   Marco Bianchi          │
│   sono lieti di          │
│   annunciare il loro     │
│   matrimonio             │
│                          │
│   Sabato 15 giugno 2026  │
│   alle ore 16:00         │
│   presso                 │
│   Chiesa di San Pietro   │
│   Roma                   │
│                          │
│   A seguire presso       │
│   Villa Aurelia          │
│                          │
│   [QR]  link             │
│                          │
└──────────────────────────┘
```

## Dati dal DB (weddings table)

I seguenti campi vengono passati al componente:
- `partner1_name`, `partner2_name` — nomi degli sposi
- `wedding_date` — data formattata in italiano
- `ceremony_start_time` — ora cerimonia
- `ceremony_venue_name`, `ceremony_venue_address` — luogo cerimonia
- `reception_venue_name`, `reception_venue_address` — luogo ricevimento
- `reception_start_time` — ora ricevimento

**Logica location singola (matrimonio civile):** Se `reception_venue_name` e vuoto/null, mostra solo la cerimonia senza il blocco "A seguire". Se `ceremony_venue_name` e vuoto ma c'e `reception_venue_name`, mostra solo quello.

## Modifiche ai Componenti

### 1. `PrintInvitationEditor.tsx`
- Fetch dei dati wedding (`partner1_name`, `partner2_name`, `wedding_date`, `ceremony_start_time`, `ceremony_venue_name`, `ceremony_venue_address`, `reception_venue_name`, `reception_venue_address`, `reception_start_time`) all'apertura del dialog
- Passare questi dati a `PrintDesignStep` e `HiddenPrintNode`

### 2. `PrintDesignStep.tsx` — Ridisegno completo
**Sidebar:**
- Upload immagine (invariato ma label "Foto dell'invito")
- Rimuovere la Textarea "Testo di Benvenuto" (il testo ora e strutturato e viene dai dati wedding)
- Font selector con **molte piu scelte** (8-10 opzioni):
  - `garamond` — EB Garamond (Classico Elegante)
  - `cormorant` — Cormorant Garamond (Raffinato)
  - `playfair` — Playfair Display (Editoriale)
  - `lora` — Lora (Caldo)
  - `dancing` — Dancing Script (Romantico)
  - `greatvibes` — Great Vibes (Calligrafico)
  - `alex` — Alex Brush (Firma)
  - `lato` — Lato (Moderno Pulito)
  - `montserrat` — Montserrat (Contemporaneo)
  - `josefin` — Josefin Sans (Minimalista)
- Toggle Safe Zone (invariato)

**Preview:** Il foglio ora mostra:
- Meta superiore: foto con bordi sfumati (CSS mask/gradient fade sui bordi, effetto acquarello)
- Linea di piega tratteggiata leggera al centro
- Meta inferiore: testo formale mockato con dati wedding reali (o placeholder se non caricati)

### 3. `HiddenPrintNode.tsx` — Ridisegno completo
Stessa struttura del preview ma con dati dinamici:
- Meta superiore: foto con bordi sfumati
- Meta inferiore:
  - "Cari [displayName]"
  - "[Partner1] e [Partner2]"
  - "sono lieti di annunciare il loro matrimonio"
  - Data formattata + ora
  - Venue cerimonia
  - (condizionale) "A seguire festeggeremo insieme presso [reception_venue]"
  - QR code + shortlink in basso

### 4. Nuovi Google Fonts da aggiungere in `index.css`
Playfair Display, Lora, Great Vibes, Alex Brush, Montserrat, Josefin Sans

### 5. `PrintDesignStep` props aggiornate
Aggiungere: `partner1Name`, `partner2Name`, `weddingDate`, `ceremonyTime`, `ceremonyVenueName`, `ceremonyVenueAddress`, `receptionVenueName`, `receptionVenueAddress`, `receptionTime`
Rimuovere: `welcomeText`, `onWelcomeTextChange`

### 6. `HiddenPrintNode` props aggiornate
Aggiungere stessi campi wedding + rimuovere `welcomeText`

## Effetto bordi acquarellati sulla foto

Usare CSS `mask-image` con gradient radiale per sfumare i bordi della foto:
```css
mask-image: radial-gradient(ellipse 85% 80% at center, black 60%, transparent 100%);
```
Oppure gradient lineare sui 4 lati per un fade piu morbido. Questo da l'effetto "acquarellato" senza manipolare l'immagine.

## File modificati
1. `src/index.css` — nuovi font imports
2. `src/components/print/PrintDesignStep.tsx` — ridisegno completo
3. `src/components/print/HiddenPrintNode.tsx` — ridisegno completo
4. `src/components/print/PrintInvitationEditor.tsx` — fetch dati wedding, passaggio props

## File invariati
- `PrintAudienceStep.tsx`, `PrintGenerationStep.tsx`, `printNameResolver.ts` — nessuna modifica

