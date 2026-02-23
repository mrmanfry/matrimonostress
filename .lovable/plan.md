

# Fix Colori Non Leggibili nella Dashboard

## Problema
Diversi colori nella dashboard hanno contrasto insufficiente sullo sfondo chiaro, rendendo il testo difficile da leggere:

1. **Countdown "152"** (`text-accent` = viola 66% lightness) su sfondo chiaro gradient-hero -- troppo chiaro
2. **Icona calendario** (`text-accent` = stesso viola) -- poco visibile
3. **Icone sezioni** (`text-gold` = giallo/oro 65% lightness) -- scarso contrasto su sfondo bianco delle card
4. **Testi "Min: €0" e "Target"** (`text-muted-foreground` = grigio 9% con `text-[10px]`) -- troppo piccoli, colore OK ma difficile su mobile
5. **Label "Ancora da Pagare" e "Liquidita Rimanente"** (`text-muted-foreground`) -- OK come colore ma il contesto e chiaro
6. **Hover accent** sui link (`group-hover:text-accent`) -- stesso viola poco leggibile

## Modifiche Pianificate

### File: `src/pages/Dashboard.tsx`

**Countdown (riga 338)**
- Cambiare `text-accent` in `text-primary` (blu 243 75% 58%) -- molto piu leggibile e coerente col brand
- Stessa modifica per l'icona calendario (riga 337): `text-accent` -> `text-primary`

**Icone sezioni**
- Riga 374: icona Euro `text-gold` -> `text-primary` per coerenza e leggibilita
- Riga 441: icona AlertCircle `text-red-600` -- OK, resta cosi (buon contrasto)

**Hover sui link (righe 465, 504)**
- `group-hover:text-accent` -> `group-hover:text-primary` per leggibilita al passaggio

**Label Min/Target (righe 393-396)**
- Aumentare dimensione da `text-[10px]` a `text-xs` per migliorare leggibilita
- Cambiare colore da `text-muted-foreground` a `text-foreground/60` per piu contrasto

**Importi "Ancora da Pagare" e "Liquidita Rimanente" (righe 413, 430)**
- `text-orange-600` -> `text-orange-700` (piu scuro, piu leggibile)
- `text-green-600` -> `text-green-700` (piu scuro, piu leggibile)

### File: `src/components/dashboard/GuestSummaryWidget.tsx`

- Verificare e allineare eventuali usi di `text-accent` o `text-gold` con `text-primary`

## Riepilogo Colori

| Elemento | Prima | Dopo |
|----------|-------|------|
| Countdown 152 | `text-accent` (viola 66%) | `text-primary` (blu 58%) |
| Icona calendario | `text-accent` | `text-primary` |
| Icona Euro budget | `text-gold` (oro 65%) | `text-primary` |
| Hover link | `text-accent` | `text-primary` |
| Importo da pagare | `text-orange-600` | `text-orange-700` |
| Importo rimanente | `text-green-600` | `text-green-700` |
| Label Min/Target | `text-[10px] text-muted-foreground` | `text-xs text-foreground/60` |

Nessuna modifica al DB. Solo cambiamenti di classi CSS nel rendering.

