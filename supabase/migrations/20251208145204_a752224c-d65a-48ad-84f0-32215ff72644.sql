-- Rimuove la policy troppo permissiva che permetteva a chiunque di vedere matrimoni con access_code
DROP POLICY IF EXISTS "Users can view weddings by access code" ON public.weddings;