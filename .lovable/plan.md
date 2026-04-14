

## Piano: Font Custom "Better Saturday" + Pulizia Libreria Font

### Cosa faremo

1. **`@font-face` per Better Saturday** in `src/index.css` — punta a `/fonts/better-saturday.woff2` con `font-display: swap`.

2. **Aggiornare `FontStyle` type** — aggiungere `'bettersaturday'` all'union type.

3. **Aggiornare `FONT_MAP`** — aggiungere `bettersaturday: "'Better Saturday', cursive"`.

4. **Aggiornare `FONT_GROUPS`** — inserire "Better Saturday" come primo elemento nel gruppo "Calligrafici" (prioritario come richiesto).

5. **Google Fonts mancanti** — Alcuni font nel `FONT_MAP` (Cinzel, Philosopher, Libre Baskerville, Raleway, Poppins, Merriweather, Crimson Text, Italiana) non hanno un `@import` in `index.css`. Aggiungeremo gli import mancanti per evitare fallback su Georgia/system-ui.

### File coinvolti

| File | Modifiche |
|------|-----------|
| `src/index.css` | `@font-face` Better Saturday + `@import` Google Fonts mancanti |
| `src/components/print/PrintDesignStep.tsx` | `FontStyle` union + `FONT_MAP` + `FONT_GROUPS` |

### Dettagli tecnici

**`@font-face` (index.css, prima degli @import):**
```css
@font-face {
  font-family: 'Better Saturday';
  src: url('/fonts/better-saturday.woff2') format('woff2');
  font-display: swap;
}
```

**Google Fonts mancanti da aggiungere (index.css):**
- Cinzel, Philosopher, Libre Baskerville, Raleway, Poppins, Merriweather, Crimson Text, Italiana

**FONT_MAP entry:**
```ts
bettersaturday: "'Better Saturday', cursive",
```

**FONT_GROUPS — Calligrafici (primo della lista):**
```ts
{ key: 'bettersaturday', label: 'Better Saturday ✦' },
```

Nessun impatto su `HiddenPrintNode` o `MenuDesignStep` — entrambi importano `FONT_MAP` da `PrintDesignStep` e funzioneranno automaticamente.

