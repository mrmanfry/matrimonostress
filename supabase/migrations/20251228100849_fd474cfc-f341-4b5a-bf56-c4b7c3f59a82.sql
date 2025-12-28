-- Trigger per propagare automaticamente std_response ai membri passivi del nucleo
-- Quando un referente digitale (con telefono) risponde, i membri senza telefono ereditano lo stato

CREATE OR REPLACE FUNCTION public.propagate_family_std_response()
RETURNS TRIGGER AS $$
BEGIN
  -- Se std_response è cambiato e il guest ha un party_id E ha un telefono (è un referente digitale)
  IF NEW.std_response IS DISTINCT FROM OLD.std_response 
     AND NEW.party_id IS NOT NULL 
     AND NEW.phone IS NOT NULL 
     AND NEW.phone <> '' THEN
    
    -- Aggiorna tutti i membri dello stesso nucleo che:
    -- 1. Non sono l'utente che sta rispondendo
    -- 2. Non hanno un numero di telefono (sono membri passivi)
    UPDATE public.guests
    SET 
      std_response = NEW.std_response,
      std_responded_at = COALESCE(NEW.std_responded_at, NOW()),
      updated_at = NOW()
    WHERE 
      party_id = NEW.party_id 
      AND (phone IS NULL OR phone = '')  -- Solo membri passivi (senza telefono)
      AND id <> NEW.id;
        
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger che si attiva solo quando std_response cambia
CREATE TRIGGER trigger_propagate_std_response
AFTER UPDATE OF std_response ON public.guests
FOR EACH ROW
WHEN (OLD.std_response IS DISTINCT FROM NEW.std_response)
EXECUTE FUNCTION public.propagate_family_std_response();