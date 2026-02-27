

## Uniformare il Logo "WedsApp" in tutta l'app

Il nuovo logo dell'Hero (icona cuore con effetto glass + "WedsApp" + sottotitolo "Wedding Planner") va replicato in tutti i punti dove appare il vecchio logo semplificato.

### Punti da aggiornare

**1. `src/pages/Auth.tsx` - Pannello sinistro (linee 370-375)**
- Vecchio: semplice icona + testo inline
- Nuovo: stile glassmorphism con sottotitolo "Wedding Planner", identico all'Hero

**2. `src/pages/Auth.tsx` - Form destro (linee 182-187)**
- Vecchio: cerchio accent con cuore + "WedsApp" in h1
- Nuovo: stessa struttura glassmorphism ma adattata allo sfondo chiaro (sfondo accent invece di white/10, testo scuro)

**3. `src/pages/AppLayout.tsx` - Sidebar (linee 153-160)**
- Vecchio: icona Heart + "WedsApp" in testo semplice
- Nuovo: icona con contenitore arrotondato + "WedsApp" con sottotitolo "Wedding Planner" sotto, compatto per la sidebar

**4. `src/components/Footer.tsx` (linee 9-11)**
- Vecchio: icona Heart + "WedsApp" inline
- Nuovo: stessa struttura con contenitore arrotondato e sottotitolo

### Adattamenti per contesto

- **Sfondo scuro** (Hero, Auth pannello sinistro): `bg-white/10`, `border-white/15`, testo bianco
- **Sfondo chiaro** (Auth form, Sidebar, Footer): `bg-accent/10`, `border-accent/15`, testo foreground, cuore color accent

### Dettagli tecnici

Ogni istanza del logo avra:
1. Contenitore icona con `rounded-2xl`, backdrop-blur, bordo sottile, e puntino luminoso decorativo
2. Testo "WedsApp" in `font-serif font-bold tracking-wider`
3. Sottotitolo "Wedding Planner" in `text-[10px] uppercase tracking-[0.25em]`
4. Dimensioni adattate al contesto (sidebar piu compatto, hero/auth piu grande)

Nessuna nuova dipendenza. Solo modifiche CSS/markup.
