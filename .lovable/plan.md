
Obiettivo: correggere il bug iPhone per cui il primo tap apre il foglio nome, ma dopo averlo chiuso il secondo tap su “Scatta” non produce nessuna foto.

Diagnosi sintetica:
- Ho verificato il flusso nei file `src/components/memories/CameraViewfinder.tsx`, `src/pages/CameraPublic.tsx`, `src/components/memories/GuestNameSheet.tsx`, `src/lib/cameraFilters.ts`.
- Ho controllato anche runtime/log richieste: nel momento del problema non risultano chiamate a `upload-camera-photo`, quindi il bug avviene prima dell’upload.
- Do I know what the issue is? Sì: su iPhone il flusso camera si rompe dopo l’apertura del bottom sheet con input/autofocus. Il video resta montato, ma al secondo tap il capture path esce troppo presto (`videoWidth/videoHeight` non pronti oppure stream/video non più in stato giocabile), quindi non scatta nulla e fallisce in silenzio.

Piano di implementazione:
1. Rendere il componente camera “self-healing” su iPhone
- In `CameraViewfinder` aggiungere una routine unica di `start/restart` che:
  - resetta `cameraReady` quando riapre lo stream,
  - assegna `srcObject`,
  - forza `video.play()` esplicitamente,
  - aspetta un evento affidabile (`loadeddata`/`canplay`) prima di segnare la camera pronta.
- In `captureFromVideo`, se il video non è davvero pronto, invece di fare solo `return`:
  - prova automaticamente un restart rapido della camera,
  - attende che torni pronta,
  - ritenta una sola volta lo scatto.

2. Ripristinare la camera dopo il foglio nome
- Collegare `CameraPublic` e `CameraViewfinder` con un ref/metodo imperativo tipo `ensureCameraReady()` o `restartCamera()`.
- Dopo `handleNameSubmit` e `handleNameSkip`, richiamare quel metodo per riattivare il feed prima dello scatto successivo.
- Questo mantiene la logica attuale corretta: il primo scatto continua a essere attribuito all’ospite.

3. Ridurre il trigger che rompe Safari
- In `GuestNameSheet`, rendere `autoFocus` più prudente su iPhone/iOS:
  - o disattivarlo su iOS,
  - oppure ritardare il focus manualmente solo quando serve.
- Questo evita che tastiera/input interrompano il feed camera subito dopo il primo scatto.

4. Migliorare il fallback utente invece del fallimento silenzioso
- Se il video non è pronto, mostrare un piccolo stato tipo “Riattivo fotocamera…” invece di non fare nulla.
- Se il restart non riesce, mostrare messaggio chiaro con azione “Riprova”.

5. Aggiungere telemetria minima per il debug reale
- Inserire log mirati nei punti chiave:
  - apertura/chiusura foglio nome,
  - stato stream/video (`readyState`, `paused`, `videoWidth`),
  - tentativo di restart,
  - motivo preciso del mancato capture.
- Così, se resta un edge case su alcuni iPhone, il prossimo report sarà immediatamente diagnosticabile.

Cosa non cambierò:
- Nessuna modifica al backend.
- Nessun cambio al pricing o al flusso di upload.
- Nessuna rimozione della richiesta nome al primo scatto.

Dettagli tecnici:
- File principali:
  - `src/components/memories/CameraViewfinder.tsx`
  - `src/pages/CameraPublic.tsx`
  - `src/components/memories/GuestNameSheet.tsx`
- Punto critico attuale:
  - `captureFromVideo()` oggi esce se `videoWidth`/`videoHeight` sono vuoti.
  - Su iPhone, dopo il bottom sheet con input, questo stato può verificarsi anche se l’interfaccia sembra ancora attiva.
- Correzione architetturale consigliata:
  - esporre dal viewfinder un metodo di recovery,
  - non affidarsi solo a `onLoadedMetadata`,
  - non lasciare il capture path senza recovery e senza feedback.

Validazione prevista dopo la fix:
1. iPhone Safari: primo tap → nome → conferma → secondo tap deve scattare davvero.
2. iPhone Edge: stesso identico flusso.
3. Verifica sia con “Conferma” sia con “Salta”.
4. Verifica che dopo il primo nome il primo upload parta e che i successivi scatti continuino a funzionare.
