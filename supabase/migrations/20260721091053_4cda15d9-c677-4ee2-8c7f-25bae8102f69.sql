
-- 1. Data fix immediato per il nucleo di Marina
UPDATE public.invite_parties
SET party_name = 'Marina Castrini'
WHERE id = '8270474c-fd2f-4928-ba5d-41bc7404be98';

-- 2. Funzione di sync party_name basata sul membro unico
CREATE OR REPLACE FUNCTION public.sync_party_name_from_guest()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_party_ids uuid[];
  v_pid uuid;
  v_count int;
  v_new_name text;
BEGIN
  -- Raccogli party_id coinvolti (vecchio e nuovo)
  IF TG_OP = 'INSERT' THEN
    v_party_ids := ARRAY[NEW.party_id];
  ELSIF TG_OP = 'DELETE' THEN
    v_party_ids := ARRAY[OLD.party_id];
  ELSE
    v_party_ids := ARRAY[NEW.party_id, OLD.party_id];
  END IF;

  FOREACH v_pid IN ARRAY v_party_ids LOOP
    IF v_pid IS NULL THEN CONTINUE; END IF;

    SELECT COUNT(*) INTO v_count
    FROM public.guests
    WHERE party_id = v_pid
      AND COALESCE(is_couple_member, false) = false;

    IF v_count = 1 THEN
      SELECT TRIM(COALESCE(first_name, '') || ' ' || COALESCE(last_name, ''))
        INTO v_new_name
      FROM public.guests
      WHERE party_id = v_pid
        AND COALESCE(is_couple_member, false) = false
      LIMIT 1;

      IF v_new_name IS NOT NULL AND v_new_name <> '' THEN
        UPDATE public.invite_parties
        SET party_name = v_new_name
        WHERE id = v_pid
          AND party_name IS DISTINCT FROM v_new_name;
      END IF;
    END IF;
  END LOOP;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 3. Trigger su guests
DROP TRIGGER IF EXISTS sync_party_name_on_guest_change ON public.guests;
CREATE TRIGGER sync_party_name_on_guest_change
AFTER INSERT OR DELETE OR UPDATE OF first_name, last_name, party_id, is_couple_member
ON public.guests
FOR EACH ROW
EXECUTE FUNCTION public.sync_party_name_from_guest();
