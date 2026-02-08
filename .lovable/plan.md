# Piano: Invito Ufficiale RSVP Immersivo

## Stato: ✅ IMPLEMENTATO (Fase 1)

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

---

## Prossimi Step (Fase 2)

### 1. Aggiornare CampaignConfigDialog
Aggiungere tab "Location" per la campagna RSVP con:
- Cerimonia: nome chiesa, indirizzo, orario (già esistente)
- Ricevimento: nome venue, indirizzo, orario
- Preview live del FormalInviteView

### 2. Aggiornare Settings.tsx
- Caricare e salvare i nuovi campi location

### 3. Considerazioni Future
- FAQ/Info Utili configurabili
- Lista Nozze (IBAN, ecc.)
- Link social (Instagram)
