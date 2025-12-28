-- Fix the propagation trigger to also reset std_responded_at when std_response is cleared
CREATE OR REPLACE FUNCTION public.propagate_family_std_response()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      -- Reset std_responded_at when clearing, set it when responding
      std_responded_at = CASE 
        WHEN NEW.std_response IS NULL THEN NULL 
        ELSE COALESCE(NEW.std_responded_at, NOW()) 
      END,
      updated_at = NOW()
    WHERE 
      party_id = NEW.party_id 
      AND (phone IS NULL OR phone = '')  -- Solo membri passivi (senza telefono)
      AND id <> NEW.id;
        
  END IF;
  RETURN NEW;
END;
$function$;