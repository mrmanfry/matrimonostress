-- Cleanup: remove orphan plus_one_name values that have no promoted +1 guest linked
-- These are residual "ghost" entries from when an host removed their +1 in the UI
-- but the legacy plus_one_name field was not cleared. After this fix, the field is
-- always cleared by the GuestEditDialog when allow_plus_one is disabled.
UPDATE public.guests g
SET plus_one_name = NULL,
    plus_one_menu = NULL,
    updated_at = now()
WHERE g.plus_one_name IS NOT NULL
  AND g.plus_one_name <> ''
  AND NOT EXISTS (
    SELECT 1 FROM public.guests gp
    WHERE gp.plus_one_of_guest_id = g.id
  );