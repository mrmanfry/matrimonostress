

## Piano: Fix Mobile per Dialog "Open Bar" (ExpenseItemTabs)

### Problema

Quando si apre una spesa (es. "Open bar") dalla tab Spese su mobile, il dialog `ExpenseItemTabs` presenta gravi problemi di layout:

1. **Dialog troppo largo**: usa `max-w-6xl` (1152px) dentro un viewport di 390px
2. **Griglia a 12 colonne**: `ExpenseLineRow` usa `grid-cols-12` con 7-8 colonne di input affiancate -- completamente illeggibile su mobile
3. **Labels sotto ogni riga**: le etichette (Descrizione, Prezzo Unitario, Tipo Quantita'...) ripetute sotto ogni riga occupano spazio inutile
4. **ExpenseSummaryCard**: testi "Totale Pianificato (Preventivo)" troppo lunghi per mobile

### Soluzione

Convertire il dialog in un **Drawer bottom-sheet** su mobile (come fa gia' il progetto in altri punti), e riformattare `ExpenseLineRow` in un layout a **stack verticale** su mobile.

### Modifiche

#### 1. `ExpenseItemTabs.tsx` -- Drawer su mobile

- Importare `useIsMobile()` e il componente `Drawer`
- Su mobile: renderizzare come `Drawer` (bottom-sheet a schermo pieno con `max-h-[95vh]`)
- Su desktop: mantenere il `Dialog` con `max-w-6xl` attuale
- Il contenuto interno (Tabs) resta identico

#### 2. `ExpenseLineRow.tsx` -- Layout verticale su mobile

- Su mobile: sostituire la griglia 12 colonne con un layout a **card verticale**:
  - Riga 1: Descrizione (full width) + bottone elimina
  - Riga 2: Prezzo unitario + Tipo quantita' + Quantita' affiancati (3 colonne)
  - Riga 3: Sconto + IVA + Totale affiancati (3 colonne)
  - Ogni campo ha la propria label sopra
- Su desktop: mantenere la griglia 12 colonne attuale
- Usare `useIsMobile()` per switch

#### 3. `ExpenseSpreadsheetTab.tsx` -- Compattare su mobile

- "Righe di Costo" + "Aggiungi Riga": stack verticale su mobile
- Info box "Modalita' di Calcolo Attiva": testo piu' compatto su mobile
- Grid conteggi ospiti: da `grid-cols-3` a `grid-cols-1` su mobile

#### 4. `ExpenseSummaryCard.tsx` -- Testi compatti

- Su mobile: abbreviare le label ("Pianificato" invece di "Totale Pianificato (Preventivo)")
- Font size ridotto da `text-lg`/`text-xl` a `text-base`/`text-lg`

### File da Modificare

| File | Modifica |
|------|----------|
| `src/components/vendors/ExpenseItemTabs.tsx` | Dialog -> Drawer su mobile |
| `src/components/vendors/ExpenseLineRow.tsx` | Grid 12 col -> stack verticale su mobile |
| `src/components/vendors/ExpenseSpreadsheetTab.tsx` | Layout compatto su mobile |
| `src/components/vendors/ExpenseSummaryCard.tsx` | Testi abbreviati su mobile |

### Dettagli Tecnici

- Usare `useIsMobile()` da `@/hooks/use-mobile`
- Componente `Drawer` gia' disponibile in `@/components/ui/drawer`
- Pattern Drawer/Dialog gia' usato nel progetto (il Drawer usa `vaul` con bottom-sheet nativo)
- Nessuna modifica alla logica di calcolo o al flusso dati
- Desktop rimane invariato

