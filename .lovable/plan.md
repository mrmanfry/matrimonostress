## Obiettivo

Trasformare l'attuale "Condividi Progresso" in **due tipi di link pubblici distinti**, con contenuti pensati per il pubblico giusto:

- **Link Ospiti** → romantico/emozionale, con countdown, info pratiche e QR foto Memories.
- **Link Fornitori** → operativo, con timeline dettagliata, contatti, indirizzi e numeri.

Manteniamo la sicurezza attuale (token lungo + scadenza, revocabile).

---

## 1. Modello dati

Aggiungiamo un campo `audience` alla tabella `progress_tokens` per distinguere i due tipi, più i nuovi toggle di visibilità richiesti da ciascun preset. Nessun breaking change: i link esistenti diventano `audience='guests'` con i toggle attuali preservati.

Nuove colonne (con default sensati):
- `audience text NOT NULL DEFAULT 'guests'` — valori: `'guests'` | `'vendors'`
- `label text` — nome opzionale del link ("Fotografo", "Famiglia Rossi"…)
- **Ospiti**: `show_location boolean`, `show_dress_code boolean`, `show_memories_qr boolean`
- **Fornitori**: `show_vendor_contacts boolean`, `show_operational_numbers boolean`, `show_addresses boolean`

`show_checklist` e `show_vendors` (progresso organizzazione) restano nel DB per retrocompatibilità ma **non vengono più esposti nella UI**: non erano interessanti per gli ospiti e non hanno senso per i fornitori.

## 2. Dialog di condivisione (Impostazioni matrimonio)

La `ShareProgressDialog` diventa un hub con **due sezioni/preset**:

```text
┌─ Condividi il tuo matrimonio ─────────────┐
│  [Ospiti]  [Fornitori]                     │  ← Tab
│                                            │
│  Link attivi (lista, con copia/apri/elim.) │
│  [+ Nuovo link Ospiti / Fornitori]         │
└────────────────────────────────────────────┘
```

Ogni preset apre un mini-form con i toggle appropriati e un campo "Etichetta". Si possono creare più link per audience (es. un link per il catering, uno per il fotografo). Copy aggiornata:

- Ospiti: *"Condividi con parenti e amici il conto alla rovescia, il programma della giornata e le informazioni pratiche."*
- Fornitori: *"Condividi con i fornitori tutti i dettagli operativi del giorno: orari, indirizzi, contatti e numeri."*

## 3. Pagina pubblica `/progress/:token`

La stessa route serve entrambi gli audience, ma cambia layout/contenuti in base a `audience`.

### 3a. Vista Ospiti (tono elegante, come oggi ma ripulita)
- **Hero** con nomi coppia + data
- **Countdown** (se attivo)
- **Programma del giorno** (timeline semplificata: solo orario + titolo + descrizione)
- **Dove** — indirizzi cerimonia/ricevimento con link Google Maps (da `weddings.ceremony_location`, `reception_location`)
- **Dress code** — testo libero (nuovo campo `weddings.dress_code` se non esiste già, altrimenti riutilizziamo)
- **QR / link Memories Reel** — se la camera è attiva per questo matrimonio, mostriamo il QR code della fotocamera condivisa così gli ospiti possono scattare
- **Rimossi**: progresso checklist, fornitori confermati (non pertinenti per gli ospiti)

### 3b. Vista Fornitori (tono operativo, denso di info)
- Header sobrio con nomi coppia + data + eventuale etichetta link
- **Timeline operativa dettagliata** — orari, titolo, descrizione, location per evento (dati già presenti in `timeline_events`)
- **Location & indirizzi** — cerimonia, ricevimento, note logistiche (parcheggi, accesso di servizio) se disponibili
- **Contatti chiave** — coppia (nome + telefono), planner/coordinatore se presente. I dati arrivano da `profiles` / `weddings`; niente dati sensibili tipo indirizzi privati.
- **Numeri operativi** — ospiti confermati, adulti/bambini, tavoli, esigenze alimentari aggregate (vegetariani, vegani, allergie principali), staff previsto. Calcolati con `buildGuestScenarios()` e i dati catering esistenti.
- **Rimossi**: countdown, checklist, elenco fornitori confermati.

## 4. Sicurezza

Nessuna modifica strutturale: token lungo generato via `crypto.randomUUID()`, scadenza 90 giorni, `is_active` toggle, revoca via "Elimina". Le RLS restano quelle attuali. La pagina pubblica continua a leggere solo campi non sensibili (nessuna email, nessun dato finanziario).

Aggiungiamo però un piccolo footer sulla vista Fornitori: *"Link riservato ai fornitori — non condividere pubblicamente"*.

## 5. Dettagli tecnici

**File toccati**:
- `supabase/migrations/<new>.sql` — aggiunge le colonne descritte in §1, con default che rendono i link esistenti equivalenti a "Ospiti come oggi".
- `src/components/settings/ShareProgressDialog.tsx` — refactor: tab Ospiti/Fornitori, lista link attivi, form per audience.
- `src/pages/ProgressPublic.tsx` — split in due sotto-componenti `GuestsView` / `VendorsView` in base a `token.audience`.
- Nuovi componenti: `src/components/progress/GuestsProgressView.tsx`, `VendorsProgressView.tsx`, `MemoriesQrBlock.tsx`.
- `src/integrations/supabase/types.ts` — rigenerato dalla migration.

**Query aggiuntive nella pagina pubblica** (tutte lato server via `supabase-js`, filtrate per `wedding_id` risolto dal token):
- `disposable_cameras` attive → per QR Memories (solo vista Ospiti)
- `guests` + `buildGuestScenarios` → per numeri operativi (solo vista Fornitori)
- `profiles` del co_planner/planner → contatti (solo vista Fornitori)
- `weddings` → indirizzi, dress code, note logistiche

**Retrocompatibilità**: link esistenti (`audience='guests'` di default) continuano a funzionare; il vecchio blocco "Progresso Checklist" e "Fornitori Confermati" viene rimosso dalla UI pubblica anche per i link vecchi (semplificazione voluta), ma le colonne restano in DB per non rompere nulla.

## 6. Cosa NON facciamo (per tenere lo scope stretto)
- Nessun PIN o password sui link (confermato: manteniamo sistema attuale).
- Nessuna analytics di apertura link.
- Nessuna notifica push ai fornitori.
- Il dress code, se manca la colonna, viene aggiunto solo se non esiste già (verifico in build mode prima di aggiungere).
