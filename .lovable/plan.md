# "Vedi tutto" — Cronologia completa attività

## Comportamento attuale
Nella card *Attività recente* (tab Panoramica di `/app/invitations`):
- Mostra max **6** attività più recenti (slice in `recentActivity`, riga 229).
- Il link **"Vedi tutto →"** porta direttamente a `/app/guests`, ma l'utente non vede mai lo storico completo delle attività perché in Invitati non esiste una vista timeline.

## Cosa cambia

1. **Rimuovere il limite di 6 nel calcolo** — costruire la lista completa di attività (mantenendo dedupe + ordinamento per data desc). La card in Panoramica continua comunque a mostrarne solo 6 (`.slice(0,6)` spostato nel render).

2. **Trasformare "Vedi tutto →" in apertura dialog** invece che navigazione diretta. Il dialog (`Dialog` di shadcn) mostra:
   - Titolo: *"Cronologia attività"*
   - Sottotitolo: *"Tutte le risposte ricevute da invitati e nuclei"*
   - Lista scrollabile (max-height ~70vh) con lo **stesso stile** delle righe attuali (avatar iniziali + testo + pallino colorato + tempo relativo).
   - Eventuale stato vuoto se non ci sono attività oltre alle 6 mostrate.

3. **Footer del dialog**: un pulsante secondario **"Vai agli invitati →"** che chiude il dialog e naviga a `/app/guests`, così l'utente può approfondire / agire sui singoli ospiti.

## Dettagli tecnici

File toccato: `src/pages/Invitations.tsx`.

- `recentActivity` (riga 175-231): restituire l'array completo ordinato; rimuovere `.slice(0, 6)` dal `useMemo`.
- Render card (riga 559-598): usare `recentActivity.slice(0, 6).map(...)`.
- Nuovo state `const [activityDialogOpen, setActivityDialogOpen] = useState(false)`.
- Il bottone "Vedi tutto →" → `onClick={() => setActivityDialogOpen(true)}` (non più `navigate`).
- Nuovo componente inline `Dialog` (già usato altrove nel file) con la lista completa, riusando il markup riga 572-594 estratto in un piccolo helper locale `ActivityRow` per evitare duplicazione.
- Footer dialog: `Button variant="outline"` con `onClick={() => { setActivityDialogOpen(false); navigate("/app/guests"); }}`.

Nessuna modifica a dati / query / business logic — solo presentation layer.
