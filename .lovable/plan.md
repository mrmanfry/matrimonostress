

# Memories Reel — Piano di Implementazione Completo

Questo è un feature molto grande che richiede implementazione in blocchi progressivi. Ecco il piano dettagliato.

## Fase 1: Database + Storage

### Migration SQL
Creazione di 3 tabelle e 1 bucket storage:

- **`disposable_cameras`**: configurazione rullino per matrimonio (token, ending_date, reveal_mode, reveal_at, shots_per_person, free_reveal_limit=100, hard_storage_limit=500, film_type, is_active, require_approval, photos_unlocked)
- **`camera_photos`**: foto scattate (camera_id FK, file_path, guest_name, guest_fingerprint, film_type_applied, is_approved DEFAULT true, created_at)
- **`camera_participants`**: tracking ospiti (camera_id FK, guest_name, guest_fingerprint UNIQUE per camera, shots_taken, notify_email)
- **Bucket `camera-photos`**: pubblico, per servire le immagini nella galleria
- **RLS**: tabelle accessibili da co_planner/planner/manager via `has_wedding_role`. Bucket: lettura pubblica, scrittura via service role.

## Fase 2: Edge Function `upload-camera-photo`

Endpoint pubblico (`verify_jwt = false`) che:
1. Valida token → trova `disposable_camera`
2. Verifica `is_active` e `ending_date`
3. Controlla `hard_storage_limit` (max foto totali)
4. Controlla `shots_per_person` per fingerprint
5. Rifiuta payload > 2MB
6. Upload blob WebP nel bucket
7. Insert `camera_photos`, upsert `camera_participants`, incremento atomico `shots_taken`
8. Ritorna `{ success, shots_remaining }`

## Fase 3: Utilities Client

- **`src/lib/cameraFilters.ts`**: funzioni Canvas per applicare filtri (vintage, bw, warm, classic) e compressione WebP (0.75 quality, max 1920px). Funziona sia con stream webcam che con file da `<input>`.
- **`src/lib/offlinePhotoQueue.ts`**: coda IndexedDB per foto offline, flush sequenziale su `online` event, `beforeunload` warning, gestione `ending_date` scaduta.

## Fase 4: Pagina Pubblica `/camera/:token`

`src/pages/CameraPublic.tsx` — pagina standalone dark theme, NO autenticazione:
- **InAppBrowserGuard**: rileva WebView e mostra "Apri in Safari/Chrome"
- **CameraViewfinder**: `getUserMedia` con fallback `<input type="file">`, filtri CSS in preview, Canvas pre-upload, counter scatti, Vibration API + audio click, `visibilitychange` handler
- **GuestNameSheet**: bottom sheet post-primo-scatto (opzionale, default "Anonimo")
- **OfflineQueueBadge**: indicatore foto in attesa
- **FilmFrame**: componente estetico frame vintage per galleria
- Stati limite: "Film pieno" (hard cap), "Scatti esauriti" (personali), "Rullino chiuso" (ending_date)
- Post-scatti CTA: "Lascia email per notifica reveal"
- Galleria pubblica: solo foto `is_approved = true`, branding footer

## Fase 5: Pagina Admin `/app/memories`

`src/pages/MemoriesReel.tsx` — dentro l'app autenticata:
- **MemoriesKPIs**: foto totali, partecipanti, scatti rimanenti, foto in coda approvazione
- **MemoriesSettings**: auto-creazione rullino al primo accesso, ending date, reveal mode, shots per person, film type, toggle require_approval/is_active
- **ShareCameraDialog**: QR code (`qrcode.react`) + copy link + download PNG
- **MemoriesGallery**: tutte le foto, prime 100 in chiaro se `photos_unlocked=false`, restanti con blur/lucchetto + CTA sblocco
- **ModerationView**: card con Approva/Rifiuta rapido (se require_approval)

## Fase 6: Routing + Navigazione

- `src/App.tsx`: aggiungere route `/app/memories` (protetta) e `/camera/:token` (pubblica)
- `src/pages/AppLayout.tsx`: voce "Memories" in sidebar con icona `Camera` (lucide), dopo "Pernotto"
- Dipendenza npm: `qrcode.react`

## Fase 7: Paywall Sblocco Foto (Fase Futura)

- Edge Function `create-camera-checkout` con Stripe `mode: "payment"` per sblocco album completo
- Aggiorna `photos_unlocked = true` al ritorno success

## File da creare

| File | Descrizione |
|------|-------------|
| Migration SQL | 3 tabelle + bucket + RLS |
| `supabase/functions/upload-camera-photo/index.ts` | Edge function upload pubblico |
| `src/lib/cameraFilters.ts` | Canvas filters + compressione WebP |
| `src/lib/offlinePhotoQueue.ts` | IndexedDB queue offline |
| `src/pages/MemoriesReel.tsx` | Pagina admin |
| `src/pages/CameraPublic.tsx` | Pagina pubblica fotocamera |
| `src/components/memories/MemoriesKPIs.tsx` | Statistiche |
| `src/components/memories/MemoriesSettings.tsx` | Configurazione rullino |
| `src/components/memories/MemoriesGallery.tsx` | Galleria admin |
| `src/components/memories/ModerationView.tsx` | Approvazione foto |
| `src/components/memories/ShareCameraDialog.tsx` | QR code + link |
| `src/components/memories/CameraViewfinder.tsx` | Interfaccia fotocamera |
| `src/components/memories/FilmFrame.tsx` | Frame estetico foto |
| `src/components/memories/GuestNameSheet.tsx` | Bottom sheet nome |
| `src/components/memories/OfflineQueueBadge.tsx` | Indicatore offline |
| `src/components/memories/InAppBrowserGuard.tsx` | Detector in-app browser |

## File da modificare

| File | Modifica |
|------|----------|
| `src/App.tsx` | 2 nuove route |
| `src/pages/AppLayout.tsx` | Voce sidebar "Memories" |
| `supabase/config.toml` | Config edge function |

## Ordine di implementazione

Data la dimensione, l'implementazione avverrà in 3-4 messaggi sequenziali:
1. **DB + Edge Function + config** (fondamenta)
2. **Utilities client + pagina pubblica camera** (esperienza ospiti)
3. **Pagina admin + componenti** (esperienza sposi)
4. **Routing + sidebar + polish**

