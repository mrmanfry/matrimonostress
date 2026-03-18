
# Memories Reel — Piano di Implementazione (COMPLETATO ✅)

## Stato: Fase 1-6 Completate

### ✅ Fase 1: Database + Storage
- 3 tabelle create: `disposable_cameras`, `camera_photos`, `camera_participants`
- Bucket `camera-photos` (pubblico) creato
- RLS policies per planner/manager/co_planner
- Indici e trigger `updated_at`

### ✅ Fase 2: Edge Function `upload-camera-photo`
- Endpoint pubblico (verify_jwt = false)
- Validazione token, is_active, ending_date
- Hard storage limit e shots per person
- Payload limit 2MB
- Upload WebP + insert atomico + upsert participant

### ✅ Fase 3: Utilities Client
- `src/lib/cameraFilters.ts` — Canvas filters (vintage, bw, warm, classic) + compressione WebP
- `src/lib/offlinePhotoQueue.ts` — IndexedDB queue con flush sequenziale + beforeunload warning

### ✅ Fase 4: Pagina Pubblica `/camera/:token`
- `CameraPublic.tsx` — dark theme, standalone
- `InAppBrowserGuard` — detector WebView
- `CameraViewfinder` — getUserMedia + fallback input file + filtri CSS + Vibration API
- `GuestNameSheet` — bottom sheet post-primo-scatto
- `OfflineQueueBadge` — indicatore foto in attesa
- `FilmFrame` — frame estetico vintage
- Stati limite: film pieno, scatti esauriti, rullino chiuso
- CTA email notifica reveal

### ✅ Fase 5: Pagina Admin `/app/memories`
- `MemoriesReel.tsx` — dashboard con tabs
- `MemoriesKPIs` — foto, partecipanti, disponibilità, da approvare
- `MemoriesSettings` — configurazione con pattern View/Edit
- `MemoriesGallery` — galleria con logica free/locked
- `ModerationView` — approva/rifiuta rapido
- `ShareCameraDialog` — QR code + copy link + download PNG

### ✅ Fase 6: Routing + Navigazione
- Route `/app/memories` (protetta) e `/camera/:token` (pubblica) in App.tsx
- Voce "Memories" in sidebar con icona Camera, dopo "Pernotto"

### 🔮 Fase 7: Paywall (Futura)
- Edge Function `create-camera-checkout` con Stripe
- Sblocco `photos_unlocked = true`

### 🔮 Fase 8: Cron Job Cleanup (Futura)
- Eliminazione foto non sbloccate dopo 30 giorni
