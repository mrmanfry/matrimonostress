

## Piano: Sezione Catering Management (Fase 1)

### Panoramica

Nuova pagina `/app/catering` con 3 tab: **Riepilogo** (KPI + analytics), **Dettaglio Ospiti** (tabella con tavoli), **Impostazioni Diete** (configurazione opzioni per RSVP). La configurazione dietetica vive dentro la pagina Catering stessa, non nelle Settings.

### Migrazione DB

Aggiungere colonna JSONB `catering_config` alla tabella `weddings` con default:

```sql
ALTER TABLE public.weddings 
ADD COLUMN catering_config jsonb DEFAULT '{
  "dietary_options": [
    {"id": "vegetariano", "label": "Vegetariano", "enabled": true, "is_custom": false},
    {"id": "vegano", "label": "Vegano", "enabled": true, "is_custom": false},
    {"id": "celiaco", "label": "Celiaco / Senza Glutine", "enabled": true, "is_custom": false}
  ],
  "show_allergy_field": true,
  "show_dietary_notes": true
}'::jsonb;
```

### File da creare

**`src/pages/Catering.tsx`** — Pagina principale con 3 tab:
- **Riepilogo**: KPI cards (confermati, vegetariani, vegani, celiaci, con allergie, bambini, senza preferenza) + grafico a torta distribuzione diete
- **Dettaglio Ospiti**: Tabella con colonne Nome, Nucleo, Tavolo, Dieta, Allergie/Intolleranze, Note, Adulto/Bambino. Filtri per tavolo e tipo dieta. Bottoni export Excel (CSV) e PDF
- **Impostazioni**: Card con toggle per opzioni predefinite (Vegetariano, Vegano, Celiaco) + bottone "Aggiungi opzione custom" + switch per campo allergie e campo note. Pattern View/Edit. Salva su `weddings.catering_config`

**`src/components/catering/CateringKPIs.tsx`** — Cards KPI con conteggi aggregati

**`src/components/catering/CateringGuestTable.tsx`** — Tabella ospiti con JOIN a `table_assignments` + `tables` per colonna tavolo

**`src/components/catering/CateringByTable.tsx`** — Vista raggruppata per tavolo con subtotali dietetici per tavolo

**`src/components/catering/CateringDietarySettings.tsx`** — UI configurazione opzioni dietetiche (toggle standard + custom + campi liberi)

**`src/components/catering/CateringExportMenu.tsx`** — Dropdown con "Esporta CSV" e "Esporta PDF". Il CSV include foglio riepilogo aggregati (conteggi per tipo dieta, per tavolo)

### File da modificare

**`src/App.tsx`** — Aggiungere route `catering` sotto `/app`

**`src/pages/AppLayout.tsx`** — Aggiungere voce "Catering" con icona `Utensils` nella sidebar, tra "Tavoli" e "Timeline"

**`src/components/rsvp/FormalInviteView.tsx`** — Rendere le checkbox dietetiche dinamiche: leggere `catering_config` dal wedding (passato come prop) e mostrare solo le opzioni con `enabled: true`, incluse quelle custom. Mantenere backward compatibility (se `catering_config` è null, mostrare Vegetariano/Vegano come default attuale)

**`src/utils/pdfHelpers.ts`** — Estendere `generateCateringReport` per includere colonna Tavolo e sezione conteggi aggregati per tavolo

### Dati e query

La pagina Catering fa una query che unisce:
- `guests` (filtro `wedding_id`, esclusi `is_couple_member` e `is_staff`)
- `table_assignments` LEFT JOIN per ottenere `table_id`
- `tables` LEFT JOIN per ottenere `name` del tavolo

I campi dietetici letti da `guests`: `menu_choice`, `dietary_restrictions`, `rsvp_status`

### Nessun impatto su permessi/RLS

Si usano le RLS esistenti su `guests`, `tables`, `table_assignments`, `weddings`. Nessuna nuova tabella.

