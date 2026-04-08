

## Piano di Implementazione: Separazione Modulo Invitati → CRM + Hub Campagne

### Situazione Attuale

`Guests.tsx` (1610 righe) gestisce tutto: data entry, filtri, analytics, campagne RSVP WhatsApp, inviti cartacei. Il refactoring lo separa in due moduli distinti.

### EPIC 1: Decoupling Architetturale

**1.1 Nuova route `/app/invitations` + sidebar**
- Creare `src/pages/Invitations.tsx` come dashboard hub
- Aggiungere la route in `App.tsx` sotto `/app`
- Aggiungere voce "Campagne" nella sidebar in `AppLayout.tsx` (icona `Send`)
- Lazy load della route per code splitting

**1.2 Dashboard KPI Campagne**
- Creare `src/components/invitations/InvitationsKPIs.tsx` con funnel visuale (Da Invitare → Inviati → Confermati → Rifiutati)
- Hook dedicato `useInvitationsData.ts` che fetcha solo i campi necessari (nome, telefono, token, rsvp_status, campaign timestamps)
- Due card grandi centrali: "Invia su WhatsApp" e "Prepara per la Stampa"

**1.3 Pulizia di `Guests.tsx`**
- Rimuovere il bottone "💬 Campagna RSVP" dalla barra filtri
- Rimuovere il bottone "Inviti Cartacei" dall'header
- Rimuovere `RSVPCampaignDialog` e `PrintInvitationEditor` da Guests.tsx
- Rimuovere `FunnelKPICards` (migrato nella dashboard Campagne)
- Aggiungere banner di navigazione: "Hai N nuclei pronti — Vai alle Campagne →"
- Mantenere: data entry, filtri anagrafici, analytics composizione, selezione/raggruppamento

### EPIC 2: Hub WhatsApp (parità feature)

**2.1 Migrazione RSVPCampaignDialog**
- Spostare `RSVPCampaignDialog` come vista full-page in `/app/invitations/whatsapp` (o sub-route)
- Mantenere tutta la logica esistente (AI generation, share API, recovery)
- Aggiungere breadcrumb "Campagne → WhatsApp" per navigazione

**2.2 Sync e invalidazione cache**
- Usare React Query con `queryKey` condivisi tra moduli
- Quando si modifica un guest in `/guests`, invalidare le query usate da `/invitations`

### EPIC 3: Print Studio con Upload Custom PDF

**3.1 Storage e DB**
- Creare bucket `invitation-designs` con RLS (auth + wedding ownership)
- Aggiungere colonne a `weddings`: `custom_pdf_template_url` (text), `qr_overlay_config` (jsonb: `{x, y, width, color, quietZone}`)
- Indice su `guests(party_id, rsvp_status)` per performance dashboard

**3.2 Upload e Preview**
- Accettare PDF (max 2 pagine, max 25MB), PNG, JPG
- Rasterizzare la prima pagina del PDF con `pdfjs-dist` per preview nel canvas
- Validazione formato + dimensioni con errori chiari in italiano

**3.3 Canvas Drag & Drop per QR**
- Canvas split-screen (desktop only, warning su mobile)
- Placeholder QR trascinabile con resize (min 60x60px = ~1.5cm)
- Selettore colore QR (Nero, Oro, Bianco, Custom)
- Toggle quiet zone bianca (default ON)
- Salvataggio coordinate in `weddings.qr_overlay_config`

**3.4 Motore di Rendering Client-Side**
- `pdf-lib` per iniettare QR SVG nelle coordinate salvate
- Iterazione su tutti i nuclei con `unique_rsvp_token`
- Generazione automatica token mancanti prima del rendering
- Progress bar visibile durante generazione
- Output: ZIP (via `jszip`) con un PDF per nucleo, nominato per party_name
- Segmentazione ZIP se supera 500MB

### Struttura File Risultante

```text
src/pages/
  Guests.tsx          (CRM puro, ~900 righe)
  Invitations.tsx     (dashboard hub)

src/components/invitations/
  InvitationsKPIs.tsx
  PrintStudio.tsx
  QRCanvasEditor.tsx
  PrintGeneratorEngine.tsx

src/hooks/
  useInvitationsData.ts
```

### Ordine di Implementazione

1. Epic 1.1 + 1.2 → Creare la nuova pagina e sidebar
2. Epic 1.3 → Pulire Guests.tsx
3. Epic 2.1 + 2.2 → Migrare WhatsApp
4. Epic 3.1 → DB + Storage
5. Epic 3.2-3.4 → Print Studio

### Note Tecniche

- **Code splitting**: `React.lazy()` per `/invitations` e sub-routes print
- **Librerie nuove**: `pdf-lib`, `pdfjs-dist` (solo nel chunk print)
- **Nessuna migrazione distruttiva**: solo colonne nullable aggiunte a `weddings`
- **Mobile**: Print Studio bloccato con warning, tutto il resto mobile-first

