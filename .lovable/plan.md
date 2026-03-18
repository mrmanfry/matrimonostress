

## Fix: Crash JS `getOutputFormat is not a function` + Error Handling

### Diagnosi reale

`getOutputFormat()` **esiste** ed è definito in `src/lib/cameraFilters.ts` (linea 35). Non è un'allucinazione — è una funzione del nostro codebase che rileva il supporto WebP e restituisce il formato di output (webp o jpeg).

Il crash avviene perché viene importata tramite **dynamic import** (`await import("@/lib/cameraFilters")`) che in produzione, dopo la minificazione di Vite, non risolve correttamente l'export. La preview funziona perché i moduli non vengono bundlati allo stesso modo.

### Punti esatti del bug

1. **`src/pages/CameraPublic.tsx` linea 196**: `await import("@/lib/cameraFilters").then(m => ({ ext: m.getOutputFormat().ext }))` — crasha ogni upload online
2. **`src/lib/offlinePhotoQueue.ts` linee 85-86**: `const { getOutputFormat } = await import("@/lib/cameraFilters")` — crasha ogni flush della coda offline

### Piano di fix

#### 1. `src/pages/CameraPublic.tsx`
- Aggiungere `getOutputFormat` all'import statico esistente (linea 9, che già importa `FilmType`)
- Sostituire la linea 196 con `const ext = getOutputFormat().ext`
- Avvolgere `uploadPhoto` e `handlePhotoTaken` in try/catch con toast di errore

#### 2. `src/lib/offlinePhotoQueue.ts`
- Aggiungere import statico `import { getOutputFormat } from "@/lib/cameraFilters"` in testa
- Sostituire le linee 85-86 con uso diretto: `formData.append("photo", photo.blob, \`photo.${getOutputFormat().ext}\`)`

#### 3. `src/components/memories/CameraViewfinder.tsx`
- Avvolgere `doCapture` e `handleFileInput` in try/catch con callback di errore o toast

### File da modificare
- `src/pages/CameraPublic.tsx` — import statico + try/catch + toast
- `src/lib/offlinePhotoQueue.ts` — import statico
- `src/components/memories/CameraViewfinder.tsx` — try/catch con feedback utente

### Nota
Dopo il deploy, l'utente dovrà fare un hard refresh su wedsapp.it per caricare il nuovo bundle.

