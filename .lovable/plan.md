

# RSVP: FAQ, Lista Nozze e Info Utili

## Confronto con il sito di riferimento

Il sito di esempio (Gennaro & Ilaria) ha queste sezioni in ordine:

| Sezione | Presente nel nostro RSVP? | Note |
|---|---|---|
| Hero con nomi coppia + data | SI | Gia implementato |
| Cerimonia (nome venue, indirizzo, orario, Maps) | SI | Gia implementato |
| Ricevimento (nome venue, indirizzo, orario, Maps) | SI | Gia implementato |
| Form RSVP (nome, email, ci saro/non ci saro) | SI | Gia implementato (+ granulare per membro) |
| Lista Nozze (messaggio, IBAN, BIC/SWIFT, banca) | NO | Da aggiungere |
| Info Utili / FAQ (accordion con domande) | NO | Da aggiungere |
| Footer con nomi e data | SI | Gia implementato |

Mancano quindi **2 blocchi**: Lista Nozze e FAQ/Info Utili.

## Piano di Implementazione

### 1. Nuovo Edge Function: `generate-rsvp-faqs`

Crea una funzione backend che usa AI per generare FAQ contestuali basate sui dati del matrimonio. Input: nomi coppia, data, venue cerimonia, venue ricevimento, orari. Output: 5-6 FAQ in italiano (es. "Dove possiamo parcheggiare?", "Il ricevimento sara all'aperto?", "Possiamo portare i bambini?").

L'utente puo poi modificare/eliminare/aggiungere le FAQ prima di salvare.

### 2. Estendere `CampaignConfigDialog` (Configura Invito)

Aggiungere un **4 tab** alla configurazione RSVP (Contenuti / Location / FAQ / Design):

**Tab "FAQ":**
- Lista di FAQ editabili (domanda + risposta per ciascuna)
- Bottone "Genera con AI" che chiama l'edge function e popola la lista
- Possibilita di aggiungere, modificare, eliminare singole FAQ
- Ordinamento drag-and-drop (opzionale, prima versione con semplice lista)

**Tab "Contenuti" - nuovi blocchi:**
- **Lista Nozze** (con toggle on/off):
  - Messaggio personalizzato (textarea)
  - IBAN (campo testo)
  - Intestatario conto (campo testo)
  - Codice BIC/SWIFT (campo testo)
  - Nome banca (campo testo)
  - Link lista nozze esterna (URL, opzionale)

### 3. Estendere `FormalInviteView` (Pagina Pubblica)

Aggiungere le nuove sezioni tra il form RSVP e il Footer, nell'ordine del sito di riferimento:

1. **Sezione Lista Nozze** (dopo il form RSVP):
   - Titolo "La Lista Nozze"
   - Messaggio personalizzato
   - Nomi coppia
   - IBAN con bottone "Copia" (copy-to-clipboard)
   - BIC/SWIFT
   - Nome banca
   - Link esterno se presente

2. **Sezione Info Utili / FAQ** (dopo Lista Nozze):
   - Titolo "Info Utili"
   - Accordion con le FAQ configurate

### 4. Estendere `rsvp-handler` (Edge Function)

Passare i nuovi campi (`faqs`, `gift_info`) dal `campaigns_config` JSONB al frontend nel response del fetch.

### 5. Collegare in `RSVPPublic.tsx`

Passare i nuovi dati come props a `FormalInviteView`.

## Struttura Dati (JSONB, nessuna migrazione DB)

Tutto viene salvato nel campo `campaigns_config` gia esistente:

```text
campaigns_config.rsvp = {
  ...campi esistenti (hero_image_url, welcome_title, etc.)...,
  faqs: [
    { question: "Possiamo portare i bambini?", answer: "Certamente, vi chiediamo..." },
    { question: "Dove possiamo parcheggiare?", answer: "In prossimita del..." }
  ],
  gift_info: {
    enabled: true,
    message: "Il regalo piu grande sara avervi con noi...",
    couple_names: "Gennaro Chiappinelli & Ilaria Picalarga",
    iban: "IT91O0366901600584297876633",
    bic_swift: "REVOITM2",
    bank_name: "Revolut Bank UAB",
    account_holder: null,
    registry_url: null
  }
}
```

## File Coinvolti

| File | Azione |
|---|---|
| `supabase/functions/generate-rsvp-faqs/index.ts` | NUOVO - Edge function AI per FAQ |
| `src/components/settings/CampaignConfigDialog.tsx` | MODIFICA - Aggiunta tab FAQ + blocco Lista Nozze in Contenuti |
| `src/components/settings/CampaignCard.tsx` | MODIFICA - Estendere interfaccia `CampaignConfig` con i nuovi campi |
| `src/components/rsvp/FormalInviteView.tsx` | MODIFICA - Nuove sezioni Lista Nozze e FAQ |
| `supabase/functions/rsvp-handler/index.ts` | MODIFICA - Passare `faqs` e `gift_info` nel response |
| `src/pages/RSVPPublic.tsx` | MODIFICA - Passare nuovi dati come props |

## Ordine di Implementazione

1. Edge function `generate-rsvp-faqs` (backend AI)
2. Estendere `CampaignCard` interface con nuovi campi
3. Estendere `CampaignConfigDialog` con tab FAQ + blocco Lista Nozze
4. Estendere `rsvp-handler` per passare i nuovi dati
5. Estendere `FormalInviteView` con sezioni Lista Nozze e FAQ
6. Collegare tutto in `RSVPPublic.tsx`

Nessuna migrazione DB necessaria. Tutto resta nel JSONB `campaigns_config`.

