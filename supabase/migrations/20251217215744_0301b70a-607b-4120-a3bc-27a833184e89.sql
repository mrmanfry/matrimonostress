-- Function to cleanup orphaned parties after guest UPDATE
CREATE OR REPLACE FUNCTION public.cleanup_orphaned_party_on_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  member_count INTEGER;
BEGIN
  -- Only if party_id changed and there was an old party
  IF OLD.party_id IS NOT NULL AND OLD.party_id IS DISTINCT FROM NEW.party_id THEN
    -- Count remaining members in old party
    SELECT COUNT(*) INTO member_count
    FROM public.guests
    WHERE party_id = OLD.party_id;
    
    -- If party is now empty, delete it
    IF member_count = 0 THEN
      DELETE FROM public.invite_parties WHERE id = OLD.party_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Function to cleanup orphaned parties after guest DELETE
CREATE OR REPLACE FUNCTION public.cleanup_orphaned_party_on_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  member_count INTEGER;
BEGIN
  -- Only if guest had a party
  IF OLD.party_id IS NOT NULL THEN
    -- Count remaining members in party
    SELECT COUNT(*) INTO member_count
    FROM public.guests
    WHERE party_id = OLD.party_id;
    
    -- If party is now empty, delete it
    IF member_count = 0 THEN
      DELETE FROM public.invite_parties WHERE id = OLD.party_id;
    END IF;
  END IF;
  
  RETURN OLD;
END;
$$;

-- Trigger for UPDATE: cleanup when guest moves to different party
CREATE TRIGGER cleanup_orphaned_party_on_update_trigger
AFTER UPDATE ON public.guests
FOR EACH ROW
WHEN (OLD.party_id IS DISTINCT FROM NEW.party_id)
EXECUTE FUNCTION public.cleanup_orphaned_party_on_update();

-- Trigger for DELETE: cleanup when guest is deleted
CREATE TRIGGER cleanup_orphaned_party_on_delete_trigger
AFTER DELETE ON public.guests
FOR EACH ROW
WHEN (OLD.party_id IS NOT NULL)
EXECUTE FUNCTION public.cleanup_orphaned_party_on_delete();