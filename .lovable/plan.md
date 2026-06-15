# Motore Inviti 2.0 — Send Composer unificato

## Il problema oggi

Convivono **3 motori scollegati**:

1. **Campagne digitali** (`/app/invitations` + `RSVPCampaignDialog`, `send-wedding-invitation`) — STD e RSVP formale via WhatsApp/email, con wizard e config in `campaigns_config`.
2. **Print Studio** (`PrintStudio.tsx`) — generazione PDF cartacei, **fuori dal funnel**: nessuna traccia di "chi ha ricevuto cosa".
3. **Azioni per-invitato** sulle card nucleo/ospite — bottoni "Invia invito" che oggi fanno solo `navigate('/app/invitations?guest=...')` ignorato dalla pagina.

Risultato: non esiste *un posto solo* dove decidere "questo nucleo lo invito così" e non esiste *una vista* di "chi ha ricevuto cosa, su quale canale, a che stadio".

## La visione

Un **unico Send Composer** (drawer/dialog) che è il *solo* punto da cui parte qualsiasi invio — STD o RSVP, cartaceo o digitale, 1 nucleo o 200.

```text
        ┌───────────────────────────────────────────┐
        │            SEND COMPOSER (UNICO)          │
        │  destinatari · stadio · canale · template │
        └───────────────────────────────────────────┘
              ▲                ▲                ▲
              │                │                │
     [Campagne]          [Scheda nucleo]    [Lista invitati]
   (bulk, top-down)     (puntuale, 1 clic) (bulk-select)
```

**Le campagne** restano il modello mentale principale ("STD di luglio", "RSVP formale di settembre") ma diventano **orchestrazione**: definiscono pubblico, template, scadenza, KPI. L'**invio fisico** passa sempre dal Composer.

**Carta = cittadino di prima classe**: nel Composer il canale "Cartaceo" genera il PDF (motore Print Studio riusato) e marca `delivered_at` quando l'utente conferma la consegna. Stesso funnel del digitale.

**Scorciatoia puntuale**: da una card nucleo/ospite, "Invia invito" / "Sollecita RSVP" apre il Composer **pre-popolato su quel solo nucleo**, con lo stadio giusto auto-rilevato (STD se mai contattato, RSVP se ha già STD, Sollecito se ha RSVP senza risposta).

## Architettura

### 1. Modello dati: `invitation_deliveries`

Una **tabella eventi** sostituisce le colonne sparse (`std_sent_at`, `formal_invite_sent_at`, `save_the_date_sent_at`...). Ogni riga = un atto di invio.

Campi chiave: `party_id`, `guest_id` (nullable, se invio a referente), `stage` (`save_the_date` | `formal_rsvp` | `reminder` | `thank_you`), `channel` (`whatsapp` | `email` | `paper` | `manual`), `campaign_id` (nullable per azioni puntuali), `template_snapshot` (jsonb), `sent_at`, `delivered_at`, `opened_at`, `responded_at`, `status` (`queued` | `sent` | `delivered` | `failed` | `bounced`), `meta` (jsonb: pdf_url per cartaceo, wa_link, ecc.).

Le colonne esistenti (`std_sent_at`, `formal_invite_sent_at`) restano in `guests` come **cache derivata** (aggiornata da trigger sulla nuova tabella) → zero rottura del codice esistente.

### 2. Nuova tabella `invitation_campaigns`

Sostituisce/affianca `campaigns_config` JSONB. Una riga per campagna: `name`, `stage`, `channels` (array), `template_id`, `audience_filter` (jsonb), `deadline`, `status` (`draft`|`active`|`closed`), KPI cached.

`campaigns_config` resta letto fino a fase 3 per backward-compat.

### 3. Componente `<SendComposer>`

Un drawer unico in `src/components/invitations/SendComposer.tsx` con 4 step:

```text
1. CHI    →  pre-popolato; modificabile (bulk-select su lista)
2. COSA   →  stadio (auto-suggerito) + campagna opzionale
3. COME   →  WhatsApp / Email / Cartaceo (carta apre preview PDF)
4. INVIA  →  preview messaggio + conferma → scrive invitation_deliveries
```

Stesso componente, 3 entry point:
- **`/app/invitations`** → Composer pre-popolato con audience della campagna.
- **Scheda nucleo/ospite** → Composer pre-popolato con quel solo nucleo + stadio auto.
- **Lista Invitati** (bulk-select) → Composer pre-popolato con selezione + bottone "Crea campagna da selezione".

### 4. Timeline cronologica per nucleo

In `GuestDetailView` (e card nucleo) nuova sezione **"Storia invito"** che legge `invitation_deliveries` ordinato per data:

```text
●  10 mag  STD inviato via WhatsApp           [link]
●   2 giu  RSVP cartaceo consegnato a mano    [PDF]
●   8 giu  Risposta: Confermato (2 adulti)
○  15 giu  Sollecito menu — non ancora inviato
```

### 5. Pagina `/app/invitations` ridisegnata

Resta il centro di comando ma cambia ruolo:
- **In alto**: KPI funnel cross-canale (Save the Date / Formal / Risposto / Sollecitato), con breakdown per canale.
- **Lista campagne**: ogni card mostra audience, canali usati, % delivered, % responded. Pulsante "Invia → ..." apre Composer.
- **Attività recente**: feed unificato di `invitation_deliveries` (già esiste in forma parziale, va ricablato sulla nuova tabella).

## Rollout in 4 fasi (zero disruption produzione)

Il matrimonio in produzione **non deve accorgersi di nulla** fino alla fase 4.

### Fase 1 — Fondamenta dati (silente, backward-compat)
- Migration: crea `invitation_deliveries` + `invitation_campaigns` + trigger di backfill che sincronizza `guests.*_sent_at` e `campaigns_config`.
- Backfill: popola `invitation_deliveries` dai dati storici (`std_sent_at`, `formal_invite_sent_at`, ecc.) come righe sintetiche.
- **Nessun cambiamento UI**. Edge functions invariate.

### Fase 2 — Send Composer dietro feature flag
- Build `<SendComposer>` + entry point dalla **sola scheda nucleo** ("Invia invito" → apre Composer invece di navigate cieco).
- Flag `composerV2` in `campaigns_config` (default OFF per il matrimonio in produzione, ON in dev).
- Cartaceo: integrazione con Print Studio già esistente.
- Test end-to-end con account demo.

### Fase 3 — Migrazione campagne
- `/app/invitations`: aggiungo bottone "Apri in Composer" accanto al wizard esistente. I due flussi coesistono.
- Feed attività e timeline nucleo leggono già da `invitation_deliveries`.
- KPI funnel ricablati su nuova tabella (con fallback a query vecchia se vuota).

### Fase 4 — Switch + cleanup
- Attivato il flag, il vecchio `RSVPCampaignDialog` resta accessibile come "modalità classica" per 30 giorni.
- Dopo conferma, deprecazione: rimozione wizard vecchio, `campaigns_config` letto solo per migrazione.

## Cosa risolve concretamente

| Pain attuale | Dopo |
|---|---|
| Clic "Invia invito" su nucleo → atterro su Campagne generiche | Apre Composer pre-popolato su quel nucleo, stadio auto |
| Cartaceo invisibile nel funnel | Riga `invitation_deliveries` con `channel=paper`, conta nelle KPI |
| Non so cosa ha ricevuto un nucleo | Timeline cronologica nella scheda |
| Due posti per inviare (wizard vs azioni puntuali) con logiche diverse | Un solo motore, tre porte d'ingresso |
| STD vs RSVP confusi | Stadio esplicito + auto-rilevato + storico parlante |

## Dettagli tecnici

- **File nuovi**: `src/components/invitations/SendComposer.tsx`, `SendComposerSteps/*.tsx`, `src/hooks/useInvitationDeliveries.ts`, `src/lib/invitations/stageDetection.ts` (auto-stadio).
- **Migration SQL**: `invitation_deliveries` + `invitation_campaigns` + trigger `sync_guest_invitation_cache` che mantiene retrocompatibili le colonne legacy in `guests`.
- **Edge function**: `send-wedding-invitation` esteso per accettare `channel=paper` (no-op invio, registra solo l'evento) e per scrivere su `invitation_deliveries` oltre che aggiornare le colonne legacy.
- **Print Studio**: estratto generatore PDF in helper riusabile dal Composer.
- **Routing**: la query `?guest=...` su `/app/invitations` apre il Composer (sistema il bug attuale).
- **Backward-compat**: tutte le pagine pubbliche RSVP, edge function `rsvp-handler`, link evolutivo già implementato → **invariati**.

## Domanda di sequenza prima di partire

Confermi che vuoi che parta dalla **Fase 1 (migration + backfill silenti)** come prima azione, oppure preferisci che prima costruisca un prototipo del `<SendComposer>` con mock data per validare l'UX, e solo dopo facciamo la migration?
