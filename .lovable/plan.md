

# Nascondere Campagne quando i Dati Invitati sono Mascherati

## Logica

Se un collaboratore (planner/manager) non ha il permesso di vedere nomi e telefoni degli invitati, non ha senso che possa accedere alle campagne WhatsApp -- non saprebbe nemmeno a chi sta inviando.

## Modifiche

### 1. `src/pages/Guests.tsx`

- **Bottone "Campagna RSVP"** (riga ~1361): nasconderlo quando `maskGuestData === true`
- **SelectionToolbar** (riga ~1426): nascondere il bottone "Invia RSVP" passando `hasContactsToSend={false}` quando `maskGuestData` e attivo, oppure non renderizzare proprio la toolbar
- **Recovery della campagna** (riga ~157): non riaprire automaticamente il dialog di campagna se i dati sono mascherati

### 2. `src/pages/Settings.tsx`

- **Tab "Comunicazioni"** (riga ~706): aggiungere il check `guests_names_visible !== false` alla condizione di visibilita. Se il collaboratore non vede i nomi, non puo nemmeno configurare le campagne

La condizione attuale:
```text
isCoPlanner || communications_editable !== false
```

Diventa:
```text
isCoPlanner || (communications_editable !== false && guests_names_visible !== false)
```

## File da Modificare

| File | Modifica |
|------|----------|
| `src/pages/Guests.tsx` | Nascondere bottone campagna e disabilitare recovery quando `maskGuestData` |
| `src/pages/Settings.tsx` | Bloccare tab Comunicazioni se `guests_names_visible === false` |

## Impatto

Solo frontend, nessuna modifica al database. Le campagne restano attive per chi ha i permessi corretti.

