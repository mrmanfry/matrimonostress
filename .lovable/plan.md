

## Anteprima Campagna dalle Impostazioni

### Problema attuale
Il pulsante "Anteprima" nelle card delle campagne (Save The Date e RSVP) mostra solo un toast che dice "invia un invito di test a te stesso", ma gli sposi non possono inviarsi la campagna dalla sezione Invitati. Serve un'anteprima diretta.

### Soluzione
Esiste gia una modalita "preview" nella pagina pubblica RSVP (token = "preview"), ma:
1. Non viene usata dal pulsante Anteprima in Settings
2. La `fetchPreviewData` usa il vecchio `rsvp_config` invece di `campaigns_config`
3. Non passa dati completi (venue, tema, FAQ, lista nozze, immagini)
4. Non supporta la modalita STD

### Modifiche

**1. Settings.tsx - `handlePreviewCampaign`**
Sostituire il toast con l'apertura in una nuova tab:
- Save The Date: apre `/save-the-date/preview`
- RSVP: apre `/rsvp/preview`

**2. RSVPPublic.tsx - `fetchPreviewData`**
Aggiornare per leggere da `campaigns_config` e passare tutti i dati:
- Usare `campaigns_config.rsvp` o `campaigns_config.save_the_date` in base alla modalita (`isStdMode`)
- Passare le info venue (ceremony/reception name, address, images)
- Passare il tema (`campaigns_config.theme`)
- Passare FAQ e gift info dalla config RSVP
- Supportare la modalita STD con `stdConfig` popolato

### Dettagli tecnici

```text
Settings.tsx
+----------------------------------+
| handlePreviewCampaign()          |
| STD  -> window.open(            |
|   "/save-the-date/preview")     |
| RSVP -> window.open(            |
|   "/rsvp/preview")              |
+----------------------------------+

RSVPPublic.tsx - fetchPreviewData()
+----------------------------------+
| Legge campaigns_config JSONB     |
| Popola config da rsvp/std        |
| Aggiunge wedding venue info      |
| Aggiunge theme, FAQs, gift_info |
| Demo data: Famiglia Rossi       |
+----------------------------------+
```

In questo modo il pulsante "Anteprima" apre direttamente la pagina pubblica con dati demo e la configurazione reale del matrimonio, senza bisogno di inviare inviti.

