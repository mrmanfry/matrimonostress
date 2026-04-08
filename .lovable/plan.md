

## Fix: Ridurre dimensione slot posti imperiali

Gli slot dei posti nella vista grafica (≤20) sono troppo larghi e alcuni escono dalla visualizzazione. Riduco le dimensioni minime e il padding per farli stare tutti.

### Cambiamenti

**`src/components/tables/ImperialTableLayout.tsx`** — SeatSlot non-compact (vista grafica):
- Ridurre `min-w-[80px]` → `min-w-[48px]` e `min-h-[44px]` → `min-h-[36px]`
- Ridurre padding da `px-2 py-1.5` → `px-1 py-1`
- Ridurre font del numero sede da `text-[10px]` → `text-[8px]`
- Ridurre font nome da `text-[11px]` → `text-[10px]` e `max-w-[70px]` → `max-w-[40px]`
- Ridurre dimensione icona User vuota da `w-3.5 h-3.5` → `w-3 h-3`

Questo permette a 16 posti (8 per lato) di stare comodamente nella larghezza disponibile senza scroll.

