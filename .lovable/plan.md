# Piano: Invito Ufficiale RSVP Immersivo

## Stato: ✅ IMPLEMENTATO (Fase 1 e 2)

### Cosa è stato completato

#### 1. Database ✅
Nuovi campi aggiunti alla tabella `weddings`:
- `ceremony_venue_name` (TEXT)
- `ceremony_venue_address` (TEXT)  
- `reception_venue_name` (TEXT)
- `reception_venue_address` (TEXT)
- `reception_start_time` (TIME)

#### 2. FormalInviteView.tsx ✅
Nuovo componente con:
- Hero full-screen immersivo con nomi sposi e data
- Sezione "La Cerimonia" con nome venue, indirizzo, orario, link Maps
- Sezione "Il Ricevimento" con nome venue, indirizzo, orario, link Maps  
- Form RSVP granulare per-membro (conferma individuale)
- Preferenze alimentari (vegetariano/vegano/allergie)
- Gestione +1 per invitati abilitati
- Stato di successo dopo invio
- Responsive mobile-first

#### 3. rsvp-handler Edge Function ✅
Aggiornata la SELECT query per includere i nuovi campi venue:
- `ceremony_venue_name`
- `ceremony_venue_address`
- `reception_venue_name`
- `reception_venue_address`
- `reception_start_time`

#### 4. RSVPPublic.tsx ✅
- Integrato FormalInviteView come render principale per RSVP (non STD)
- Passaggio di tutti i nuovi campi location al componente
- Rimossi import non utilizzati

#### 5. CampaignConfigDialog.tsx ✅
- Aggiunto tab "Location" per campagna RSVP (non per STD)
- Campi configurabili: nome chiesa, indirizzo chiesa, orario cerimonia
- Campi configurabili: nome venue ricevimento, indirizzo, orario
- Preview live con FormalInviteView reale
- Salvataggio automatico dei campi venue nel DB

---

## Prossimi Step (Fase 3 - Opzionale)

### 1. FAQ/Info Utili Configurabili
Aggiungere sezione FAQ nell'invito ufficiale:
- Array di domande/risposte configurabili
- Gestione nel CampaignConfigDialog
- Rendering in FormalInviteView

### 2. Lista Nozze
Aggiungere sezione Lista Nozze:
- Campi: IBAN, intestatario, messaggio personalizzato
- Opzione mostra/nascondi
- Pulsante copia IBAN

### 3. Link Social
- Campo Instagram handle configurabile
- Pulsante nel header dell'invito
