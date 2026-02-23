

## Piano: Ottimizzazione Mobile Pagina Invitati (Apple-Style)

### Problema Attuale

La pagina Guests su mobile e' sovraccarica di informazioni:
- 5 KPI card orizzontali scrollabili (troppi colori, font piccoli)
- 3 stats card secondarie (ridondanti con le KPI)
- Analytics Dashboard con grafici a torta e barre (troppe informazioni, troppi colori)
- 2 alert banner (telefono mancante + invitati non raggruppati)
- Barra filtri complessa
- Card invitati dense con molti badge colorati (campaign badges, group tags, +1 badges, status strips)

### Filosofia di Design

Ispirarsi a iOS: **informazione progressiva**, superfici pulite, tipografia come ornamento, colori usati con parsimonia e solo per comunicare stato.

### Modifiche Proposte

#### 1. Header Compatto + Counter Unico (`Guests.tsx`)

Sostituire le 3 stats card secondarie con un singolo counter inline nell'header:

```
Invitati                    [+ FAB]
142 coperti · 38 nuclei
```

Eliminare completamente le 3 card "Coperti / Nuclei / No Tel." su mobile. Sono ridondanti con le funnel KPI.

#### 2. Funnel KPI Cards Semplificate (`FunnelKPICards.tsx`)

- Ridurre le card a **una riga compatta** su mobile: solo numero + label, senza icone, senza background colorato
- Usare un layout a "pill" orizzontale, non card:

```
Da Lavorare 12  ·  STD 45  ·  Invitati 8  ·  OK 30  ·  No 3
```

- Sfondo neutro, testo monocromatico, solo il numero attivo evidenziato

#### 3. Nascondere Analytics Dashboard su Mobile (`Guests.tsx`)

La `GuestAnalyticsDashboard` con i suoi grafici a torta e barre va nascosta su mobile. E' troppa informazione. L'utente mobile vuole **agire**, non analizzare. Si puo' rendere accessibile tramite un bottone "Vedi Statistiche" che apre un bottom sheet.

#### 4. Compattare gli Alert (`Guests.tsx`)

Unificare i 2 alert (telefono mancante + non raggruppati) in **un singolo banner** discreto su mobile, con testo piu' corto.

#### 5. Card Invitato Singolo Pulita (`GuestSingleCard.tsx`)

Semplificare drasticamente su mobile:
- Rimuovere la riga telefono (informazione secondaria, visibile in edit)
- Nascondere il toggle "+1" (spostarlo nell'edit dialog)
- Mostrare solo: **Nome**, **1 badge di stato** (il piu' importante tra campaign badges), e il **bottone edit**
- Rimuovere badge alias, badge bambino, badge gruppo su mobile (sono nel dettaglio)
- Ridurre padding e spacing

Layout mobile target:
```
[x] Mario Rossi          [STD badge]  [pencil]
```

#### 6. Card Nucleo Pulita (`GuestNucleoCard.tsx`)

Semplificare su mobile:
- Collassare la lista membri: mostrare solo il **nome nucleo**, **conteggio** (3 adulti, 1 bambino), e **1 badge di stato**
- Rimuovere la strip colorata laterale (usa spazio e aggiunge colore)
- Nascondere badge gruppo, badge +1, badge discrepanza STD su mobile
- Nascondere icone STD/response individuali per ogni membro
- Nascondere switch +1 per ogni membro
- Mostrare i membri in modo piu' compatto: solo nome, senza alias/phone/badges

Layout mobile target:
```
[x] Fam. Rossi           [STD badge]  [pencil]
    3 adulti, 1 bambino
```

#### 7. Barra Ricerca + Filtri (`Guests.tsx`)

- Nascondere il bottone "Campagna RSVP" su mobile (gia' nel FAB dropdown)
- Solo la barra di ricerca + icona filtro che apre il bottom sheet

### File da Modificare

| File | Modifica |
|------|----------|
| `src/pages/Guests.tsx` | Nascondere stats card, analytics dashboard, alert compatti su mobile. Semplificare header. Nascondere bottone campagna. |
| `src/components/guests/FunnelKPICards.tsx` | Layout "pill" compatto su mobile |
| `src/components/guests/GuestSingleCard.tsx` | Card minimale su mobile: solo nome + 1 badge + edit |
| `src/components/guests/GuestNucleoCard.tsx` | Card compatta su mobile: nome nucleo + conteggio + 1 badge + edit. Membri collassati. |
| `src/components/guests/GuestCampaignBadges.tsx` | Modalita' "ultra-compact" per mobile: singolo dot/emoji invece di badge completo |

### Dettagli Tecnici

**Approccio**: usare `useIsMobile()` gia' presente e classi Tailwind responsive (`md:` prefix) per differenziare mobile/desktop. Non si cambiano le viste desktop.

**FunnelKPICards mobile**: Sostituire le `Card` con semplici `button` con stile pill (`rounded-full px-3 py-1 text-xs`), sfondo `bg-muted` e testo `text-muted-foreground`. Solo il filtro attivo avra' `bg-primary text-primary-foreground`.

**GuestSingleCard mobile**: Wrappare i contenuti secondari (phone, +1 toggle, alias badge, child badge, group badge) in `<div className="hidden md:flex">`. Mantenere solo nome + campaign badge (con prop `ultraCompact`) + edit button.

**GuestNucleoCard mobile**: Aggiungere uno state `collapsed` (default `true` su mobile) che nasconde la lista membri. Mostrare solo header con nome, conteggio compatto, e badge campagna. Tap per espandere.

**GuestCampaignBadges**: Aggiungere prop `ultraCompact` che mostra solo un singolo dot colorato (verde = confermato, viola = STD, blu = invitato, grigio = da lavorare) senza testo.

### Risultato Atteso

- La pagina mobile passa da "dashboard analitica" a "lista di contatti pulita"
- Riduzione del 70% dei colori visibili su mobile
- Ogni card occupa circa 44-48px di altezza (vs ~120px attuali)
- L'utente puo' scorrere e agire rapidamente
- Tutte le informazioni dettagliate restano accessibili tramite tap (edit dialog, espansione nucleo)

