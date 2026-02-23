

## Executive Summary

1. The app currently has zero PWA infrastructure: no manifest, no service worker, no offline capability, no Apple touch icons.
2. Core user journeys (Timeline, Vendors, Checklist) use raw `useState`/`useEffect` with direct Supabase calls -- no caching layer exists.
3. iOS users (~80%) cannot install the app or use it offline. No safe-area handling exists, so content gets clipped by the iPhone home indicator.
4. **Chosen data layer for P0: React Query + `@tanstack/react-query-persist-client` with IndexedDB** (already installed as dependency, minimal new code, built-in stale-while-revalidate).
5. Auth offline risk: the existing `AuthContext` will crash/redirect if Supabase is unreachable. A network-aware guard is needed.
6. P0 scope: Manifest + icons + SW (vite-plugin-pwa) + offline shell + read-only data caching for 3 pages + iOS safe areas + A2HS prompt. One sprint.
7. P1: Virtual keyboard fixes, push-notification groundwork, A2HS analytics, performance budgets.
8. P2: Background sync for mutations, full offline-first with conflict resolution, advanced caching.
9. No over-engineering: SW uses `generateSW` mode (no custom SW code), offline mutations are disabled with clear UX.
10. All changes are additive -- zero risk of breaking existing desktop flows.

---

## P0 Backlog (1 Sprint)

| # | Item | Why | How | Effort | Acceptance Criteria |
|---|------|-----|-----|--------|---------------------|
| 1 | **Web App Manifest** | Required for installability on all platforms | Create `public/manifest.json` with correct `start_url`, `scope`, `display: standalone`, Italian `name`/`short_name`, theme colors from CSS vars | S | Lighthouse "Installable" check passes |
| 2 | **PWA Icons** | Required by manifest; Apple needs separate touch icons | Generate icon set (192, 512, maskable) + apple-touch-icon (180); add `<link>` tags to `index.html` | S | Icons render in A2HS prompt and splash screen |
| 3 | **vite-plugin-pwa setup** | Generates SW + precaches app shell automatically | Install plugin, configure in `vite.config.ts` with `generateSW`, precache glob, offline fallback, `navigateFallbackDenylist: [/^\/~oauth/]` | M | App loads offline with cached shell; `/~oauth` never cached |
| 4 | **Offline fallback page** | User sees helpful message instead of browser error | Create `public/offline.html` (standalone HTML, no React) shown when navigating offline to uncached route | S | Navigating to uncached route offline shows fallback |
| 5 | **React Query offline persistence** | Read-only offline for Timeline/Vendors/Checklist | Install `@tanstack/react-query-persist-client` + `idb-keyval`; wrap QueryClient with `PersistQueryClientProvider`; migrate 3 pages to `useQuery` | L | After first online load, data visible offline |
| 6 | **Offline-aware AuthContext** | Prevent crash/redirect loops when offline with expired token | Add `navigator.onLine` check; if offline + no valid session, show "Offline -- accedi quando torni online" screen in `ProtectedRoute` instead of redirecting to `/auth` | M | Opening app offline with expired token shows graceful screen, not login redirect |
| 7 | **Disable mutations offline** | Prevent data loss / sync conflicts (out of scope for MVP) | Create `useIsOnline()` hook; wrap CTA buttons with `disabled={!isOnline}` + tooltip "Disponibile online"; show persistent banner when offline | M | All write buttons disabled offline; banner visible |
| 8 | **iOS safe-area CSS** | Bottom nav clipped by iPhone home indicator | Add `viewport-fit=cover` to meta viewport; add CSS utility classes using `env(safe-area-inset-*)` to `index.css`; apply to AppLayout bottom/header | S | Content not obscured by notch or home indicator on iPhone X+ |
| 9 | **A2HS onboarding prompt (iOS)** | iOS has no native install prompt; users need guidance | Create `InstallPrompt` component shown on iOS Safari (non-standalone) after 2nd visit; max 3 dismissals; stored in localStorage | M | iOS Safari users see "Aggiungi alla Home" instructions; dismissed permanently after 3x |
| 10 | **SW update prompt** | Users must get latest version without session loss | Configure `registerType: 'prompt'` in vite-plugin-pwa; show toast "Nuovo aggiornamento disponibile" with "Aggiorna" button | S | After deploy, returning user sees update toast; clicking refreshes cleanly |

---

## P1 Backlog (Sprint 2)

| # | Item | Why | How | Effort |
|---|------|-----|-----|--------|
| 1 | iOS virtual keyboard mitigations | Budget inputs covered by keyboard in standalone mode | Use `visualViewport` API to detect keyboard; scroll active input into view; add `pb-[env(keyboard-inset-height)]` pattern | M |
| 2 | A2HS install analytics | Measure conversion of install prompt | Track `beforeinstallprompt` (Android), prompt impressions/dismissals in lightweight analytics | S |
| 3 | Performance budget CI | Prevent regressions | Add Lighthouse CI with budget assertions (LCP < 2.5s, CLS < 0.1) to build pipeline | M |
| 4 | Stale data indicator | User knows cached data may be outdated | Show "Ultimo aggiornamento: 2h fa" chip when `dataUpdatedAt` is older than threshold | S |
| 5 | Precache critical API responses | Faster first paint on slow 3G | Add runtime caching rule in SW for Supabase REST endpoints (StaleWhileRevalidate, max 50 entries, 24h TTL) | M |

---

## P2 Backlog (Future)

| # | Item | Why | How | Effort |
|---|------|-----|-----|--------|
| 1 | Offline mutations with queue | Allow checklist ticking offline | IndexedDB mutation queue + Background Sync API + conflict resolution | L |
| 2 | Push notifications | Payment reminders, RSVP updates | Web Push via backend function + VAPID keys | L |
| 3 | Periodic background sync | Keep cached data fresh | Periodic Background Sync API (Chrome only, graceful degradation) | M |
| 4 | App shortcuts | Quick access to Checklist/Timeline from home icon | Manifest `shortcuts` array | S |

---

## Implementation Details

### 1. Manifest and Icons

**File: `public/manifest.json`**

```json
{
  "name": "Nozze Senza Stress",
  "short_name": "NSS",
  "description": "Il tuo partner digitale per organizzare il matrimonio",
  "start_url": "/app/dashboard",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait",
  "theme_color": "#F5F0EB",
  "background_color": "#F5F0EB",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

**Icons required (place in `public/icons/`):**
- `icon-192.png` (192x192) -- Android
- `icon-512.png` (512x512) -- Android splash
- `icon-maskable-512.png` (512x512, with safe zone padding) -- maskable
- `apple-touch-icon.png` (180x180) -- iOS, referenced in `index.html`
- `favicon-32.png` (32x32) -- browser tab

**File: `index.html` additions:**
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="apple-mobile-web-app-title" content="NSS" />
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
<link rel="manifest" href="/manifest.json" />
```

### 2. A2HS UX (iOS Install Prompt)

**New file: `src/components/InstallPrompt.tsx`**

Logic:
- Detect iOS Safari (non-standalone): `!window.navigator.standalone && /iPhone|iPad/.test(navigator.userAgent)`
- Track visit count in `localStorage` (`NSS_VISIT_COUNT`)
- Show only after 2nd visit
- Track dismissals (`NSS_INSTALL_DISMISSED`), max 3 shows
- UI: bottom sheet with Safari share icon illustration + "Tocca Condividi, poi Aggiungi alla schermata Home"
- Render in `AppLayout.tsx` inside the main content area

UX Rules:
- Never show inside standalone mode (already installed)
- Never show on Android (they get native `beforeinstallprompt`)
- Dismiss = increment counter, close for session
- After 3 dismissals = never show again
- No blocking overlays, just a subtle bottom card

### 3. iOS Safe Areas + Keyboard

**File: `index.html`**
Add `viewport-fit=cover` to existing meta viewport tag.

**File: `src/index.css`**
```css
@layer utilities {
  .safe-top { padding-top: env(safe-area-inset-top); }
  .safe-bottom { padding-bottom: env(safe-area-inset-bottom); }
  .safe-left { padding-left: env(safe-area-inset-left); }
  .safe-right { padding-right: env(safe-area-inset-right); }
}
```

**File: `src/pages/AppLayout.tsx`**
- Add `safe-top` to the `<header>` element
- Add `safe-bottom` to the `<main>` or FAB containers
- Ensure the sidebar footer has `safe-bottom`

**Keyboard (P1 detail for reference):**
iOS standalone mode does not fire `resize` reliably. Use:
```typescript
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', () => {
    document.documentElement.style.setProperty(
      '--keyboard-height',
      `${window.innerHeight - window.visualViewport!.height}px`
    );
  });
}
```

### 4. Service Worker + Caching (vite-plugin-pwa)

**Install:**
```
npm install -D vite-plugin-pwa
```

**File: `vite.config.ts`**
```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => ({
  server: { host: "::", port: 8080 },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["favicon.ico", "icons/*.png"],
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/~oauth/, /^\/api/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts",
              expiration: { maxEntries: 20, maxAgeSeconds: 365 * 24 * 60 * 60 },
            },
          },
          {
            urlPattern: /^https:\/\/evaivaudtestjzckutsd\.supabase\.co\/rest\/v1\/.*/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "supabase-api",
              expiration: { maxEntries: 50, maxAgeSeconds: 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      manifest: false, // We use our own public/manifest.json
    }),
  ].filter(Boolean),
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
}));
```

**File: `public/offline.html`**
Minimal standalone HTML page with message: "Sei offline. Torna online per accedere a questa pagina." Styled inline to match app theme.

### 5. Data Offline: React Query + IndexedDB Persistence

**Why React Query over Zustand:**
- React Query is already installed (`@tanstack/react-query ^5.83.0`)
- Built-in `staleTime`, `gcTime`, background refetch -- perfect for SWR pattern
- `@tanstack/react-query-persist-client` provides turnkey IndexedDB persistence
- The 3 target pages (Timeline, Vendors, Checklist) are pure read-on-mount patterns, ideal for `useQuery`
- Zustand would require manual serialization, manual stale detection, manual refetch logic

**Install:**
```
npm install @tanstack/react-query-persist-client idb-keyval
```

**File: `src/lib/queryPersister.ts`** (new)
```typescript
import { get, set, del } from "idb-keyval";
import type { PersistedClient, Persister } from "@tanstack/react-query-persist-client";

export function createIDBPersister(idbKey = "NSS_QUERY_CACHE"): Persister {
  return {
    persistClient: async (client: PersistedClient) => { await set(idbKey, client); },
    restoreClient: async () => { return await get<PersistedClient>(idbKey); },
    removeClient: async () => { await del(idbKey); },
  };
}
```

**File: `src/App.tsx`** (modify)
- Replace `QueryClientProvider` with `PersistQueryClientProvider`
- Configure `queryClient` with `gcTime: 1000 * 60 * 60 * 24` (24h)
- Set default `staleTime: 1000 * 60 * 5` (5 min)

```typescript
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createIDBPersister } from "@/lib/queryPersister";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 24 * 60 * 60 * 1000,
      retry: 1,
      networkMode: "offlineFirst",
    },
  },
});

const persister = createIDBPersister();

// In JSX:
<PersistQueryClientProvider client={queryClient} persistOptions={{ persister, maxAge: 24 * 60 * 60 * 1000 }}>
  {/* ...existing providers... */}
</PersistQueryClientProvider>
```

**Pages to migrate to `useQuery`:**

Each page currently does `useState` + `useEffect` + `supabase.from(...).select(...)`. Migration pattern:

```typescript
// Before (Timeline.tsx):
const [events, setEvents] = useState([]);
useEffect(() => { fetchEvents(); }, [weddingId]);

// After:
const { data: events = [], isLoading } = useQuery({
  queryKey: ["timeline-events", weddingId],
  queryFn: async () => {
    const { data } = await supabase
      .from("timeline_events")
      .select("*")
      .eq("wedding_id", weddingId)
      .order("order_index");
    return data ?? [];
  },
  enabled: !!weddingId,
});
```

Pages to migrate:
- `src/pages/Timeline.tsx` -- events query
- `src/pages/Vendors.tsx` -- vendors + categories queries
- `src/pages/Checklist.tsx` -- tasks + vendors queries

**Stale data behavior:** When offline, React Query serves cached data from IndexedDB. `dataUpdatedAt` is preserved, so P1 can add a "stale" indicator. No error shown -- data just appears from cache.

### 6. Offline-Aware Auth Guard

**New file: `src/hooks/useIsOnline.ts`**
```typescript
import { useSyncExternalStore } from "react";

const subscribe = (cb: () => void) => {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => { window.removeEventListener("online", cb); window.removeEventListener("offline", cb); };
};

export function useIsOnline() {
  return useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
}
```

**File: `src/guards/ProtectedRoute.tsx`** (modify)
Add offline check before the "unauthenticated" redirect:

```typescript
const isOnline = useIsOnline();

// After "loading" check, before "unauthenticated" check:
if (!isOnline && (authState.status === "loading" || authState.status === "unauthenticated" || authState.status === "error")) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-6">
      <div className="text-center space-y-4">
        <WifiOff className="w-16 h-16 text-muted-foreground mx-auto" />
        <h2 className="text-xl font-semibold">Sei Offline</h2>
        <p className="text-muted-foreground">Accedi a Internet per entrare nell'app.</p>
      </div>
    </div>
  );
}
```

**File: `src/components/OfflineBanner.tsx`** (new)
A persistent thin banner at the top of AppLayout when offline:
```
[WifiOff icon] Sei offline -- le modifiche sono disabilitate
```
Rendered in `AppLayout.tsx` above `<Outlet />`.

### 7. SW Update Strategy

Handled by `vite-plugin-pwa` with `registerType: "prompt"`:

**File: `src/components/PWAUpdatePrompt.tsx`** (new)
```typescript
import { useRegisterSW } from "virtual:pwa-register/react";
import { toast } from "sonner";
import { useEffect } from "react";

export function PWAUpdatePrompt() {
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW();

  useEffect(() => {
    if (needRefresh) {
      toast("Nuovo aggiornamento disponibile", {
        action: { label: "Aggiorna", onClick: () => updateServiceWorker(true) },
        duration: Infinity,
      });
    }
  }, [needRefresh]);

  return null;
}
```

Render in `App.tsx` at the top level.

### 8. HTTP Caching Headers (Hosting)

**Netlify (`public/_headers`):**
```
/assets/*
  Cache-Control: public, max-age=31536000, immutable

/index.html
  Cache-Control: no-cache

/manifest.json
  Cache-Control: no-cache

/sw.js
  Cache-Control: no-cache
```

**Vercel (`vercel.json`):**
```json
{
  "headers": [
    { "source": "/assets/(.*)", "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }] },
    { "source": "/index.html", "headers": [{ "key": "Cache-Control", "value": "no-cache" }] },
    { "source": "/sw.js", "headers": [{ "key": "Cache-Control", "value": "no-cache" }] }
  ]
}
```

Vite already hashes asset filenames (`/assets/index-[hash].js`), making immutable caching safe. `sw.js` and `index.html` must never be cached by the CDN to ensure updates propagate.

---

## Files Summary

| Action | File |
|--------|------|
| CREATE | `public/manifest.json` |
| CREATE | `public/offline.html` |
| CREATE | `public/icons/` (5 icon files -- user must provide source image) |
| CREATE | `public/_headers` (Netlify) |
| CREATE | `src/lib/queryPersister.ts` |
| CREATE | `src/hooks/useIsOnline.ts` |
| CREATE | `src/components/InstallPrompt.tsx` |
| CREATE | `src/components/OfflineBanner.tsx` |
| CREATE | `src/components/PWAUpdatePrompt.tsx` |
| MODIFY | `index.html` (meta tags, apple icons, viewport-fit) |
| MODIFY | `vite.config.ts` (add VitePWA plugin) |
| MODIFY | `src/App.tsx` (PersistQueryClientProvider, PWAUpdatePrompt) |
| MODIFY | `src/index.css` (safe-area utilities) |
| MODIFY | `src/pages/AppLayout.tsx` (safe-area classes, OfflineBanner) |
| MODIFY | `src/guards/ProtectedRoute.tsx` (offline guard) |
| MODIFY | `src/pages/Timeline.tsx` (migrate to useQuery) |
| MODIFY | `src/pages/Vendors.tsx` (migrate to useQuery) |
| MODIFY | `src/pages/Checklist.tsx` (migrate to useQuery) |

---

## Testing Plan

### Device/Browser Matrix

| # | Environment | Priority |
|---|-------------|----------|
| 1 | iOS Safari 17+ (iPhone 14/15) | Critical |
| 2 | iOS installed PWA (A2HS) | Critical |
| 3 | Android Chrome installed PWA | High |
| 4 | Desktop Chrome | Medium |

### Test Cases

| # | Test Case | Steps | Expected |
|---|-----------|-------|----------|
| 1 | Installability | Open in iOS Safari, tap Share | "Aggiungi alla schermata Home" visible |
| 2 | A2HS prompt UX | Visit app 2x on iOS Safari | InstallPrompt appears; dismiss 3x = never again |
| 3 | Offline with valid token | Load app online, go to Timeline, toggle airplane mode, reload | Timeline data visible from cache |
| 4 | Offline with expired token | Clear session, go offline, open app | "Sei Offline" screen, no redirect loop |
| 5 | Offline read: Timeline | Load Timeline online, go offline, navigate to Timeline | Events displayed from cache |
| 6 | Offline read: Vendors | Same pattern as above | Vendor list displayed from cache |
| 7 | Offline read: Checklist | Same pattern as above | Tasks displayed from cache |
| 8 | Mutations disabled offline | Go offline, try to add a guest or tick a checklist item | Button disabled, tooltip "Disponibile online" |
| 9 | Offline banner | Toggle airplane mode while in app | Banner appears/disappears |
| 10 | SW update | Deploy new version, open app | Toast "Nuovo aggiornamento", click refreshes |
| 11 | Safe areas | Open in iPhone X+ standalone mode | Header and bottom content clear of notch/indicator |
| 12 | Slow 3G | Chrome DevTools throttle, load Dashboard | LCP < 4s, no layout shift |

---

## Measurement Plan

### What to Measure

| Metric | Target (P0) | Target (P1) | How |
|--------|-------------|-------------|-----|
| LCP | < 3.5s | < 2.5s | `web-vitals` library |
| INP | < 300ms | < 200ms | `web-vitals` library |
| CLS | < 0.15 | < 0.1 | `web-vitals` library |
| TTFB | < 1.5s | < 800ms | `web-vitals` library |
| SW install success | > 90% | > 95% | SW lifecycle event logging |
| Offline page loads | Track count | - | Custom event in analytics |
| A2HS prompt shown | Track count | - | localStorage counter |

### Instrumentation

**File: `src/lib/webVitals.ts`** (new, P1)
```typescript
import { onLCP, onINP, onCLS } from "web-vitals";

function sendMetric(metric: { name: string; value: number }) {
  // Lightweight: log to console in dev, send to analytics endpoint in prod
  if (navigator.sendBeacon) {
    navigator.sendBeacon("/api/vitals", JSON.stringify(metric));
  }
}

export function initWebVitals() {
  onLCP(sendMetric);
  onINP(sendMetric);
  onCLS(sendMetric);
}
```

For P0, simply verify metrics manually via Chrome DevTools Lighthouse. Automated instrumentation is P1.
