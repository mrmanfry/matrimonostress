
## Cosa non va oggi

**1) Il numero della proiezione è sbagliato.**
Nel DB oggi (11 lug 2026) ci sono 14 rate future per **30.019 €** e pagato per **~11.572 €** → target **~41.591 €**. L'unica rata dopo il 26 luglio è **250 € il 20 set** (saldo foto). Quindi al **23 agosto** il cumulato *deve* essere ~41.341 € (target − 250 €), non 23.597 €.

Cause probabili nel codice attuale (`MountainChart` in `src/components/budget/v2/CashflowTimeline.tsx`):
- `combinedPts` fonde `paidPts` + `futurePts` con `sort((a,b)=>a.t-b.t)` **non stabile**: quando ci sono più rate con la stessa `due_date` (es. 5 rate il 18/07) i punti step (t, cumPrima)/(t, cumDopo) si mescolano e la funzione `valueAt` legge un `cum` intermedio errato.
- L'interpolazione è **lineare** tra due punti step con timestamp diversi, ma dovrebbe essere una **staircase** (piecewise-constant): il valore al tempo *t* è il cum dell'ultima rata con `due ≤ t`. La linearità sballa tutti i valori tra due rate.
- `paidPts` estende fino a `today` con `paidEndCum`, `futurePts` inizia da `today`: al passaggio ci sono 2 punti identici che con sort instabile creano un salto artificiale.

**2) Il tooltip è povero.** Mostra solo "Proiezione €X". Serve, come chiede l'utente:
- **Cumulato totale** a quella data
- **Già pagato** a quella data (parte scura)
- **Da versare entro quella data** = Cumulato − Già pagato (il vero fabbisogno di liquidità)
- La rata specifica se il cursore è su una data di pagamento (chi/cosa/quanto)

**3) Qualità visiva scadente.** Area tratteggiata pesante, linea OGGI e Matrimonio si sovrappongono ai label mese, target label taglia il bordo, nessun gradient, nessuna curva step "clean", tick mese fitti/sovrapposti, cursore hover finisce fuori area.

---

## Piano di intervento

### A. Fix calcolo (correttezza prima di tutto)

Sostituire l'attuale `valueAt` con una funzione **staircase deterministica**:

1. Costruire un unico array `events = [...paidSorted, ...upcomingSorted]` con per ciascuno: `{ t, amount, kind: 'paid'|'future' }`.
2. Ordinare per `t` ascendente (i pagati vengono comunque tutti prima di oggi).
3. Precalcolare `cumAt(t)` come somma di `amount` di tutti gli eventi con `t ≤ t_query` — separatamente `paidCumAt(t)` (solo `kind='paid'`) e `totalCumAt(t)` (tutti).
4. Per hover a `t_query`: **niente interpolazione lineare** — restituire il cumulato al chiusura dell'ultima rata `≤ t_query`. Questo è quello che finanziariamente ha senso ("al 23 ago hai già dovuto pagare X, resta Y").
5. Rimuovere il clamp `Math.max(raw, today)` che sposta le rate scadute a oggi: falsa la staircase. Se una rata è scaduta va comunque disegnata alla sua data.

### B. Tooltip finanziario a 3 righe

Layout tooltip proposto (box ~200×95 con separatori sottili):

```text
23 ago 2026
────────────────────
Cumulato       41.341 €
Già pagato     11.572 €
Da versare     29.769 €   ← evidenziato in warn()
```

Se il cursore cade **esattamente su una data di rata**, aggiungere sotto una riga "In quella data: `Vendor · Descrizione · +€X`".

### C. Ridisegno visivo

Modifiche mirate al SVG (`MountainChart`):

1. **Curva step vera** con `stroke-linejoin: miter` e piccoli raccordi. Path paid in colore pieno `brand()`, area sotto con gradient verticale `brand() → transparent`.
2. **Curva futura** stessa forma step, tratteggio SOLO sulla linea (non sull'area); area futura con gradient più chiaro/desaturato, non pattern a righe diagonali.
3. **Marker "OGGI"**: linea sottile continua warn(), label in alto con background pill bianco per non collidere coi tick mese.
4. **Marker "Matrimonio ♥"**: stessa logica, colore ink(2), label pill bianca. Se coincide con l'ultima rata, sfalsare orizzontalmente.
5. **Asse X**: tick mese con `tickStride` calcolato sulla larghezza reale, label ruotate 0° ma con `text-anchor` intelligente per il primo/ultimo tick per non uscire dal grafico. Riga base dell'asse più marcata.
6. **Asse Y**: gridline a 25/50/75/100% con label mono; aggiungere anche label a `paidEndCum` (marker "sei qui") allineata a destra dell'area.
7. **Hover**: linea verticale sottile che va da top a bottom, cerchio doppio sul punto (contorno bianco spesso), tooltip che si flippa se vicino al bordo destro **e** al bordo alto.
8. **Padding**: aumentare `padT` a 32 per far respirare i marker OGGI/♥ e `padB` a 44 per i mesi.

### D. Micro-copy sotto il grafico

Sostituire l'attuale riga "Sei al X% del percorso" con due chip:

- `Liquidità servita fino al matrimonio` = totalFuture (tutte le rate ancora da versare)
- `Ultima rata` = data ultima rata pianificata

---

## File toccati

- `src/components/budget/v2/CashflowTimeline.tsx` — riscrittura di `MountainChart` (calcolo + rendering + tooltip). Nessuna modifica ai dati a monte, nessun cambio di API del componente.

## Note tecniche

- Nessuna modifica alle aggregazioni (`buildVendors`, `paymentCashAmount`): i numeri arrivano già corretti; il bug è puramente nella funzione `valueAt` del grafico.
- Nessuna dipendenza esterna (Recharts/Visx). Restiamo su SVG puro come già è.
- Zero impatto su performance: gli eventi sono decine, non migliaia.

## Verifica dopo l'implementazione

1. Ripetere l'hover sul **23 ago 2026** → deve mostrare Cumulato ≈ 41.341 €, Già pagato ≈ 11.572 €, Da versare ≈ 29.769 €.
2. Hover **oggi (11 lug)** → Cumulato = Già pagato ≈ 11.572 €, Da versare = 0.
3. Hover **20 set** → Cumulato = target, Da versare = 30.019 €.
4. Hover su un giorno tra due rate consecutive (es. 22 lug tra 20 e 24) → il valore deve essere costante fino alla prossima rata, non "salire" linearmente.
