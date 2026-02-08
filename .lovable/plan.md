
## Piano: Implementare l'Invito Ufficiale RSVP Immersivo

### Analisi del Design Fornito

Dal codice HTML fornito, l'invito ufficiale ha questa struttura:

1. **Header/Nav**: Pulsanti RSVP e Instagram (link social)
2. **Hero Section**: Full-screen con nomi sposi + data + decorazioni floreali
3. **Sezione Cerimonia**: Location chiesa con indirizzo, orario e link Maps
4. **Sezione Ricevimento**: Location venue con indirizzo, orario e link Maps
5. **Form RSVP**: Nome, email, conferma si/no
6. **Lista Nozze**: IBAN e dettagli bonifico
7. **FAQ/Info Utili**: Domande frequenti (bambini, parcheggio, etc.)
8. **Footer**: Nomi sposi e data

### Cosa Esiste Gia

| Componente | Stato |
|------------|-------|
| `SaveTheDateView.tsx` | Funzionante (hero immersivo, temi, calendario) |
| `RSVPPublic.tsx` | Form card-based funzionante (menu, +1, allergie) |
| `rsvp-handler` edge function | Gestisce fetch/submit per STD e RSVP |
| `CampaignConfigDialog.tsx` | Configura hero, testi, tema (solo STD ha preview live) |
| Campo `ceremony_start_time` | Esiste nel DB |
| Campo `location` | Esiste nel DB (citta generica) |

### Cosa Manca nel Database

Nuovi campi da aggiungere alla tabella `weddings`:

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| `ceremony_venue_name` | TEXT | Nome chiesa/luogo cerimonia |
| `ceremony_venue_address` | TEXT | Indirizzo completo cerimonia |
| `reception_venue_name` | TEXT | Nome location ricevimento |
| `reception_venue_address` | TEXT | Indirizzo completo ricevimento |
| `reception_start_time` | TIME | Orario inizio ricevimento |

### Differenze Chiave con l'HTML Fornito

L'HTML fornito richiede che l'utente cerchi il proprio nome. Il nostro sistema e migliore perche:

- Usiamo link personalizzati con token univoco
- Sappiamo gia chi e l'ospite (nome, cognome, alias)
- Sappiamo se fa parte di un nucleo familiare
- Sappiamo se ha diritto al +1

Questo elimina il form di ricerca e permette un saluto personalizzato immediato.

### Struttura del Nuovo `FormalInviteView.tsx`

```text
+-----------------------------------------------+
|  [Nav sticky: RSVP button | Social links]     |
+-----------------------------------------------+
|                                               |
|   [HERO - 100vh con immagine sfondo]          |
|                                               |
|         Marco  e  Giulia                      |
|                                               |
|       Venerdi 26 Luglio 2025                  |
|                                               |
|         [Decorazione floreale]                |
|                                               |
+-----------------------------------------------+
|                                               |
|              LA CERIMONIA                     |
|                                               |
|    [Icona Chiesa]                             |
|    Cattedrale di Trani                        |
|    Piazza Duomo 1, Trani                      |
|    ORE 16:00                                  |
|    [Apri in Maps]                             |
|                                               |
+-----------------------------------------------+
|                                               |
|             IL RICEVIMENTO                    |
|                                               |
|    [Icona Location]                           |
|    Tenuta Montevitolo                         |
|    Via Vecchia Spinazzola Km 9,200            |
|    ORE 19:00                                  |
|    [Apri in Maps]                             |
|                                               |
+-----------------------------------------------+
|                                               |
|   RSVP - Ciao Mario! Conferma la tua presenza |
|                                               |
|   [Card per ogni membro nucleo]               |
|   - Mario Rossi     [Ci saro] [Non ci saro]   |
|     > Vegetariano/Vegano                      |
|     > Allergie                                |
|     > +1 (se abilitato): [Nome accomp.]       |
|                                               |
|   - Laura Rossi     [Ci saro] [Non ci saro]   |
|     > ...                                     |
|                                               |
|            [CONFERMA PRESENZA]                |
|                                               |
+-----------------------------------------------+
|                                               |
|           [Footer con nomi e data]            |
|                                               |
+-----------------------------------------------+
```

### Modifiche da Implementare

#### 1. Migrazione Database
Aggiungere 5 nuovi campi alla tabella `weddings`:
- `ceremony_venue_name` (TEXT)
- `ceremony_venue_address` (TEXT)
- `reception_venue_name` (TEXT)
- `reception_venue_address` (TEXT)
- `reception_start_time` (TIME)

#### 2. Nuovo Componente `FormalInviteView.tsx`
Creare componente React con:
- Hero full-screen immersivo (riusa stile SaveTheDateView)
- Sezione "La Cerimonia" con nome venue, indirizzo, orario, link Maps
- Sezione "Il Ricevimento" con nome venue, indirizzo, orario, link Maps
- Saluto personalizzato con nome ospite/nucleo
- Form RSVP granulare per-membro (riusa logica da RSVPPublic.tsx)
- Styling coerente con tema configurato (font, colori)
- Responsive mobile-first

#### 3. Aggiornare `rsvp-handler` Edge Function
- Aggiungere i nuovi campi alla SELECT query del wedding
- Includerli nella risposta API

#### 4. Aggiornare `RSVPPublic.tsx`
- Importare e usare `FormalInviteView` quando NON in STD mode
- Passare i nuovi campi location al componente

#### 5. Aggiornare `CampaignConfigDialog.tsx`
- Aggiungere tab "Location" per campagna RSVP (non STD)
- Campi: nome chiesa, indirizzo chiesa, nome venue, indirizzo venue, orario ricevimento
- Preview live del FormalInviteView (come gia fatto per STD)

### Props del Nuovo Componente

```typescript
interface FormalInviteViewProps {
  // Coppia e data
  coupleName: string;
  weddingDate: string;
  timezone?: string;
  
  // Cerimonia
  ceremonyVenueName?: string;
  ceremonyVenueAddress?: string;
  ceremonyStartTime?: string;
  
  // Ricevimento
  receptionVenueName?: string;
  receptionVenueAddress?: string;
  receptionStartTime?: string;
  
  // Ospite
  guestFirstName: string;
  guestAlias?: string | null;
  isSingleGuest: boolean;
  partyName?: string;
  members: GuestMember[];
  
  // Config visuale
  heroImageUrl?: string | null;
  welcomeTitle?: string;
  welcomeText?: string;
  theme?: Theme | null;
  
  // Stato
  isReadOnly?: boolean;
  isPreview?: boolean;
  deadlineDate?: string | null;
  
  // Callbacks
  memberData: Record<string, MemberData>;
  onMemberDataChange: (data: Record<string, MemberData>) => void;
  onSubmit: () => Promise<void>;
  submitting: boolean;
}
```

### Flusso di Configurazione per Utente

1. **Settings -> Comunicazioni -> Invito RSVP -> Configura**
2. Tab "Contenuti": hero image, titolo, messaggio, deadline
3. Tab "Location" (NUOVO):
   - Cerimonia: nome chiesa, indirizzo, orario
   - Ricevimento: nome venue, indirizzo, orario
4. Tab "Design": font, colore primario
5. Preview live con `FormalInviteView`

### Stima Implementazione

| Fase | File | Complessita |
|------|------|-------------|
| 1 | Migrazione DB (5 campi) | Bassa |
| 2 | `FormalInviteView.tsx` (~400 righe) | Alta |
| 3 | `rsvp-handler` update | Bassa |
| 4 | `RSVPPublic.tsx` update | Media |
| 5 | `CampaignConfigDialog.tsx` update | Media |

**Totale stimato**: 4-5 messaggi di implementazione
