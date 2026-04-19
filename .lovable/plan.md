

## Obiettivo

Portare il `PartyDetail` / `GuestDetail` dal designer (`inv/detail.jsx`) come **pannello sticky a destra (460px)** in `/app/guests`, sostituendo l'apertura modale all'interazione "click sulla card". Tutte le azioni cablate ai flussi reali.

## Layout pagina

**Desktop ≥1024px**: split permanente
```
┌──────────────────────────────────┬──────────────────────────────┐
│ GuestsFilterBar + Lista nuclei   │ PartyDetail / GuestDetail    │
│ (col 1fr)                        │ (col 460px, sticky top:80)   │
└──────────────────────────────────┴──────────────────────────────┘
```
**Mobile <1024px**: lista full-width, detail si apre come **Sheet bottom (90vh)**.

## Componenti nuovi (`src/components/guests/v2/detail/`)

1. **`GuestsDetailPanel.tsx`** — wrapper sticky/sheet. Mostra PartyDetail, GuestDetail o DetailEmpty in base a `{kind, id}`.
2. **`PartyDetailView.tsx`** — porta esatta del designer:
   - Header: chip "NUCLEO · N MEMBRI" + nome serif + Badge stato + close
   - **MEMBRI DEL NUCLEO**: card per membro (avatar iniziali, nome serif, status dot + menu)
   - **PERCORSO**: 5 step (Bozza creata, STD inviato, Invito formale inviato, RSVP confermato, Tavolo assegnato)
   - **STATO**: 3 tile serif (X/Y Confermati, X/Y Con telefono, N Bambini)
   - **AZIONI**: Invia invito (primary), Sollecita RSVP, Modifica nucleo, Menù nucleo, Elimina
3. **`GuestDetailView.tsx`** — porta del `GuestDetail` designer (header avatar + meta rows + percorso + stato + azioni)
4. **`DetailEmpty.tsx`** — placeholder serif "Seleziona un nucleo…"
5. **`PercorsoStepper.tsx`** — 5 step done/current/todo, riusato in entrambe le view

## Integrazione `Guests.tsx`

- Stato unificato `selected = {kind: 'party'|'guest'|null, id: string|null}`
- Layout: lista + detail in `<div className="grid lg:grid-cols-[1fr_460px] gap-5">`
- **Click sulla card** = apre il pannello detail (NON più dialog edit)
- **Icona ✏️ esistente** = continua ad aprire `GuestDialog` / `PartyDialog` per edit (rispetta view/edit pattern del project knowledge)
- Stato selezione persistito in `localStorage` (`inv_open` + `inv_openKind`) come nel designer

## Azioni cablate

| Azione | Comportamento |
|---|---|
| Invia invito (party) | Naviga `/app/invitations?party=:id` |
| Sollecita RSVP | Naviga `/app/invitations?reminder=:id&type=...` |
| Modifica nucleo/invitato | Apre `PartyDialog` / `GuestDialog` esistente |
| Menù nucleo | Naviga `/app/catering?party=:id` |
| Elimina | AlertDialog conferma → supabase delete + toast + reload |
| Click su membro nucleo | `setSelected({kind:'guest', id})` |

## Cosa NON tocco

Schema DB, RLS, edge functions, `SectionHeader`, `SelectionToolbar`, `GuestFilters`, `loadData`, RSVP campaigns, dialog di edit esistenti.

## File toccati

- **Nuovi**: `src/components/guests/v2/detail/GuestsDetailPanel.tsx`, `PartyDetailView.tsx`, `GuestDetailView.tsx`, `DetailEmpty.tsx`, `PercorsoStepper.tsx`
- **Modificati**: `src/pages/Guests.tsx` (layout split + click handler)
- **Eventuale ritocco minimo**: `GuestNucleoCard.tsx` / `GuestSingleCard.tsx` per separare `onClick` (apri detail) da `onEdit` (apri dialog), se servono prop nuove

