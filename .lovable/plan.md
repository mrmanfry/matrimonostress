## Obiettivo

Eliminare la ridondanza tra il pulsante **Configura** (dialog form legacy) e **Layout** (block editor moderno) in `CampaignCard`, sia per Save The Date che per Invito Ufficiale. Un solo punto di ingresso, nessun campo duplicato in due UI diverse.

## Diagnosi della sovrapposizione

Il pulsante **Configura** apre `CampaignConfigDialog` e modifica:
- Hero image, titolo/testo di benvenuto, FAQ, gift info → **già coperti dai blocchi** del Block Editor (hero, welcome, faq, gift)
- Scadenza (`deadline_date`), template messaggio WhatsApp, stato → **NON presenti nel Block Editor**

Il pulsante **Layout** apre `BlockEditorModal` che gestisce tutto il contenuto a blocchi della pagina pubblica (la sorgente di verità attualmente renderizzata, come confermato nel fix precedente sulle FAQ).

Risultato attuale: l'utente modifica le stesse cose (FAQ, hero, testi) in due posti, e le impostazioni "non a blocchi" (scadenza, WhatsApp) sono nascoste solo dentro "Configura".

## Soluzione

Un solo editor: il **Block Editor**, esteso con un pannello "Impostazioni campagna" per i pochi campi non-blocco. Il pulsante "Configura" sparisce.

### 1. `CampaignCard.tsx`
- Rimuovere il pulsante **Configura** (e `onConfigure` dalle props).
- Rinominare **Layout** → **Modifica** (icona invariata, `LayoutPanelLeft` o `Pencil`).
- Mantenere **Anteprima** e **Attiva/Pausa** invariati.

### 2. `BlockEditorModal.tsx`
Aggiungere un piccolo pannello/sezione "Impostazioni campagna" (tab o accordion in cima alla colonna sinistra, sopra la lista blocchi) con SOLO i campi non duplicabili come blocchi:
- **Scadenza RSVP** (`deadline_date`)
- **Messaggio WhatsApp** template (`whatsapp_message_template`)
- (Lo stato Attiva/Bozza/Pausa resta sui pulsanti della card, non si duplica qui.)

Al salvataggio del Block Editor, scrivere questi due campi nel ramo legacy `campaigns_config.{save_the_date|rsvp}` mantenendo intatti gli altri campi legacy (welcome/hero/faqs/gift) come fallback per chi non ha ancora migrato allo schema a blocchi.

### 3. `Invitations.tsx`
- Rimuovere `stdConfigDialogOpen` / `rsvpCampaignDialogOpen` e i due `<CampaignConfigDialog />` montati.
- Rimuovere `onConfigure` dalle `CampaignCard`.
- Il Block Editor diventa l'unico entry point (già wired tramite `setBlockEditorPage`).

### 4. File legacy
- `CampaignConfigDialog.tsx`: nessuna modifica funzionale, semplicemente non più referenziato dalla UI. Lo lasciamo in repo (zero rischio per produzione, può essere rimosso in una pulizia successiva).
- La logica di sync FAQ → blocchi già introdotta resta valida (non più necessaria ma innocua).

## Sicurezza in produzione

- Nessuna modifica al DB, alle RLS o agli Edge Function.
- Schema `campaigns_config` invariato: continuiamo a scrivere i campi legacy `deadline_date` e `whatsapp_message_template` esattamente come prima, solo da un punto diverso della UI.
- I link pubblici RSVP/STD attivi non cambiano comportamento.
- Rollback istantaneo: basta ripristinare il pulsante Configura nel `CampaignCard`.

## Risultato per l'utente

Un solo bottone **Modifica** per campagna. Dentro l'editor: in alto le impostazioni campagna (scadenza + WhatsApp), sotto i blocchi della pagina (hero, welcome, faq, gift, ecc.). Nessuna confusione su "dove modifico cosa".
