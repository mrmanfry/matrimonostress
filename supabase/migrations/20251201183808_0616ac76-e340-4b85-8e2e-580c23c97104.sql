-- Aggiunta colonne per target ospiti globali a livello wedding
-- Questi valori rappresentano i numeri target/pianificati che vengono usati
-- come default per tutte le spese variabili nel budget

ALTER TABLE weddings 
ADD COLUMN IF NOT EXISTS target_adults INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS target_children INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS target_staff INTEGER DEFAULT 0;

-- Commento: target_adults/children/staff sono i valori DEFAULT globali
-- che vengono usati per calcolare le spese variabili.
-- I singoli expense_items possono ancora avere override specifici 
-- nei loro campi planned_adults/children/staff se necessario.