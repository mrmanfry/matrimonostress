-- Add tracking columns for payment completion details
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS paid_by TEXT,
ADD COLUMN IF NOT EXISTS paid_on_date DATE;

COMMENT ON COLUMN payments.paid_by IS 'Who made the payment (e.g., "Noi Sposi", "Genitori Sposa", "Genitori Sposo", or custom text)';
COMMENT ON COLUMN payments.paid_on_date IS 'Actual date when payment was made (populated when status changes to "Pagato")';