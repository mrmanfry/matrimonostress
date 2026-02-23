

# Ottimizzazione Grafico a Torta Budget per Mobile

## Problemi Rilevati

Dallo screenshot su viewport 390px:
1. **Le label sul grafico si sovrappongono** tra loro e alla legenda ("Location: 13%", "Fioraio: 6%", "Musica per location" si accavallano)
2. **La legenda occupa troppo spazio verticale** con 10+ categorie disposte su piu righe
3. **Il raggio del grafico (outerRadius=80) e troppo grande** per lo spazio disponibile su mobile, lasciando poco margine per le label

## Soluzione

### Approccio: Rimuovere le label dal grafico su mobile, usare solo la legenda + tooltip

Su mobile le label direttamente sul grafico non funzionano con molte categorie. La soluzione e:

1. **Nascondere le label interne al grafico su mobile** - usare `useIsMobile()` per disattivare `label` e `labelLine` su schermi piccoli
2. **Ridurre il raggio** del grafico su mobile (`outerRadius` da 80 a 70)
3. **Ridurre l'altezza** del container su mobile (da 300px a 250px)
4. **Semplificare la legenda** su mobile usando un layout piu compatto
5. **Mantenere il Tooltip** attivo cosi l'utente puo toccare una fetta per vedere nome e valore

### Dettaglio Tecnico

**File: `src/pages/BudgetLegacy.tsx`**

- Importare `useIsMobile` da `@/hooks/use-mobile`
- Nel componente `PieChart` (riga ~542-566):
  - `label`: impostare a `false` su mobile, mantenere la funzione custom su desktop
  - `labelLine`: impostare a `false` su mobile
  - `outerRadius`: 70 su mobile, 80 su desktop
  - `ResponsiveContainer height`: 250 su mobile, 300 su desktop
- La griglia categorie sotto il grafico (riga ~569) resta invariata: e gia responsive con `md:grid-cols-2 lg:grid-cols-3`

Nessuna modifica al DB. Solo cambiamenti UI nel rendering del grafico.

