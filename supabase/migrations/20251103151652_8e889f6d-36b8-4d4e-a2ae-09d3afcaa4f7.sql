-- FASE 2: Aggiornamento Schema Database per Razionalizzazione Spese

-- 1. Aggiungi colonne a expense_items per il nuovo modello
ALTER TABLE expense_items 
  ADD COLUMN IF NOT EXISTS expense_type TEXT DEFAULT 'variable' 
    CHECK (expense_type IN ('fixed', 'variable', 'mixed')),
  ADD COLUMN IF NOT EXISTS fixed_amount NUMERIC DEFAULT NULL;

-- 2. Aggiungi calculation_mode a weddings (toggle globale)
ALTER TABLE weddings 
  ADD COLUMN IF NOT EXISTS calculation_mode TEXT DEFAULT 'planned'
    CHECK (calculation_mode IN ('planned', 'actual'));

-- 3. Migrazione dati esistenti
-- Identifica spese fisse (quelle senza line_items ma con total_amount)
UPDATE expense_items 
SET 
  expense_type = 'fixed',
  fixed_amount = total_amount
WHERE id NOT IN (
  SELECT DISTINCT expense_item_id FROM expense_line_items
) AND total_amount IS NOT NULL AND total_amount > 0;

-- Marca tutte le altre come variabili
UPDATE expense_items 
SET expense_type = 'variable'
WHERE expense_type IS NULL;

-- 4. Crea indici per performance
CREATE INDEX IF NOT EXISTS idx_expense_items_type ON expense_items(expense_type);
CREATE INDEX IF NOT EXISTS idx_weddings_calculation_mode ON weddings(calculation_mode);

-- 5. Commenti per documentazione
COMMENT ON COLUMN expense_items.expense_type IS 'Tipo di spesa: fixed (importo fisso), variable (dipende da ospiti), mixed (fisso + variabile)';
COMMENT ON COLUMN expense_items.fixed_amount IS 'Importo fisso per spese di tipo fixed o mixed';
COMMENT ON COLUMN weddings.calculation_mode IS 'Modalità di calcolo globale: planned (preventivo) o actual (effettivo da RSVP)';