
# ✅ COMPLETATO - Enforcement dei Permessi per il Ruolo Manager

## Modifiche Effettuate

### 1. AuthContext.tsx
- Aggiunto flag `isCollaborator` (copre `planner` e `manager`) al contesto

### 2. Dashboard.tsx
- Widget finanze usa `isCollaborator` per il check `budget_visible`

### 3. Vendors.tsx
- `vendorCostsHidden` usa `isCollaborator` al posto di `isPlanner`

### 4. VendorDetails.tsx
- `vendorCostsHidden` usa `isCollaborator` al posto di `isPlanner`

### 5. BudgetLegacy.tsx
- Check accesso pagina usa `isCollaborator`

### 6. Treasury.tsx
- Check accesso pagina usa `isCollaborator`

### 7. Guests.tsx
- Aggiunta logica `maskGuestData` quando `guests_names_visible === false`
- Passato `maskSensitiveData` a `GuestSingleCard` e `GuestNucleoCard`
- Ricerca disabilitata quando dati mascherati

### 8. GuestSingleCard.tsx
- Prop `maskSensitiveData`: nome mascherato come "Invitato", alias nascosto, telefono nascosto

### 9. GuestNucleoCard.tsx
- Prop `maskSensitiveData`: nomi membri mascherati come "Membro"/"Bambino", alias e telefono nascosti

### 10. Settings.tsx
- Sezione "Contributi Finanziari" visibile solo ai `co_planner`
