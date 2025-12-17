-- Create function to auto-create party when RSVP token is generated
CREATE OR REPLACE FUNCTION public.ensure_party_for_rsvp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_party_id UUID;
BEGIN
  -- If guest has a token but no party_id, create a "party of 1"
  IF NEW.unique_rsvp_token IS NOT NULL AND NEW.party_id IS NULL THEN
    INSERT INTO public.invite_parties (wedding_id, party_name, rsvp_status)
    VALUES (NEW.wedding_id, TRIM(NEW.first_name || ' ' || COALESCE(NEW.last_name, '')), 'In attesa')
    RETURNING id INTO new_party_id;
    
    NEW.party_id := new_party_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger that runs AFTER the RSVP token trigger
CREATE TRIGGER ensure_party_for_rsvp_trigger
BEFORE INSERT OR UPDATE ON public.guests
FOR EACH ROW
EXECUTE FUNCTION public.ensure_party_for_rsvp();

-- Fix existing guests: create parties for those with token but no party_id
DO $$
DECLARE
  guest_record RECORD;
  new_party_id UUID;
BEGIN
  FOR guest_record IN 
    SELECT id, wedding_id, first_name, last_name 
    FROM public.guests 
    WHERE unique_rsvp_token IS NOT NULL AND party_id IS NULL
  LOOP
    -- Create a new party for this guest
    INSERT INTO public.invite_parties (wedding_id, party_name, rsvp_status)
    VALUES (guest_record.wedding_id, TRIM(guest_record.first_name || ' ' || COALESCE(guest_record.last_name, '')), 'In attesa')
    RETURNING id INTO new_party_id;
    
    -- Update the guest with the new party_id
    UPDATE public.guests SET party_id = new_party_id WHERE id = guest_record.id;
  END LOOP;
END;
$$;