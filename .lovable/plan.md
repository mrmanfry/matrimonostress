
# Ottimizzazione Calendario per Mobile

## Problemi Identificati (dallo screenshot)

1. **Celle griglia troppo alte**: `min-h-[100px]` per ogni giorno crea un calendario enorme su mobile. Con 5-6 righe, sono 500-600px solo per la griglia.
2. **Stats cards tagliate**: "Pagamen..." troncato, testo non leggibile nelle 3 card statistiche.
3. **Troppo spazio prima del calendario**: Header + Bottone Nuovo + Tabs + 3 Stats cards + Nav mese = bisogna scrollare molto prima di vedere i giorni.
4. **Legenda ridondante**: 5 voci di legenda in basso occupano spazio extra.
5. **Nessun uso di `useIsMobile`**: la pagina non ha rendering condizionale per mobile.

## Soluzione

### 1. Header compatto su mobile
- Titolo "Calendario" piu piccolo (`text-lg` invece di `text-2xl`)
- Rimuovere la descrizione sotto il titolo su mobile
- Mettere il bottone "Nuovo" come icona sola (senza testo) su mobile

### 2. Stats cards: pillole compatte su mobile
Sostituire le 3 card con una riga di pillole inline:

```text
[1 prossimi] [0 pag. scaduti] [0 task scaduti]
```

Pillole piccole con `text-xs`, background colorato, niente icone grandi.

### 3. Griglia calendario compatta
- `min-h-[100px]` diventa `min-h-[44px]` su mobile (sufficiente per il numero + 1-2 dot)
- Invece di mostrare il titolo degli eventi nelle celle, mostrare solo **pallini colorati** (dot indicator): max 3 dots sotto il numero del giorno
- Il tap su un giorno apre il Day Preview dialog (gia implementato) dove si vedono i dettagli
- Questo riduce l'altezza del calendario da ~600px a ~300px

### 4. Navigazione mese compatta
- Unire "febbraio 2026" + frecce + "Oggi" in una riga piu stretta
- Rimuovere il CardHeader padding su mobile

### 5. Legenda nascosta su mobile
- Sostituire con una riga compatta sotto il calendario: solo i 3 dot colorati con label abbreviate, oppure nasconderla del tutto (i colori si vedono nel Day Preview dialog)

### 6. Tabs Mese/Settimana
- Mantenere ma con `TabsTrigger` piu piccoli su mobile

## Dettaglio Tecnico

### File: `src/pages/Calendar.tsx`

**Import `useIsMobile`** (riga 1-2)
- Aggiungere `import { useIsMobile } from "@/hooks/use-mobile";`
- Dichiarare `const isMobile = useIsMobile();` nel componente

**Header (righe 321-345)**
- Mobile: titolo `text-lg`, niente sottotitolo, bottone "Nuovo" solo icona `<Plus />`
- Desktop: invariato

**Stats cards (righe 348-384)**
- Mobile: sostituire con `flex gap-2` di pillole `<Badge>` compatte:
  - `{stats.upcoming} prossimi` (primary)
  - `{stats.overduePayments} pag. scaduti` (rosso, solo se > 0)
  - `{stats.overdueTasks} task scaduti` (rosso, solo se > 0)
- Desktop: invariato (3 card)

**Griglia calendario (righe 418-525)**
- Mobile: `min-h-[44px]` invece di `min-h-[100px]`
- Mobile: nel rendering degli eventi, mostrare solo dot colorati (`w-1.5 h-1.5 rounded-full`) invece dei bottoni con testo
- Mobile: max 3 dot per cella, con "+N" se ce ne sono di piu
- Desktop: invariato (bottoni con testo + HoverCard)

**Legenda (righe 530-552)**
- Mobile: una singola riga `flex gap-3 text-xs` con dot + label corte, oppure nasconderla
- Desktop: invariata

**Padding generale (riga 319)**
- Mobile: `p-3` invece di `p-6`

Nessuna modifica al DB. Solo rendering condizionale con `useIsMobile`.
