## Fix: Camera non funziona su mobile (shutter + gallery upload + persistenza nome)

### Problemi identificati

Analizzando il codice, ci sono **4 problemi** che causano il malfunzionamento su mobile:

1. **Focus non rilasciato** — Dopo il submit del nome, il campo input mantiene il focus. Su mobile la tastiera virtuale non si chiude correttamente, lasciando il viewport in uno stato inconsistente. I tap successivi sul pulsante "scatta" o sull'upload da galleria cadono nel vuoto perché l'hit-box è sfalsata rispetto alla posizione visuale.
2. **Viewport `100vh` vs `100dvh**` — Il container usa `fixed inset-0` che su mobile equivale a `100vh`. Quando la tastiera si apre/chiude, `100vh` non si aggiorna su iOS/Android, causando un disallineamento tra dove il pulsante appare e dove il browser registra i tap.
3. **Overlay pointer-events** — Il backdrop del `GuestNameSheet` (`bg-black/50` con `onClick={onSkip}`) viene smontato (`return null`), ma React potrebbe non smontarlo istantaneamente nello stesso ciclo di render, lasciando un overlay invisibile che intercetta i tocchi per un frame.
4. **Nome non persistente** — Il `guestName` vive solo in `useState`, si perde al refresh/rientro.

### Piano di modifiche

#### 1. `src/components/memories/GuestNameSheet.tsx`

- Aggiungere `(document.activeElement as HTMLElement)?.blur()` sia in `onSubmit` che in `onSkip`, **prima** di chiamare il callback
- Disabilitare `autoFocus` anche su Android (ora è solo iOS)
- Aggiungere `pointer-events: none` durante il dismiss per sicurezza

#### 2. `src/pages/CameraPublic.tsx`

- Cambiare il container da `className="fixed inset-0"` a usare `style={{ height: '100dvh' }}` con fallback
- In `handleNameSubmit` e `handleNameSkip`: aggiungere un `setTimeout(300ms)` prima di chiamare `restartCamera()`, per dare tempo al browser di completare il resize del viewport dopo la chiusura della tastiera
- **Persistenza nome**: leggere/scrivere `guestName` in `localStorage` con chiave `camera_guest_name_{token}`. Se presente, saltare il name sheet (`firstShot.current = false`)

#### 3. `src/components/memories/CameraViewfinder.tsx`

- Usare `style={{ height: '100dvh' }}` sul container root per allineamento corretto su mobile

### Dettagli tecnici

```text
Flusso corretto dopo il fix:

1. Utente apre /camera/{token}
2. Controlla localStorage → se nome presente, salta name sheet
3. Primo scatto/upload → mostra name sheet → blur + dismiss → 300ms delay → restartCamera
4. Secondo scatto/upload → funziona immediatamente (viewport allineato, nessun overlay residuo)
5. Rientro successivo → nome già in localStorage, nessun name sheet
```

File da modificare: `GuestNameSheet.tsx`, `CameraPublic.tsx`, `CameraViewfinder.tsx`

Nessuna modifica al backend. Dite a Lovable/Dev che **"il bug blocca anche l'input file della galleria"**. È un dettaglio utile per l'AI o per lo sviluppatore perché gli fa capire immediatamente che deve concentrarsi sul `CSS/Viewport` e sul `DOM globale`, smettendo di cercare errori nel codice specifico di `react-webcam`