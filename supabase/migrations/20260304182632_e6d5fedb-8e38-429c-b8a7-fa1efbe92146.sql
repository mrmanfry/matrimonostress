CREATE OR REPLACE FUNCTION public.get_display_names(user_ids uuid[])
RETURNS TABLE(id uuid, display_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT p.id, TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))
  FROM profiles p
  WHERE p.id = ANY(user_ids);
$$;