

# Enforcement dei Permessi per il Ruolo Manager

## Problema

Il flag `isPlanner` nel contesto auth e definito come `activeRole === 'planner'` e **non include il ruolo `manager`**. Di conseguenza, tutti i check di permesso nelle pagine (Dashboard, Fornitori, VendorDetails, Budget, Tesoreria) vengono bypassati per i manager. Inoltre mancano controlli per la visibilita dei nomi invitati e per la sezione "Contributi Finanziari" nelle impostazioni.

## Problemi Specifici da Risolvere

1. **Dashboard** - Widget finanze visibile al manager anche con `budget_visible: false`
2. **Fornitori** - Prezzi visibili al manager anche con `vendor_costs_visible: false`
3. **VendorDetails** - Costi visibili al manager
4. **Invitati** - Nomi, cognomi e telefoni visibili anche con `guests_names_visible: false`
5. **Settings > Team > Contributi Finanziari** - Manager puo modificare target e aggiungere contributor
6. **Budget e Tesoreria** - Gia nascoste dal menu laterale (AppLayout usa `isCollaborator` correttamente), ma le pagine stesse non bloccano l'accesso diretto via URL

## Soluzione

### 1. AuthContext.tsx - Aggiungere `isCollaborator`

Aggiungere un nuovo campo `isCollaborator` che copre sia `planner` che `manager`:

```text
isCollaborator = activeRole === 'planner' || activeRole === 'manager'
```

Esposto nel contesto accanto a `isPlanner` (che resta per eventuali usi specifici del solo planner).

### 2. Dashboard.tsx - Usare `isCollaborator`

Sostituire il check del widget finanze:
- Da: `isPlanner && !activePermissions?.budget_visible`
- A: `isCollaborator && !activePermissions?.budget_visible`

### 3. Vendors.tsx - Usare `isCollaborator`

Sostituire il calcolo di `vendorCostsHidden`:
- Da: `isPlanner && ...vendor_costs_visible === false`
- A: `isCollaborator && ...vendor_costs_visible === false`

### 4. VendorDetails.tsx - Usare `isCollaborator`

Stesso cambio di Vendors.tsx per `vendorCostsHidden`.

### 5. BudgetLegacy.tsx e Treasury.tsx - Usare `isCollaborator`

Sostituire `isPlanner` con `isCollaborator` nel check di accesso alla pagina.

### 6. Guests.tsx - Mascheramento dati sensibili

Quando `isCollaborator && guests_names_visible === false`:
- Nascondere nomi, cognomi e telefoni nelle card degli invitati
- Mostrare solo conteggi aggregati (adulti, bambini, confermati, ecc.)
- Passare un flag `maskNames` ai componenti `GuestSingleCard` e `GuestNucleoCard`

Nelle card:
- Nome/cognome sostituiti con "Invitato #N" o asterischi
- Telefono nascosto completamente
- Badge RSVP e conteggi rimangono visibili

### 7. Settings.tsx - Nascondere Contributi Finanziari ai Manager

La sezione "Gestione Contributi Finanziari" deve essere visibile solo ai `co_planner`. Wrappare l'intero blocco con `{isCoPlanner && (...)}`.

## File da Modificare

| File | Modifica |
|------|----------|
| `src/contexts/AuthContext.tsx` | Aggiungere `isCollaborator` al contesto |
| `src/pages/Dashboard.tsx` | `isCollaborator` nel check budget widget |
| `src/pages/Vendors.tsx` | `isCollaborator` per `vendorCostsHidden` |
| `src/pages/VendorDetails.tsx` | `isCollaborator` per `vendorCostsHidden` |
| `src/pages/BudgetLegacy.tsx` | `isCollaborator` nel check accesso |
| `src/pages/Treasury.tsx` | `isCollaborator` nel check accesso |
| `src/pages/Guests.tsx` | Aggiungere logica mascheramento nomi |
| `src/components/guests/GuestSingleCard.tsx` | Prop `maskSensitiveData` per nascondere nome/telefono |
| `src/components/guests/GuestNucleoCard.tsx` | Prop `maskSensitiveData` per nascondere nome/telefono |
| `src/pages/Settings.tsx` | Nascondere sezione Contributi Finanziari ai non-coPlanners |

## Nessuna Modifica Backend

Tutte le modifiche sono frontend. I permessi sono gia nel database (`permissions_config` su `user_roles`) e la RPC `get_user_context` li restituisce correttamente. Il problema e solo che il codice frontend non li controlla per il ruolo `manager`.

## Dettaglio Tecnico: Mascheramento Invitati

Quando `maskSensitiveData = true`:
- `GuestSingleCard`: nome visualizzato come "Invitato", cognome come iniziale puntata o nascosto, telefono rimosso
- `GuestNucleoCard`: nome nucleo visibile (es. "Famiglia Rossi"), ma i singoli membri mascherati
- Le funzionalita di export CSV e PDF vengono disabilitate o mascherate
- I filtri per nome vengono disabilitati (la ricerca testuale non avrebbe senso)

