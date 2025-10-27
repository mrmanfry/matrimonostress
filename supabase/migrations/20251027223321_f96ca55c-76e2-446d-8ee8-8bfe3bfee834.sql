-- Aggiungi campi per supportare percentuali e giorni prima del matrimonio nei pagamenti
ALTER TABLE payments
ADD COLUMN amount_type TEXT DEFAULT 'fixed' CHECK (amount_type IN ('fixed', 'percentage')),
ADD COLUMN percentage_value NUMERIC CHECK (percentage_value IS NULL OR (percentage_value >= 0 AND percentage_value <= 100)),
ADD COLUMN due_date_type TEXT DEFAULT 'absolute' CHECK (due_date_type IN ('absolute', 'days_before')),
ADD COLUMN days_before_wedding INTEGER CHECK (days_before_wedding IS NULL OR days_before_wedding >= 0);

COMMENT ON COLUMN payments.amount_type IS 'Tipo di importo: fixed (cifra fissa) o percentage (percentuale del totale)';
COMMENT ON COLUMN payments.percentage_value IS 'Valore percentuale (0-100) se amount_type = percentage';
COMMENT ON COLUMN payments.due_date_type IS 'Tipo di scadenza: absolute (data specifica) o days_before (giorni prima del matrimonio)';
COMMENT ON COLUMN payments.days_before_wedding IS 'Numero di giorni prima del matrimonio se due_date_type = days_before';