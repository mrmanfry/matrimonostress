

## Piano: Centralizzazione Campagne nell'Hub Inviti

### Cosa cambia

Spostare l'intera sezione "Comunicazioni" (CampaignCard STD/RSVP, Stile Globale, Legacy RSVP Config) da `Settings.tsx` a `Invitations.tsx`, strutturando la pagina con 3 tab.

### Modifiche

**1. `src/pages/Invitations.tsx` — Ristrutturazione a Tab**

Aggiungere `Tabs` con 3 schede:

- **📊 Panoramica & Invii** (default): KPI funnel + card WhatsApp/Stampa (contenuto attuale)
- **🎨 Pagine Pubbliche**: Le 2 CampaignCard (Save the Date + RSVP) con status/stats/configura/anteprima/attiva-pausa + card Stile Globale (font, colore, countdown)
- **🖨️ Print Studio**: Chooser tra Design Integrato e Carica il tuo Design (spostato dalla tab Panoramica)

Questo richiede:
- Caricare `campaigns_config` dal wedding (via `useInvitationsData` o query diretta)
- Importare `CampaignCard`, `CampaignConfigDialog`, `RSVPConfigDialog`
- Replicare i handler `handleToggleCampaignStatus` e `handlePreviewCampaign` 
- Calcolare stats reali (sent/responded) dai dati già disponibili nel hook

**2. `src/pages/Settings.tsx` — Rimozione tab Comunicazioni**

- Rimuovere il `TabsTrigger` "Comunicazioni" e il relativo `TabsContent`
- Rimuovere import di `CampaignCard`, `CampaignConfigDialog`, `RSVPConfigDialog`
- Rimuovere state: `stdConfigDialogOpen`, `rsvpCampaignDialogOpen`, `rsvpConfigDialogOpen`
- Rimuovere handler: `handleToggleCampaignStatus`, `handlePreviewCampaign`
- Rimuovere i 3 dialog (CampaignConfigDialog x2, RSVPConfigDialog) dal JSX
- Aggiornare la griglia TabsList (da 5 a 4 colonne per co_planner, da 3 a 2 per manager/planner)

**3. `src/hooks/useInvitationsData.ts` — Espansione dati**

Aggiungere al return:
- `campaignsConfig` (dal wedding object, con fallback default)
- `weddingDate`, `partnerNames` (necessari per CampaignConfigDialog)
- `campaignStats` calcolati: per STD → count di `save_the_date_sent_at` non null e `std_response` non null; per RSVP → count di `formal_invite_sent_at` non null e rsvp_status confermato/rifiutato

### Struttura risultante delle Tab in Invitations.tsx

```text
[📊 Panoramica & Invii]  [🎨 Pagine Pubbliche]  [🖨️ Print Studio]
         |                         |                      |
   KPI Funnel              CampaignCard STD         Chooser dialog
   Card WhatsApp           CampaignCard RSVP        PrintInvitationEditor
                           Stile Globale            PrintStudio (custom)
                           Legacy RSVP Config
```

### Ordine di esecuzione

1. Espandere `useInvitationsData` con campaignsConfig + stats
2. Ristrutturare `Invitations.tsx` con Tabs e contenuto campagne
3. Pulire `Settings.tsx` rimuovendo il tab Comunicazioni

