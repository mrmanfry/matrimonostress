

## Piano: Ottimizzazione Mobile VendorDetails (Apple-Style)

### Problemi Attuali (visibili dallo screenshot)

1. **Hero Card**: L'avatar 96x96px occupa troppo spazio verticale su mobile. Nome, badge, bottone "Modifica Profilo" e contatti sono impilati con troppo padding
2. **Tabs**: Le 4 tab con testo completo ("Spese & Pagamenti", "Documenti", "Appuntamenti", "Checklist") traboccano orizzontalmente -- si vede "App..." troncato
3. **VendorExpensesWidget**: Il titolo "Gestione Spese e Pagamenti" con il toggle a 3 modalita' (Plan./Prev./Conf.) + i conteggi coperti occupa troppo spazio
4. **ExpenseItemsManager**: Le card spesa con i totali pagato/da pagare in grid 2 colonne sono strette
5. **Dettagli fiscali** (Ragione Sociale, P.IVA, IBAN): Visibili nella hero card, informazione secondaria che occupa spazio

### Modifiche Proposte

#### 1. Hero Card Compatta (`VendorDetails.tsx`)

- Avatar ridotto a 56x56px su mobile (da 96x96)
- Layout header in una riga: avatar + nome + status badge affiancati
- Bottone "Modifica Profilo" diventa un icon-only button (solo icona matita) su mobile
- Contatti (telefono, email, referente) in riga compatta con solo icone cliccabili su mobile
- **Nascondere i dettagli fiscali** (Ragione Sociale, P.IVA, IBAN, Intestatario) su mobile -- sono accessibili dal dialog di modifica
- Nascondere le note su mobile -- accessibili dal dialog di modifica
- Ridurre padding card da p-6 a p-4 su mobile

#### 2. Tabs Solo Icone su Mobile (`VendorDetails.tsx`)

- Su mobile: mostrare solo le icone (CreditCard, FileText, CalendarCheck, ListTodo) senza testo
- Rimuovere `space-x-8` su mobile e distribuire equamente con `justify-around`
- Ridurre lo spazio tra tabs e contenuto

#### 3. VendorExpensesWidget Compatta (`VendorExpensesWidget.tsx`)

- Su mobile: nascondere il titolo "Gestione Spese e Pagamenti" (ridondante con la tab)
- Toggle modalita' (Plan/Prev/Conf) piu' compatto: nascondere i conteggi dettagliati su mobile, mostrare solo le pill

#### 4. ExpenseItemsManager Compatta (`ExpenseItemsManager.tsx`)

- "TOTALE FORNITORE" con font piu' piccolo su mobile
- Card Importo Pagato / Da Pagare: passare da grid-cols-2 a stack verticale compatto su mobile, senza bordi colorati -- solo testo con dot colorato

### File da Modificare

| File | Modifica |
|------|----------|
| `src/pages/VendorDetails.tsx` | Hero compatta, tabs icon-only, avatar piccolo, dettagli fiscali/note nascosti su mobile |
| `src/components/vendors/widgets/VendorExpensesWidget.tsx` | Header piu' compatto su mobile, titolo nascosto |
| `src/components/vendors/ExpenseItemsManager.tsx` | Totali compatti su mobile |

### Dettagli Tecnici

- Usare `useIsMobile()` hook gia' presente nel progetto
- Classi Tailwind responsive (`md:` prefix) dove possibile
- Nessuna modifica alla vista desktop
- Le informazioni nascoste su mobile (dettagli fiscali, note) restano accessibili tramite il dialog "Modifica Profilo"

