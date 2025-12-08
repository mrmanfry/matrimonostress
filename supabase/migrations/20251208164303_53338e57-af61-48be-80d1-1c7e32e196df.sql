-- Create trigger function for bidirectional sync: when payment is marked as paid, complete linked task
CREATE OR REPLACE FUNCTION public.sync_payment_to_task()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- When payment status changes to 'Pagato', complete the linked task
  IF NEW.status = 'Pagato' AND (OLD.status IS DISTINCT FROM 'Pagato') THEN
    UPDATE public.checklist_tasks
    SET status = 'completed', updated_at = NOW()
    WHERE linked_payment_id = NEW.id AND status = 'pending';
  END IF;
  
  -- When payment status changes from 'Pagato' to something else, reopen the linked task
  IF OLD.status = 'Pagato' AND NEW.status <> 'Pagato' THEN
    UPDATE public.checklist_tasks
    SET status = 'pending', updated_at = NOW()
    WHERE linked_payment_id = NEW.id AND status = 'completed';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_sync_payment_to_task ON public.payments;
CREATE TRIGGER trigger_sync_payment_to_task
  AFTER UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_payment_to_task();

-- Add comment for documentation
COMMENT ON FUNCTION public.sync_payment_to_task IS 'Bidirectional sync: when payment status changes, update linked checklist task status';