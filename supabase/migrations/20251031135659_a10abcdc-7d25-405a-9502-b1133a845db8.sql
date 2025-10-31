-- Add fields to expense_items for top-down expense management
ALTER TABLE expense_items
ADD COLUMN total_amount numeric,
ADD COLUMN amount_is_tax_inclusive boolean DEFAULT true,
ADD COLUMN tax_rate numeric;

COMMENT ON COLUMN expense_items.total_amount IS 'Contract total amount (either tax-inclusive or taxable base depending on amount_is_tax_inclusive)';
COMMENT ON COLUMN expense_items.amount_is_tax_inclusive IS 'If true, total_amount is the final invoice total (tax included). If false, total_amount is the taxable base (tax excluded)';
COMMENT ON COLUMN expense_items.tax_rate IS 'VAT/Tax rate percentage (e.g., 22 for 22%)';