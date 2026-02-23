

# Ottimizzazione Dashboard Mobile

## Problemi Rilevati dagli Screenshot (390x844)

1. **Header Countdown**: Il numero "152" e troppo grande (text-5xl) e il gradiente risulta sbiadito su mobile
2. **Widget Invitati**: Occupa troppo spazio verticale - la griglia Adulti/Bambini/Sposi/Staff e 2x2 su mobile invece di 4 colonne, e il grafico a torta e troppo alto (180px)
3. **Barra Budget**: I testi "€0" e "€31.885.000" si sovrappongono con l'importo nella barra dorata, rendendo illeggibile
4. **Padding eccessivo**: Le card hanno p-6 ovunque, troppo per mobile
5. **Titoli sezioni**: "text-xl" troppo grande per mobile

## Modifiche Pianificate

### File 1: `src/pages/Dashboard.tsx`

**Header Countdown (riga ~331-358)**
- Ridurre padding card: `p-4 lg:p-8`
- Ridurre titolo nomi: `text-2xl lg:text-4xl`
- Ridurre countdown: `text-4xl lg:text-7xl`
- Ridurre icona calendario: `w-6 h-6 lg:w-8 lg:h-8`
- Ridurre sottotitolo: `text-base lg:text-xl`

**Widget Budget (riga ~369-434)**
- Ridurre padding: `p-4 md:p-6`
- Ridurre titolo: `text-lg md:text-xl`
- Barra budget: spostare le label "€0" e "€totale" SOTTO la barra invece che sovrapposti, per evitare collisione testi
- Ridurre altezza barra: `h-10 md:h-12`

**Widget Azioni Urgenti (riga ~437-517)**
- Ridurre padding: `p-4 md:p-6`
- Ridurre titolo: `text-lg md:text-xl`

**Container principale (riga ~329)**
- Ridurre gap: `space-y-4 lg:space-y-6`

### File 2: `src/components/dashboard/GuestSummaryWidget.tsx`

**Padding e titolo (riga ~31-38)**
- Ridurre padding card: `p-4 md:p-6`
- Ridurre titolo: `text-lg md:text-xl`

**Numero Coperti Stimati (riga ~60)**
- Ridurre dimensione: `text-4xl md:text-5xl`

**Griglia KPI (riga ~68)**
- Forzare 4 colonne su mobile: `grid-cols-4` (sono celle piccole, ci stanno)
- Ridurre padding celle: `p-1.5 md:p-2`
- Ridurre font numeri: `text-lg md:text-xl`

**Grafico a torta (riga ~120)**
- Ridurre altezza container: `h-[150px] md:h-[180px]`
- Ridurre raggio: `innerRadius={40} outerRadius={58}` su mobile vs `50/70` su desktop (richiede `useIsMobile`)
- Legenda piu compatta

## Risultato Atteso

Dashboard mobile piu compatta, leggibile, con tutti i dati visibili senza scrolling eccessivo. La barra del budget sara finalmente leggibile senza sovrapposizioni di testo.
