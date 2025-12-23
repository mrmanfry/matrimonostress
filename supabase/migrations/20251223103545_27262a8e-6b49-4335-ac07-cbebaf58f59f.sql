-- Aggiungere colonne per gestione pasti staff sui vendors
ALTER TABLE vendors 
ADD COLUMN IF NOT EXISTS staff_meals_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS staff_dietary_notes TEXT;

-- Commenti per documentazione
COMMENT ON COLUMN vendors.staff_meals_count IS 'Numero di pasti staff richiesti per questo fornitore';
COMMENT ON COLUMN vendors.staff_dietary_notes IS 'Note alimentari per lo staff del fornitore (allergie, diete speciali)';