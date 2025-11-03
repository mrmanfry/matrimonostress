-- Add new columns for balance_base and percentage_base
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS balance_base text CHECK (balance_base IN ('planned', 'actual')),
ADD COLUMN IF NOT EXISTS percentage_base text CHECK (percentage_base IN ('planned', 'actual'));

-- Update amount_type constraint to include 'balance'
ALTER TABLE payments
DROP CONSTRAINT IF EXISTS payments_amount_type_check;

ALTER TABLE payments
ADD CONSTRAINT payments_amount_type_check CHECK (amount_type IN ('fixed', 'percentage', 'balance'));

-- Add comment to explain the new fields
COMMENT ON COLUMN payments.balance_base IS 'For balance type payments: which total to settle (planned or actual)';
COMMENT ON COLUMN payments.percentage_base IS 'For percentage type payments: which total to calculate from (planned or actual)';