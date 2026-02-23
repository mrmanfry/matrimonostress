
# Ottimizzazione Grafico RSVP per Mobile

## Problema
Il grafico a torta RSVP occupa troppo spazio verticale su mobile. La legenda con testo "Confermati: X", "In attesa: X", "Rifiutati: X" sotto il grafico spreca spazio e il layout risulta poco compatto.

## Soluzione
Sostituire il grafico a torta con una **barra orizzontale segmentata** su mobile (stile Apple compact), mantenendo il donut chart su desktop. La barra mostra le proporzioni con colori e i numeri in una riga sotto.

## Dettaglio Tecnico

**File: `src/components/dashboard/GuestSummaryWidget.tsx`** - righe 119-152

### Mobile (barra compatta)
- Rimuovere il PieChart su mobile e mostrare una barra orizzontale con 3 segmenti colorati (verde confermati, blu in attesa, grigio rifiutati)
- Sotto la barra, 3 label compatte in riga: pallino + numero
- Altezza totale: circa 60px invece di 150px

### Desktop (invariato)
- Mantenere il PieChart attuale con `h-[180px]`

### Struttura mobile proposta
```
[=====verde=====|===blu===|=grigio=]
 ● 12 Confermati  ● 8 In attesa  ● 2 Rifiutati
```

### Codice
- Usare `isMobile` (gia importato) per il rendering condizionale
- La barra usa `flex` con width percentuale per ogni segmento
- I numeri sotto usano `grid-cols-3` con `text-[11px]`
- Altezza barra: `h-3 rounded-full overflow-hidden`

Nessuna modifica al DB. Solo rendering condizionale nel componente.
