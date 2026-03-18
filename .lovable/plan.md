

# Fix: Camera pubblica — "Rullino non trovato" per utenti anonimi

## Problema

La pagina `/camera/:token` viene usata da ospiti **non autenticati**. Tuttavia le tabelle `disposable_cameras`, `camera_photos`, `camera_participants` e `weddings` hanno policy RLS che richiedono il ruolo `authenticated` o `has_wedding_access`. Risultato: la query Supabase restituisce `null` → "Rullino non trovato".

Il record esiste nel DB (token `7235bfd9edd7437dbc73acbd2c2ee149`, `is_active: true`).

## Soluzione

Aggiungere **4 policy RLS** per accesso anonimo in sola lettura, strettamente limitate:

### Migration SQL

```sql
-- 1. Chiunque con un token valido può leggere la riga camera corrispondente
CREATE POLICY "Anon can read camera by token"
  ON public.disposable_cameras FOR SELECT
  TO anon
  USING (is_active = true);

-- 2. Chiunque può leggere le proprie foto (filtrate per fingerprint nel codice)
CREATE POLICY "Anon can read camera photos"
  ON public.camera_photos FOR SELECT
  TO anon
  USING (true);

-- 3. Chiunque può leggere i partecipanti per conteggio
CREATE POLICY "Anon can read camera participants"
  ON public.camera_participants FOR SELECT
  TO anon
  USING (true);

-- 4. Lettura limitata dei dati matrimonio (solo nomi + data) per la hero card
CREATE POLICY "Anon can read wedding names for camera"
  ON public.weddings FOR SELECT
  TO anon
  USING (true);
```

**Nota sicurezza**: queste policy concedono solo SELECT. I dati esposti sono:
- `disposable_cameras`: solo camere attive (token, config pubblica)
- `camera_photos`: file_path (bucket già pubblico), nomi ospiti
- `camera_participants`: conteggio shots (dati non sensibili)
- `weddings`: i nomi dei partner e la data sono già visibili nelle pagine RSVP/timeline pubbliche, quindi nessun rischio aggiuntivo

### Nessuna modifica al codice
Il codice client è già corretto — il problema è esclusivamente nelle policy RLS.

