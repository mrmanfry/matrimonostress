
# Semplificazione Pagina Invitati

## Problema Identificato

La pagina ha **6 livelli di informazioni** prima della lista invitati vera e propria:

1. **5 Funnel KPI Cards** (Da Lavorare / STD Inviato / Invitati / Confermati / Rifiutati) -- scrollabili orizzontalmente
2. **3 Stats Cards** (Coperti / Nuclei / No Tel.)
3. **2 Alert Warnings** (senza telefono + non raggruppati)
4. **Analytics Dashboard completa** (4 tab con grafici, donut chart, KPI)
5. **Barra di ricerca + filtri configurabili**
6. Finalmente la **lista invitati**

Su mobile bisogna scrollare parecchio prima di vedere un invitato. Il funnel "Da Lavorare -> STD -> Invitati -> Confermati" usa termini tecnici ("STD", "funnel", "awareness") che non sono intuitivi.

## Soluzione: Approccio "Progressive Disclosure"

### 1. Semplificare il Funnel KPI (FunnelKPICards.tsx)

Rinominare le card con linguaggio naturale e aggiungere un sottotitolo esplicativo:

| Prima | Dopo | Spiegazione |
|-------|------|-------------|
| "Da Lavorare" | "Da Contattare" | Chi non ha ancora ricevuto nulla |
| "STD Inviato" | "Save the Date" | Chi ha ricevuto il pre-invito |
| "Invitati" | "Invito Inviato" | Chi ha ricevuto l'invito formale |
| "Confermati" | "Confermati" | (invariato) |
| "Rifiutati" | "Non Vengono" | Meno "burocratico" |

Aggiungere un mini-header sopra le card: **"Il tuo percorso inviti"** con una freccia visiva che suggerisce la progressione sinistra-destra.

### 2. Eliminare le 3 Stats Cards secondarie (righe 1179-1208)

I dati "Coperti / Nuclei / No Tel." sono ridondanti:
- **Coperti**: gia presente nella Dashboard
- **Nuclei**: dato tecnico, poco azionabile
- **No Tel.**: gia presente nell'alert warning sotto

Rimuoverle completamente. Il conteggio totale invitati va nel header della pagina accanto a "Invitati" (es. "Invitati (188)").

### 3. Nascondere Analytics Dashboard di default su mobile

La dashboard analitica con 4 tab e grafici e potentissima ma su mobile schiaccia tutto. Soluzione:
- **Mobile**: nascondere completamente la sezione `GuestAnalyticsDashboard`, sostituendola con un piccolo pulsante "Vedi Statistiche" che apre un bottom sheet
- **Desktop**: mantenerla ma in un `Collapsible` chiuso di default, apribile con "Mostra Analisi Dettagliata"

### 4. Compattare i Warning (righe 1211-1246)

Unire i 2 alert in un'unica riga compatta solo se entrambi presenti:
- "38 senza telefono -- 12 non raggruppati" con link inline (Sincronizza / AI Grouping)
- Se solo uno dei due, mostrarlo come riga singola senza il box Alert giallo

### 5. Riordinare il layout

Il nuovo ordine verticale diventa:

```text
[Header: "Invitati (188)"]
[Funnel KPI: 5 pillole con frecce di progressione]
[Warning compatto: "38 senza tel. -- Sincronizza"]
[Ricerca + Filtri]
[Lista Invitati]
```

Rispetto a prima si eliminano 2 sezioni intere (stats cards + analytics dashboard inline) e si compatta 1 (warnings).

## Dettaglio Tecnico

### File: `src/pages/Guests.tsx`

**Header (righe 1068-1077)**
- Aggiungere il conteggio totale nel titolo: `Invitati ({allGuests.length})`

**Rimuovere Stats Cards (righe 1179-1208)**
- Eliminare l'intero blocco `grid grid-cols-3` con Coperti/Nuclei/No Tel.

**Analytics Dashboard (righe 1248-1294)**
- Mobile: sostituire con un `Button` "Vedi Statistiche" che setta uno state `analyticsSheetOpen`, aprendo un `Sheet` (bottom sheet) con dentro il `GuestAnalyticsDashboard`
- Desktop: wrappare in un `Collapsible` chiuso di default con trigger "Analisi Dettagliata"

**Warnings (righe 1210-1246)**
- Unire in una singola riga con `div flex` e separatore `·`, senza il componente `Alert` pesante. Solo testo con link inline.

### File: `src/components/guests/FunnelKPICards.tsx`

**Label rename (righe 83-140)**
- `Da Lavorare` -> `Da Contattare`
- `STD Inviato` -> `Save the Date`
- `Invitati` -> `Invito Inviato`
- `Rifiutati` -> `Non Vengono`
- Rimuovere `description` sotto le card su mobile (gia fatto) e anche su desktop: le label rinominate sono auto-esplicative

**Aggiungere frecce di progressione**
- Tra ogni card, aggiungere un piccolo `ChevronRight` (nascosto su mobile per spazio) per suggerire la direzione del flusso

### File: `src/components/guests/GuestAnalyticsDashboard.tsx`

- Nessuna modifica interna. Solo il modo in cui viene montato cambia (Sheet su mobile, Collapsible su desktop).

### Nessuna modifica al DB. Solo riorganizzazione del rendering.
