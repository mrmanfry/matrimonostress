

# Cockpit Sidebar: Cockpit link + Calendario Planner

## Richieste

1. Nella sidebar cockpit, aggiungere **"Cockpit"** sopra "Messaggi" per tornare alla pagina principale del planner.
2. Aggiungere una nuova sezione **"Calendario"** nella sidebar cockpit -- una pagina dedicata al planner con vista calendario degli eventi dei matrimoni seguiti, con card dettaglio (nomi sposi, data, location, chiesa) e sezione contatti (sposi + fornitori).

## Piano

### 1. Sidebar cockpit: aggiungere Cockpit e Calendario (`src/pages/AppLayout.tsx`)

Nella sezione `if (isPlannerMode && isOnCockpit)` (riga 190-191), espandere la navigation:

```typescript
navigation = [
  { name: "Cockpit", href: "/app/planner", icon: LayoutGrid },
  { name: "Calendario", href: "/app/planner-calendar", icon: CalendarDays },
  { name: "Messaggi", href: "/app/inbox", icon: MessageCircle, badge: unreadCount },
];
```

Aggiungere `/app/planner-calendar` ai `cockpitPaths` per mantenere il contesto cockpit nell'header.

### 2. Nuova pagina PlannerCalendarPage (`src/pages/PlannerCalendarPage.tsx`)

Pagina che mostra:

- **Calendario mensile** con gli eventi (appuntamenti fornitori) di tutti i matrimoni seguiti, color-coded per matrimonio
- **Card dettaglio matrimonio**: per ogni matrimonio una card con nomi sposi, data, location cerimonia, location ricevimento, orari
- **Sezione Contatti**: 
  - Contatti sposi (dal profilo/wedding data)
  - Contatti fornitori (da `vendors` con telefono/email)

Dati caricati via `useQuery` cross-wedding (vendor_appointments, weddings details, vendors).

### 3. Route (`src/App.tsx`)

Aggiungere:
```typescript
<Route path="planner-calendar" element={<PlannerCalendarPage />} />
```

## File da Modificare/Creare

| File | Azione |
|------|--------|
| `src/pages/AppLayout.tsx` | Aggiungere Cockpit + Calendario alla nav cockpit, aggiornare cockpitPaths |
| `src/pages/PlannerCalendarPage.tsx` | **Nuovo** -- pagina calendario planner con card matrimoni e contatti |
| `src/App.tsx` | Aggiungere route `planner-calendar` |

