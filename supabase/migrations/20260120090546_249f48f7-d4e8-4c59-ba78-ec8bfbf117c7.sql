-- Extend tables table with shape, table_type, is_locked, rotation columns
ALTER TABLE public.tables 
ADD COLUMN IF NOT EXISTS shape VARCHAR(20) DEFAULT 'ROUND' CHECK (shape IN ('ROUND', 'RECTANGULAR'));

ALTER TABLE public.tables 
ADD COLUMN IF NOT EXISTS table_type VARCHAR(20) DEFAULT 'standard' CHECK (table_type IN ('standard', 'imperial'));

ALTER TABLE public.tables 
ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false;

ALTER TABLE public.tables 
ADD COLUMN IF NOT EXISTS rotation INTEGER DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN public.tables.shape IS 'Table shape: ROUND or RECTANGULAR';
COMMENT ON COLUMN public.tables.table_type IS 'Table type: standard or imperial (long banquet tables)';
COMMENT ON COLUMN public.tables.is_locked IS 'If true, AI algorithm will not modify assignments';
COMMENT ON COLUMN public.tables.rotation IS 'Rotation angle in degrees for canvas display';

-- Add category column to guests if not exists (needed for affinity algorithm)
ALTER TABLE public.guests 
ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT NULL;

COMMENT ON COLUMN public.guests.category IS 'Guest category for table assignment algorithm: FAMILY, FRIENDS, WORK, PARTNER_SIDE, etc.';