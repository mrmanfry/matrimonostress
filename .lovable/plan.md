## Piano di fix

Obiettivo: evitare che una risposta `std_response = likely_yes` venga mostrata come se fosse una risposta all'RSVP formale.

### 1. GuestDetailView
- Separare visivamente lo stato RSVP dallo stato Save the Date.
- Nel campo `RSVP`, mostrare solo `rsvp_status`:
  - `confirmed` → “Confermato” con pallino confermato
  - `declined` → “Rifiutato” con pallino rifiutato
  - assente / `pending` → “In attesa” con pallino pending
- Nel campo `Save the date`, mantenere “Inviato/Non inviato” e, se presente `std_response`, aggiungere la risposta STD:
  - `likely_yes` → “Probabile sì”
  - `likely_no` → “Probabile no”
  - `unsure` → “Forse”

### 2. PartyDetailView
- Applicare la stessa separazione nelle righe dei membri del nucleo:
  - la mini-label principale deve rappresentare l’RSVP formale, non la risposta al Save the Date
  - se c’è una risposta STD ma RSVP è ancora pending, mostrarla come contesto separato tipo “STD: Probabile sì”
- Mantenere il percorso già corretto: se l’invito formale è inviato ma non c’è risposta RSVP, lo step resta “In attesa risposta RSVP”.

### 3. GuestStatusDot helper
- Non usare più `std_response` per trasformare automaticamente `likely_yes` in `confirmed` o `likely_no` in `declined` dove la UI sta parlando di RSVP.
- Se serve, introdurre helper locali più espliciti per evitare ambiguità tra “stato RSVP” e “risposta Save the Date”.

### Risultato atteso
Per Ariana Cristogel e casi simili: se hanno risposto “Probabile sì” al Save the Date ma non all’RSVP, il dettaglio mostrerà `RSVP: In attesa` e `Save the date: Probabile sì`, senza far sembrare che abbiano confermato l’RSVP.