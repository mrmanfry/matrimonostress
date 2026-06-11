## Cosa sta succedendo (diagnosi dei 3 numeri)

I numeri divergono perché ogni widget conta cose diverse:

| Posto | Numero | Cosa conta davvero |
|---|---|---|
| **Pie chart "Confermati"** (Riepilogo Invitati) | es. ~110 | Ospiti `rsvp_status='confirmed'` (adulti **+ bambini**) **+ sposi** (`coupleCount`). Sorgente: `useGuestMetrics.confirmedHeadCount + coupleCount` |
| **Bottone "Confermati" del selettore Scenario** | **102** | Solo **adulti** confermati (`guestCounts.confirmed.adults`). Esclude bambini e sposi. Sorgente: `Dashboard.tsx` riga 197-201 |
| **Bottone "Lista invitati"** | **164** | Solo **adulti** in lista non-staff non-sposi. Esclude bambini. Sorgente: `expectedCalculator.adults` |
| **Bottone "Pianificato"** | **170** | Valore manuale `weddings.target_adults` (fallback 100 se nullo). NON è calcolato dalla lista — è il target che hai impostato a mano nella ScenarioHeadcountBar / setup matrimonio |

Causa radice: `ScenarioSelector.tsx` riga 47 mostra `counts.adults` invece dell'headcount totale dello scenario. Il pie chart invece somma tutto. Quindi due fonti che dovrebbero coincidere sembrano contraddirsi.

## Piano di intervento

### 1. Uniformare il numero mostrato sui bottoni scenario
In `src/components/budget/v2/ScenarioSelector.tsx` riga 47, cambiare:
```
const n = counts?.[it.id]?.adults ?? 0;
```
in:
```
const c = counts?.[it.id];
const n = c ? c.adults + c.children : 0;  // coperti "ospiti" (adulti+bambini)
```
Così "Confermati 102" diventa "Confermati = adulti+bambini confermati" e si allinea con il segmento verde del grafico (al netto degli sposi, che vengono mostrati a parte come "Sposi: 2" nel widget).

### 2. Allineare anche il pie chart alla stessa base
In `GuestSummaryWidget.tsx` riga 29, togliere `+ metrics.coupleCount` dal segmento "Confermati" del grafico RSVP. Gli sposi sono già evidenziati nel riquadro "Sposi" sopra: includerli nel pie crea la differenza che vedi. Risultato: il "Confermati" del pie e quello del bottone Scenario coincideranno (es. entrambi 102).

### 3. Rendere esplicita l'origine di "Pianificato"
"Pianificato 170" arriva da `weddings.target_adults` (target manuale). Oggi però il selettore mostra solo `adults`, ed è facile confonderlo con "in lista". Due opzioni — scegli quale preferisci:
  - **A (consigliata):** Aggiungere un tooltip già presente (`hint`) e mostrare un piccolo "≈" davanti al numero pianificato per indicare che è una stima manuale, non una somma reale.
  - **B:** Lasciare invariato e contare su tooltip esistenti.

### 4. Verifica
Dopo la modifica, sul tuo dato:
- Pie "Confermati" = `bottone Confermati` (es. 102)
- "Lista invitati" = totale adulti+bambini in lista (sarà probabilmente >164 perché ora include i bambini)
- "Pianificato" = `target_adults + target_children` impostati (sarà coerente con la stima del coperto, non più solo adulti)

## Domanda prima di procedere

Confermi che:
- (a) i bottoni scenario devono mostrare **adulti+bambini** (coperti ospiti, sposi a parte), e
- (b) il pie chart "Confermati" deve **escludere** gli sposi (che sono già nel riquadro "Sposi")?

Se sì procedo con i 3 step. Se invece preferisci che TUTTI i numeri includano gli sposi (visione "coperti totali catering"), inverto la logica: aggiungo +couple ai bottoni Scenario invece di toglierlo dal pie.