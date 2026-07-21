# Bug: nome nucleo disallineato con nome ospite

## Causa

Ci sono **due campi separati** in database:
- `guests.first_name` + `guests.last_name` → il nome dell'ospite (fonte di verità)
- `invite_parties.party_name` → un'etichetta testuale del nucleo, salvata una volta sola all'import/creazione

La sezione **Regali** (e altre viste per-nucleo) mostrano `party_name`. Quando correggi il cognome sulla scheda ospite, `guests.last_name` viene aggiornato ma `invite_parties.party_name` resta invariato.

Caso reale: la guest è `Marina Castrini` (corretta), ma il nucleo è ancora `Marina Castroni` (typo originario).

## Soluzione

Sincronizzare automaticamente `party_name` quando si tratta di un nucleo mono-persona, e allineare il nucleo di Marina.

### 1. Data fix immediato
Aggiornare `invite_parties.party_name` = `Marina Castrini` per il nucleo `8270474c-…`.

### 2. Trigger di sync (nuovo)
Trigger su `guests AFTER UPDATE OF first_name, last_name`:
- se il nucleo ha **un solo membro non-coppia**, ricalcola `party_name` come `TRIM(first_name || ' ' || last_name)`.
- se il nucleo ha più membri, non tocca nulla (il nome del nucleo è un'etichetta di famiglia, non riducibile a un singolo ospite).

Trigger anche su `guests AFTER INSERT/DELETE` sul `party_id`, per lo stesso motivo: quando un nucleo torna a 1 membro dopo eliminazione, si allinea il nome.

### 3. UI (opzionale, ma consigliato)
Nell'elenco Regali mostrare come titolo del nucleo la lista dei nomi effettivi (`guests`) quando il `party_name` diverge dal set dei membri. In alternativa: pulsante "Sincronizza nome nucleo" nella scheda del nucleo. Facciamo solo il trigger per ora — riduce il rischio di regressione UI.

## File toccati

- Migrazione DB: UPDATE mirato + funzione + trigger su `public.guests`.
- Nessuna modifica frontend necessaria per il fix (la UI leggerà il valore aggiornato).

## Fuori scopo

- Rinomina bulk di tutti i nuclei "obsoleti" del progetto: non tocchiamo nuclei multi-membro per non sovrascrivere etichette di famiglia (es. "Famiglia Rossi").
