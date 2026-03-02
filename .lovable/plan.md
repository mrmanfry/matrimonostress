

# Ristrutturazione Permessi: Visualizza / Modifica / Crea per Area

## Nuovo Modello Permessi

Sostituire i 4 toggle attuali (`budget_visible`, `vendor_costs_visible`, `guests_names_visible`, `communications_editable`) con un modello strutturato per area, ciascuna con 3 livelli:

```text
permissions_config = {
  guests:         { view: true,  edit: false, create: false },
  budget:         { view: false, edit: false, create: false },
  vendors:        { view: true,  edit: false, create: false },
  vendor_costs:   { view: false, edit: false, create: false },
  communications: { view: false, edit: false, create: false }
}
```

Logica gerarchica: `create` implica `edit`, che implica `view`. Se `view = false`, l'intera area e nascosta.

## Compatibilita con i dati esistenti

Il codice leggera il vecchio formato e lo mappera automaticamente al nuovo:
- `budget_visible: true` diventa `budget: { view: true, edit: false, create: false }`
- `vendor_costs_visible: true` diventa `vendor_costs: { view: true, ... }`
- `guests_names_visible: false` diventa `guests: { view: false, ... }`
- `communications_editable: true` diventa `communications: { view: true, edit: true, create: true }`

## Modifiche per Area

### 1. AuthContext.tsx - Nuovo tipo PermissionsConfig

Aggiornare l'interfaccia `PermissionsConfig` per supportare il nuovo formato strutturato, con una funzione helper `normalizePermissions()` che converte vecchio formato in nuovo.

### 2. CollaboratorPermissionsCard.tsx - Nuova UI Permessi

Ristrutturare la card con sezioni per area, ciascuna con fino a 3 toggle:

```text
--- Invitati ---
[x] Visualizza (nome + iniziale cognome, nuclei, statistiche)
[ ] Modifica (editare invitati esistenti)
[ ] Crea (aggiungere nuovi invitati, importare)

--- Fornitori ---
[x] Visualizza schede (nome, telefono, stato)
[ ] Costi e Pagamenti
[ ] Modifica

--- Budget e Tesoreria ---
[ ] Visualizza

--- Comunicazioni ---
[ ] Visualizza e Gestisci campagne
```

### 3. Guests.tsx - Enforcement Vista/Modifica/Crea

Tre flag derivati dai permessi:
- `canViewGuests` - se false, pagina non accessibile
- `canEditGuests` - se false, nascondere: bottone edit nelle card, SelectionToolbar, toggle +1, dialog modifica
- `canCreateGuests` - se false, nascondere: bottone "Crea", ImportDropdown, FAB mobile, Smart Import, Contact Sync, empty state "aggiungi"

**Mascheramento nomi (quando view = true ma con dati parziali)**:
- Nome completo + iniziale cognome puntata: "Mario R."
- Telefono nascosto
- Nuclei: nome nucleo visibile, singoli membri mascherati
- Statistiche e filtri RSVP visibili

### 4. GuestSingleCard.tsx - Modalita Read-Only

- Quando `maskSensitiveData = true`: mostra "Mario R." invece di "Mario Rossi", nasconde telefono
- Nuovo prop `readOnly`: se true, nasconde bottone Edit, bottone "aggiungi a nucleo", toggle +1, checkbox selezione

### 5. GuestNucleoCard.tsx - Modalita Read-Only

- Mascheramento: singoli membri come "Mario R.", telefono nascosto
- `readOnly`: nasconde bottone Edit nucleo, toggle +1 per singoli membri, checkbox selezione

### 6. VendorDetails.tsx e Vendors.tsx - Enforcement

- `vendor_costs.view = false`: nasconde cifre (gia implementato, solo adattare al nuovo formato)
- `vendors.edit = false`: nascondere bottoni modifica fornitore
- `vendors.create = false`: nascondere bottone "Nuovo Fornitore"

### 7. Dashboard.tsx, Treasury.tsx, BudgetLegacy.tsx

Adattare i check dal vecchio formato (`budget_visible`) al nuovo (`budget.view`).

### 8. Settings.tsx

- Sezione "Contributi Finanziari": visibile solo se `budget.edit = true` o ruolo `co_planner`
- Tab "Comunicazioni": visibile solo se `communications.view = true`

## File da Modificare

| File | Modifica |
|------|----------|
| `src/contexts/AuthContext.tsx` | Nuovo tipo `PermissionsConfig` + helper `normalizePermissions()` |
| `src/components/settings/CollaboratorPermissionsCard.tsx` | Riscrivere UI con sezioni per area e 3 livelli |
| `src/pages/Guests.tsx` | Aggiungere `canEditGuests`, `canCreateGuests`, nascondere azioni |
| `src/components/guests/GuestSingleCard.tsx` | Prop `readOnly`, mascheramento "Mario R." |
| `src/components/guests/GuestNucleoCard.tsx` | Prop `readOnly`, mascheramento membri |
| `src/pages/Dashboard.tsx` | Adattare check al nuovo formato |
| `src/pages/Vendors.tsx` | Adattare check + read-only |
| `src/pages/VendorDetails.tsx` | Adattare check + read-only |
| `src/pages/Treasury.tsx` | Adattare check |
| `src/pages/BudgetLegacy.tsx` | Adattare check |
| `src/pages/Settings.tsx` | Adattare check |
| `src/pages/AppLayout.tsx` | Adattare navigazione al nuovo formato |

## Nessuna Modifica Backend

Il campo `permissions_config` e gia JSONB, quindi accetta qualsiasi struttura. La migrazione e trasparente: il codice frontend gestisce entrambi i formati.

