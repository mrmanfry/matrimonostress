-- Aggiungere partner_role a user_roles per mappare utente a partner1/partner2
ALTER TABLE public.user_roles 
ADD COLUMN IF NOT EXISTS partner_role TEXT CHECK (partner_role IN ('partner1', 'partner2'));

COMMENT ON COLUMN public.user_roles.partner_role IS 'Indica se questo utente è partner1 o partner2 nel matrimonio';

-- Aggiungere preferenze digest a profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS digest_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS digest_frequency TEXT DEFAULT 'weekly' CHECK (digest_frequency IN ('weekly', 'daily', 'never'));

COMMENT ON COLUMN public.profiles.digest_enabled IS 'Se true, riceve email digest settimanale';
COMMENT ON COLUMN public.profiles.digest_frequency IS 'Frequenza del digest: weekly, daily, never';