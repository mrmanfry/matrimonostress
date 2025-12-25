-- Funzione RPC: get_user_context
-- Restituisce wedding_id e ruolo dell'utente corrente in una singola chiamata efficiente
CREATE OR REPLACE FUNCTION get_user_context()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  w_id uuid;
  u_role text;
BEGIN
  -- 1. Cerca ruolo esplicito in user_roles
  SELECT wedding_id, role::text INTO w_id, u_role
  FROM user_roles
  WHERE user_id = auth.uid()
  LIMIT 1;

  -- 2. Se non trovato, cerca se è owner in weddings
  IF w_id IS NULL THEN
    SELECT id INTO w_id
    FROM weddings
    WHERE created_by = auth.uid()
    LIMIT 1;
    
    IF w_id IS NOT NULL THEN
      u_role := 'owner';
    END IF;
  END IF;

  RETURN json_build_object(
    'wedding_id', w_id,
    'role', u_role
  );
END;
$$;