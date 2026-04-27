# Refactor Inviti → Sistema Block-Based

Trasformiamo le pagine pubbliche RSVP e Save The Date da template fissi a un sistema **a blocchi riordinabili e personalizzabili**, seguendo il documento allegato. Implementiamo tutte le fasi dichiarate (0 → 6) con un approccio incrementale, dietro feature flag, garantendo che **link e QR code già in produzione continuino a funzionare al 100%**.

## Garanzia di retrocompatibilità (priorità #1)

Niente di ciò che è già stampato/inviato deve rompersi:

- **URL e token invariati**: le rotte `/:coupleSlug/rsvp/:token` e `/rsvp/:token` (legacy) restano identiche. Nessun cambio in `App.tsx` o `RSVPPublic.tsx` per quanto riguarda routing/token.
- **Edge function `rsvp-handler`**: l'API pubblica (action `fetch`, `submit-rsvp`, `save-std-response`) mantiene la stessa shape di payload e response. Aggiunge solo un campo extra `pageSchema` nel response del `fetch`.
- **Lazy migration JSONB**: nessuna migration SQL. Se `weddings.campaigns_config.pages` non esiste, l'edge function calcola al volo lo schema dei blocchi a partire dal vecchio formato (titoli, immagini, FAQ, gift info già salvati). I matrimoni esistenti vedono la stessa esperienza di prima senza che noi tocchiamo il loro DB.
- **Feature flag `USE_BLOCK_BASED_RENDERING`** in `RSVPPublic.tsx`: di default `true`, ma flippabile a `false` per fallback istantaneo ai vecchi `FormalInviteView` / `SaveTheDateView` (che restano nel codice fino a regression OK su un invito reale).
- **Dati canonici (nomi sposi, data, indirizzi venue) NON duplicati nei blocchi** → letti sempre da `wedding.*`, quindi qualsiasi modifica futura ai dati del matrimonio si riflette automaticamente anche sugli inviti già condivisi.

## Cosa costruiamo

### Phase 0 — Preparazione
- Installare `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`.
- Creare le cartelle: `src/lib/invitationBlocks/`, `src/components/invitations/editor/{,inspectors/}`, `src/components/publicInvitation/{,blocks/}`.

### Phase 1 — Schema dati e tipi (no DB)
- `types.ts`: union discriminata `InvitationBlock` con 14 tipi (cover, ceremony, reception, rsvp, gift_registry, faq, rich_text, gallery, countdown, schedule, travel_info, dress_code, divider, footer) + `BlockStyleOverride` (bg/text/accent/paddingY) + `InvitationPageSchema`.
- `defaults.ts`: factory `make<Type>Block()` + `makeDefaultRsvpPage()` / `makeDefaultStdPage()` con ordine e contenuti italiani sensati.
- `validation.ts`: validatori Zod per ogni blocco.
- `migrations.ts`: `legacyRsvpToBlockSchema()` / `legacyStdToBlockSchema()` che leggono il vecchio `campaigns_config` (welcome_title, hero_image_url, ceremony/reception_image_url, faqs, gift_info, ecc.) e producono uno schema a blocchi equivalente.
- `registry.ts`: registro centrale dei blocchi (label, icon, category, inspector, renderer — questi ultimi inizialmente `null`).

### Phase 2 — Renderer pubblici (block components)
Estraiamo dai file esistenti `FormalInviteView.tsx` e `SaveTheDateView.tsx` ogni sezione in un componente `<XBlock>` (CoverBlock, CeremonyBlock, ReceptionBlock, RsvpBlock, GiftRegistryBlock, FaqBlock, FooterBlock, RichText/Gallery/Countdown/Schedule/TravelInfo/DressCode/Divider). Ogni blocco:
- Riceve `block` + dati canonici da `wedding`.
- Rispetta `block.style` (override colori/padding) e `block.visible`.
- Visual parity 1:1 con la versione attuale per i blocchi già esistenti.

Poi `BlockRenderer` (dispatcher) e `PublicInvitationPage` (itera lo schema).

### Phase 3 — Edge function aggiornata
Modifichiamo `supabase/functions/rsvp-handler/index.ts` action `fetch`:
1. Se `wedding.campaigns_config.pages.rsvp` (o `.std`) esiste → lo restituisce così com'è.
2. Altrimenti → chiama in-line la versione Deno di `legacyRsvpToBlockSchema` / `legacyStdToBlockSchema` e restituisce lo schema calcolato.
3. Risposta arricchita con `pageSchema` accanto agli altri campi esistenti (nessun campo rimosso → backward compat assoluta).

### Phase 4 — Switchover lato pubblico
In `RSVPPublic.tsx`: se `USE_BLOCK_BASED_RENDERING && data.pageSchema` → render `<PublicInvitationPage>`, altrimenti fallback a `FormalInviteView` / `SaveTheDateView`. I vecchi componenti restano nel repo finché non confermiamo la regression su un invito reale.

### Phase 5 — Editor block-based (per gli sposi)
- Hook `useInvitationPageEditor` con undo/redo (riusa il pattern di `PrintInvitationEditor`).
- `BlockListEditor` con drag&drop (`@dnd-kit/sortable`), toggle visibilità, duplicate, delete.
- `AddBlockMenu` (popover con blocchi raggruppati per category).
- Inspector per ogni tipo (`CoverInspector`, `CeremonyInspector`, ..., `GiftRegistryInspector`, `FaqInspector` con bottone "✨ Migliora" via AI esistente).
- `BlockStyleEditor` comune per override visuali.
- `BlockEditorModal` che orchestra lista + inspector + preview live (debounce 200ms).

### Phase 6 — Integrazione e cleanup parziale
- Integriamo l'editor dentro `CampaignConfigDialog` come nuova tab "Layout pagina" (i due editor coesistono: vecchi campi base + nuovo editor a blocchi).
- Rimozione **non distruttiva**: i vecchi campi nel JSON restano ma non sono più editabili dalla UI; vengono usati solo dalla lazy-migration finché non vengono sovrascritti dal nuovo schema al primo salvataggio.
- I componenti `FormalInviteView` / `SaveTheDateView` restano come fallback emergenza dietro feature flag.

## Scelte tecniche chiave

- **Storage**: tutto in `weddings.campaigns_config.pages = { rsvp: InvitationPageSchema, std: InvitationPageSchema }`. Zero migration SQL.
- **Tipi**: discriminated union su `block.type`, mai `any`. Narrowing TS garantito.
- **UI**: solo shadcn + Tailwind esistenti. Unica nuova dep: `@dnd-kit/*`.
- **AI**: il bottone "Migliora FAQ" riusa la edge function `generate-rsvp-faqs` esistente (modalità `polish`).

## Cosa NON tocchiamo (per sicurezza)
- Schema DB, RLS, token RSVP, rotte React Router, payload edge function (solo additivo).
- `weddings.created_by`, `user_roles`, logiche di permesso esistenti.
- Stile/branding del sito principale: i blocchi ereditano il `theme` dell'invito attuale.

## Strategia di rollout
1. Phase 0 → 4 in un primo gruppo di modifiche (tutta l'infrastruttura + render pubblico dietro flag).
2. Test manuale su un invito reale già in produzione → confermare visual parity.
3. Phase 5 → 6 (editor + integrazione UI sposi).
4. Solo dopo conferma definitiva, rimozione dei vecchi `FormalInviteView` / `SaveTheDateView`.

## File principali toccati/creati
- **Creati**: ~30 file fra `src/lib/invitationBlocks/*`, `src/components/publicInvitation/blocks/*`, `src/components/invitations/editor/*`, `src/hooks/useInvitationPageEditor.ts`.
- **Modificati**: `supabase/functions/rsvp-handler/index.ts` (additivo), `src/pages/RSVPPublic.tsx` (switch dietro flag), `src/components/settings/CampaignConfigDialog.tsx` (nuova tab Layout).
- **Non modificati**: `App.tsx` (routing), `FormalInviteView.tsx` / `SaveTheDateView.tsx` (restano come fallback).

Approvando questo piano procedo per fasi (0→6), tenendo sempre il vecchio rendering raggiungibile via feature flag finché non confermi che gli inviti già inviati funzionano correttamente.
