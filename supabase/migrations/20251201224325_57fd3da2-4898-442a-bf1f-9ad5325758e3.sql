-- Aggiorna il campo calculation_mode per supportare 3 modalità
ALTER TABLE weddings 
  DROP CONSTRAINT IF EXISTS weddings_calculation_mode_check;

ALTER TABLE weddings
  ADD CONSTRAINT weddings_calculation_mode_check 
  CHECK (calculation_mode IN ('planned', 'expected', 'confirmed'));

-- Migra i dati esistenti da 'actual' a 'expected' (logica più conservativa)
UPDATE weddings 
SET calculation_mode = 'expected' 
WHERE calculation_mode = 'actual';

COMMENT ON COLUMN weddings.calculation_mode IS 'Modalità di calcolo: planned (target contrattuali), expected (lista invitati - declined), confirmed (solo RSVP confermati)';
