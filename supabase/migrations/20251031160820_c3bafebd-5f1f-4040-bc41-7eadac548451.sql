-- Add vendor registry fields extracted from contracts
ALTER TABLE public.vendors
ADD COLUMN IF NOT EXISTS ragione_sociale TEXT,
ADD COLUMN IF NOT EXISTS partita_iva_cf TEXT,
ADD COLUMN IF NOT EXISTS indirizzo_sede_legale TEXT,
ADD COLUMN IF NOT EXISTS iban TEXT,
ADD COLUMN IF NOT EXISTS intestatario_conto TEXT;

-- Add helpful comment
COMMENT ON COLUMN public.vendors.ragione_sociale IS 'Legal business name extracted from contract';
COMMENT ON COLUMN public.vendors.partita_iva_cf IS 'VAT number or Tax ID extracted from contract';
COMMENT ON COLUMN public.vendors.indirizzo_sede_legale IS 'Legal address extracted from contract';
COMMENT ON COLUMN public.vendors.iban IS 'Bank account IBAN extracted from contract';
COMMENT ON COLUMN public.vendors.intestatario_conto IS 'Account holder name extracted from contract';