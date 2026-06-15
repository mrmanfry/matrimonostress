## Problemi rilevati

1. **Home `/` — Footer non cliccabile**: in `src/pages/Index.tsx` (riga 262-267) le voci del footer ("Funzionalità", "Prezzi", "Privacy"...) sono semplici `<li>` di testo, non `<Link>`. Da mobile (e desktop) non puoi navigarci.
2. **Home `/` — Nav mobile vuota**: la barra in alto su mobile nasconde tutti i link di navigazione e mostra solo "Inizia gratis". Non c'è hamburger → da mobile non puoi raggiungere `/funzionalita`, `/prezzi`, ecc.
3. **Pagine `/funzionalita`, `/come-funziona`, `/prezzi`, `/risorse`**: usano `PageNav`, `PageHero`, `LandingFooter` in `src/components/landing/PageChrome.tsx` con stili inline **senza alcuna gestione mobile**:
   - Nav: padding 48px fisso, link sempre orizzontali → overflow
   - Hero: titolo 60px e padding 88px/48px → testo troppo grande, taglia sui lati
   - Footer: griglia `1.5fr 1fr 1fr 1fr` fissa → 4 colonne schiacciate, padding 48px

## Modifiche

### 1. `src/components/landing/PageChrome.tsx`
- `PageNav`: usare `useIsMobile()`. Su mobile: padding ridotto (`14px 20px`), nascondere link orizzontali, mostrare hamburger (`Menu` da lucide-react) che apre un `Sheet` shadcn con i 4 link + "Accedi" + "Inizia gratis". Su desktop: comportamento attuale.
- `PageHero`: font title responsive (40px mobile / 60px desktop), padding `56px 20px 40px` mobile, lede 16px mobile.
- `LandingFooter`: grid `1fr 1fr` mobile (con il blocco logo a tutta larghezza in cima via `gridColumn: '1 / -1'`) / `1.5fr 1fr 1fr 1fr` desktop; padding `20px` mobile; bottom-row con `flex-direction: column` mobile.

### 2. `src/pages/Index.tsx`
- `Footer`: trasformare le voci in oggetti `{label, to}` e renderizzarle come `<Link>` di `react-router-dom`. Mappatura:
  - Prodotto → `/funzionalita`, `/prezzi`, `/risorse`
  - Risorse → `/risorse`, `/risorse`, `/help`
  - Legale → tutte a `/risorse` (placeholder coerente con `LandingFooter`)
- `Nav`: su mobile aggiungere hamburger con `Sheet` (stessa UX di `PageNav`) per esporre i 4 link di navigazione + "Accedi".

## Risultato atteso
- Da mobile la home ha hamburger funzionante e footer con link cliccabili che portano alle pagine reali.
- Le pagine `/funzionalita`, `/come-funziona`, `/prezzi`, `/risorse` si adattano alla viewport 390px senza overflow orizzontale e con navigazione mobile coerente.

## File toccati
- `src/components/landing/PageChrome.tsx` (modificato)
- `src/pages/Index.tsx` (modificato)

Nessuna modifica a logica di business o backend.