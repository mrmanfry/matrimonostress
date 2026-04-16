

L'utente conferma le tre fasce ma vuole semplificare l'approccio: niente "età precisa", solo tre tier funzionali. Aggiorno il piano di conseguenza.

## Piano aggiornato: Fix Catering RSVP + 3 fasce semplici

### Le tre fasce (semplificate)
- **Adulto** (default, `is_child = false`)
- **Bambino** (`is_child = true`, `child_age_group = 'kid'`) — paga mezzo coperto / menu bimbi
- **Sotto i 3 anni** (`is_child = true`, `child_age_group = 'infant'`) — non paga coperto

Solo due valori in DB per `child_age_group`: `'infant'` o `'kid'` (NULL = retrocompatibilità → trattato come "kid").

### Modifiche

**1. Bug RSVP Catering (priorità massima)**

`src/pages/Catering.tsx` riga 92-102 — invertire la priorità:
```ts
const deriveRsvpStatus = (guestRsvp, partyId) => {
  if (isConfirmed(guestRsvp)) return "confirmed";
  if (isDeclined(guestRsvp)) return "declined";
  // solo se pending, eredita dal nucleo
  if (partyId && partyStatusMap.has(partyId)) {
    const ps = partyStatusMap.get(partyId)!;
    if (isConfirmed(ps)) return "confirmed";
    if (isDeclined(ps)) return "declined";
  }
  return "pending";
};
```
**Effetto**: Mariapaola (declined) sparisce dai confermati. Andrea/Bianca/Benedetta restano pending.

**2. Migrazione DB**
Aggiungere colonna `child_age_group TEXT` su `guests` (nullable, valori previsti: `'infant'` | `'kid'`).

**3. UI di editing**
In `GuestEditDialog.tsx` (e `GuestDialog.tsx` per coerenza): quando `is_child = true`, mostrare un toggle/radio compatto con due opzioni:
- ☐ Sotto i 3 anni (no coperto)
- ☑ Bambino (menu bimbi)

Default: "Bambino".

**4. Visualizzazione Catering**

| File | Modifica |
|------|----------|
| `CateringGuestTable.tsx` | Colonna "Tipo": badge "Adulto" / "Bambino" / "<3 anni" |
| `CateringKPIs.tsx` | KPI confermati: `X adulti · Y bambini · Z <3 anni` |
| `CateringByTable.tsx` | Mostrare suddivisione per tavolo |
| `CateringExportMenu.tsx` | Includere fascia in CSV/PDF |

**5. Verifica Tables/Conteggi**
Controllo `Tables.tsx` per assicurare che il filtro confermati usi la stessa logica corretta (priorità al guest singolo, non al nucleo).

### File NON toccati
- `rsvp-handler` edge function (i dati sono già corretti in DB)
- Logica capacità tavoli (i bambini <3 occupano comunque un posto se in braccio? → da chiarire dopo, per ora niente impatto su capacità)

### Verifica post-implementazione
1. Mariapaola Bianchi (declined) NON deve più apparire nel catering né nei tavoli come confermata
2. Tavolo 17 nucleo Baglioni: solo 3 confermati (Luca, Elena Sofia, Ettore Amedeo)
3. Andrea/Bianca/Benedetta/Sandra/Francesca: stato "pending"
4. Modificando un bimbo esistente, posso scegliere "Sotto i 3 anni" o "Bambino"
5. KPI catering mostra le tre categorie separate

