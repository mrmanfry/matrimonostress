
CREATE OR REPLACE FUNCTION public.join_wedding_by_code(p_access_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_wedding_id uuid;
  v_user_id uuid;
  v_user_email text;
  v_assigned_role app_role;
  v_invitation_id uuid;
  v_existing_role_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('error', 'Non autenticato');
  END IF;

  SELECT id INTO v_wedding_id
  FROM weddings
  WHERE access_code = UPPER(TRIM(p_access_code));

  IF v_wedding_id IS NULL THEN
    RETURN json_build_object('error', 'Codice non valido');
  END IF;

  SELECT id INTO v_existing_role_id
  FROM user_roles
  WHERE user_id = v_user_id AND wedding_id = v_wedding_id;

  IF v_existing_role_id IS NOT NULL THEN
    RETURN json_build_object('error', 'Sei già un collaboratore di questo matrimonio');
  END IF;

  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;

  v_assigned_role := 'manager';

  IF v_user_email IS NOT NULL THEN
    SELECT id, role INTO v_invitation_id, v_assigned_role
    FROM wedding_invitations
    WHERE wedding_id = v_wedding_id
      AND email = v_user_email
      AND status = 'pending'
    LIMIT 1;

    IF v_invitation_id IS NOT NULL THEN
      UPDATE wedding_invitations SET status = 'accepted' WHERE id = v_invitation_id;
    END IF;
  END IF;

  INSERT INTO user_roles (user_id, wedding_id, role)
  VALUES (v_user_id, v_wedding_id, v_assigned_role);

  RETURN json_build_object('success', true, 'wedding_id', v_wedding_id, 'role', v_assigned_role);
END;
$function$;
