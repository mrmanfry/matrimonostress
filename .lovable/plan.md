
## Cosa farò

Applico la migration `20260608120000_gifts_simulator.sql` tramite il tool di migration di Lovable Cloud (non dal SQL Editor di Supabase), così resta tracciata nel repo e i types TypeScript vengono rigenerati automaticamente.

Prima di eseguirla risolvo **3 problemi** che ho trovato leggendo il file:

### 1. Mancano i `GRANT` sulla tabella `gifts` 🔴 bloccante
Su Lovable Cloud le tabelle `public` non ricevono privilegi di default. Senza `GRANT` la pagina Regali caricherebbe ma **ogni query restituirebbe "permission denied"** — esattamente il sintomo che lo sviluppatore ti ha descritto come "non salverà nulla", ma in realtà non leggerebbe nemmeno. Aggiungo:
```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gifts TO authenticated;
GRANT ALL ON public.gifts TO service_role;
```

### 2. La RPC `get_gift_forecast` è un buco di sicurezza 🔴 critico
È `SECURITY DEFINER` ma **non verifica che l'utente abbia accesso al `wedding_id` passato**. Chiunque autenticato potrebbe chiamarla con un wedding_id altrui e ottenere cash ricevuto, spese totali e nuclei eleggibili di un altro matrimonio. Aggiungo il check `has_wedding_access(auth.uid(), p_wedding_id)` in cima alla funzione + `GRANT EXECUTE ... TO authenticated`.

### 3. Allineamento ruoli da confermare ⚠️
La policy RLS limita l'accesso ai soli `co_planner` (la coppia). Ma nel resto dell'app i **`planner`** (wedding planner B2B) hanno accesso al budget, e i regali sono parte della tesoreria. Due opzioni:
- **A**: Lascio come scritto (solo coppia vede i regali — sono dati sensibili, il planner non li gestisce).
- **B**: Allargo a `planner` come fa il budget, così il wedding planner può aiutare a tracciarli.

## Domanda per te

Prima di lanciare la migration devo sapere la scelta sul punto 3.

## Nota tecnica
Non tocco il file `.sql` esistente nel repo (resta come riferimento storico del branch); creo una nuova migration con le correzioni — è il modo corretto di gestire migrazioni versionate su Lovable Cloud.
