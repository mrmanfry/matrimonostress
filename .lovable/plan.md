

# Piano: Feature "Inviti Cartacei" - Editor Visivo con Wizard 3 Step e Generazione PDF

## Panoramica

Implementare un editor visivo completo per creare inviti cartacei personalizzati con QR code univoci per ogni nucleo familiare. L'editor sarà un wizard a 3 step: Design, Selezione Destinatari, Generazione PDF.

## Architettura dei Componenti

```text
Guests.tsx
  └─ PrintInvitationEditor (Dialog fullscreen)
       ├─ Step 1: PrintDesignStep (sidebar + anteprima)
       ├─ Step 2: PrintAudienceStep (tabella selezione nuclei)
       └─ Step 3: PrintGenerationStep (progress + download)
```

Nuovi file:
- `src/components/print/PrintInvitationEditor.tsx` — Wizard container + stepper
- `src/components/print/PrintDesignStep.tsx` — Sidebar controlli + anteprima foglio
- `src/components/print/PrintAudienceStep.tsx` — Tabella selezione nuclei con filtri
- `src/components/print/PrintGenerationStep.tsx` — Progress bar + success state
- `src/components/print/HiddenPrintNode.tsx` — Div invisibile per rendering PDF
- `src/lib/printNameResolver.ts` — Utility per generare displayName dei nuclei

Nuova dipendenza: `html2canvas` (jspdf e qrcode.react sono gia installati).

## Entry Point

Aggiungere nella toolbar della pagina Guests.tsx (accanto a "Sincronizza Contatti"), un bottone `<Printer />` "Inviti Cartacei" che apre il `PrintInvitationEditor` in un Dialog fullscreen.

Stato da aggiungere in Guests.tsx:
- `const [printEditorOpen, setPrintEditorOpen] = useState(false)`

## Step 1 — Design (PrintDesignStep)

Layout split: sidebar sinistra 30% + anteprima destra 70%.

**Sidebar (controlli):**
- Upload immagine sfondo → `URL.createObjectURL` per preview locale
- Textarea "Testo di Benvenuto"
- Select font: Elegante (Cormorant), Moderno (sans-serif), Romantico (cursive)
- Switch "Mostra Safe Zone"

**Anteprima (foglio A5):**
- Container con `aspect-[1/1.414]`, max-w-[400px], shadow-xl, bg-white
- Background-image dall'upload, object-cover
- Overlay gradiente semitrasparente per leggibilità testo
- Testo di benvenuto in alto/centro con font selezionato
- Footer fisso in basso: box bianco semitrasparente con:
  - "Gentilissima Famiglia Rossi" (mock)
  - Placeholder QR code grigio
  - "nozze.it/rsvp/token123" (mock)
- Se Safe Zone attiva: bordo tratteggiato rosso inset 16px

Tutto reattivo in tempo reale via state React.

## Step 2 — Selezione Audience (PrintAudienceStep)

Fetch dati da Supabase: `invite_parties` con guests annidati (stessa query usata in Guests.tsx).

**Interface locale:**
```typescript
interface PartyPrintTarget {
  partyId: string;
  displayName: string;
  guestCount: number;
  syncToken: string; // unique_rsvp_token del primo guest del party
  rsvpStatus: 'pending' | 'confirmed' | 'declined';
}
```

**Logica displayName** (`printNameResolver.ts`):
1. Party con nome custom → usa `party_name`
2. Party senza nome → concatena first_name dei membri ("Mario e Giulia")
3. Guest singolo (senza party) → "Nome Cognome"

**UI:**
- Tabs filtro: "Tutti i Nuclei" / "Solo In Attesa"
- Tabella shadcn con colonne: Checkbox, Nome Invito (bold), Membri, Stato RSVP (Badge), Link QR (icona + token troncato)
- Checkbox "Seleziona Tutti" nell'header
- Footer: "Selezionati X inviti (Y ospiti)" + bottone "Conferma e Genera" (disabled se 0 selezionati)

**Token QR:** Usa il `unique_rsvp_token` del primo guest adulto del party. Se nessun guest ha token, mostra warning.

## Step 3 — Generazione PDF (PrintGenerationStep)

**Componente HiddenPrintNode:** div `position: fixed, top: -9999px` che replica il layout del foglio A5 ma con dati dinamici:
- `displayName` del party corrente
- `<QRCodeSVG value={https://wedsapp.it/rsvp/${syncToken}} size={100} />` con sfondo bianco forzato
- Shortlink: `wedsapp.it/rsvp/${token.substring(0, 8)}`

**Loop chunked asincrono:**
```
for each selectedParty:
  1. setState(currentParty) → React re-renders HiddenPrintNode
  2. await setTimeout(150ms) → breathing per UI
  3. html2canvas(printNode, { scale: 2, useCORS: true })
  4. pdf.addImage → pagina A5 (148x210mm)
  5. update progress bar
pdf.save('Inviti_Cartacei_Nozze.pdf')
```

**UI Loading:** Progress bar shadcn, testo "Generazione invito: [Nome] (X di Y)... Non chiudere questa finestra."

**UI Success:** Checkmark verde, "Inviti Pronti!", bottone "Chiudi".

**Error handling:** try/catch con toast destructive, fallback a Step 2.

**Prevenzione chiusura:** `onInteractOutside` bloccato durante step 3.

**Cleanup on close:** reset di tutti gli state (step, progress, selections, immagine).

## Riepilogo Task

1. Installare `html2canvas`
2. Creare `printNameResolver.ts`
3. Creare `HiddenPrintNode.tsx`
4. Creare `PrintDesignStep.tsx` (sidebar + anteprima)
5. Creare `PrintAudienceStep.tsx` (tabella selezione)
6. Creare `PrintGenerationStep.tsx` (progress + success)
7. Creare `PrintInvitationEditor.tsx` (wizard container)
8. Integrare in `Guests.tsx` con Dialog + bottone entry point

