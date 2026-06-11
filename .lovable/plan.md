## Obiettivo
Configurare WedsApp come PWA installabile su iOS (Add to Home Screen, full-screen, status bar e safe-area gestite) + back button mirato solo sulle viste di dettaglio. Manifest-only, niente service worker / offline.

## 1. Meta tag iOS in `index.html`
Aggiorno il viewport esistente e aggiungo i tag Apple + manifest dopo il blocco favicon:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
<meta name="theme-color" content="#ffffff" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="apple-mobile-web-app-title" content="WedsApp" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
<link rel="manifest" href="/manifest.webmanifest" />
```

`viewport-fit=cover` è necessario perché `env(safe-area-inset-*)` ritorni valori non-zero su iOS.

## 2. Apple Touch Icon
Solo il riferimento `/apple-touch-icon.png`. Il PNG 180×180 lo carichi tu manualmente in `public/apple-touch-icon.png`.

## 3. Web App Manifest (`public/manifest.webmanifest`)
File nuovo, manifest-only:

```json
{
  "name": "WedsApp",
  "short_name": "WedsApp",
  "description": "Matrimonio senza stress",
  "start_url": "/app/dashboard",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#ffffff",
  "theme_color": "#ffffff",
  "icons": [
    { "src": "/brand/favicon/favicon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/brand/favicon/favicon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable" },
    { "src": "/apple-touch-icon.png", "sizes": "180x180", "type": "image/png" }
  ]
}
```

Nota: `start_url`, `scope`, `display` vengono cachati al momento dell'installazione iOS — futuri cambi richiedono reinstall.

## 4. Back button SOLO nelle viste di dettaglio (Opzione 2)
Le pagine top-level (Dashboard, Invitati, Budget, Fornitori, Checklist, Calendario, Tavoli, Catering, Pernotto, Memories, Libretto, Timeline, Regali, Campagne, Impostazioni, Chat, Cockpit, Inbox, Calendario planner) si raggiungono dalla sidebar/bottom-nav → niente back.

Creo `src/components/layout/BackButton.tsx`:
- icona chevron-left + label "Indietro",
- `navigate(-1)` se `window.history.length > 1`, altrimenti fallback a `/app/dashboard`,
- stile coerente con l'header esistente.

Inserisco il BackButton nelle viste di dettaglio/sotto-flusso attualmente esistenti:
- `src/pages/VendorDetails.tsx` (rotta `/app/vendors/:id`)
- `src/pages/Upgrade.tsx` e `src/pages/UpgradePlanner.tsx`

Il button viene messo in cima al contenuto della pagina (non nell'header globale), così resta visibile solo dove serve e non aggiunge rumore alle pagine principali. Per evitare di ripetere markup, creo un piccolo wrapper `PageBackBar` che renderizza il bottone in una riga sticky/non-sticky a inizio pagina.

## 5. Safe-area CSS
- In `src/index.css` (strato base):
  ```css
  html, body { min-height: 100dvh; }
  body {
    padding-left: env(safe-area-inset-left);
    padding-right: env(safe-area-inset-right);
  }
  ```
- Nell'header sticky di `src/pages/AppLayout.tsx` aggiungo `pt-[env(safe-area-inset-top)]` (orologio iOS).
- Il `MobileBottomNav` già usa `pb-[env(safe-area-inset-bottom)]`: lascio invariato.

## Cosa NON faccio
- Nessun service worker / `vite-plugin-pwa` / offline / cache-busting (manifest-only, in linea con la skill PWA).
- Nessun back button sulle pagine top-level: navigazione da sidebar/bottom-nav.
- Nessuna generazione automatica dell'icona 180×180 (la fornisci tu).

## File toccati
- `index.html` (head)
- `public/manifest.webmanifest` (nuovo)
- `src/components/layout/BackButton.tsx` (nuovo)
- `src/pages/VendorDetails.tsx`, `src/pages/Upgrade.tsx`, `src/pages/UpgradePlanner.tsx` (montaggio BackButton)
- `src/pages/AppLayout.tsx` (safe-area top sull'header)
- `src/index.css` (safe-area laterali + min-height dvh)
