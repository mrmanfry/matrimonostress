-- =====================================================
-- SECURITY REMEDIATION MIGRATION
-- =====================================================

-- 1. Fix validate_appointment_status function - add search_path
CREATE OR REPLACE FUNCTION public.validate_appointment_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status NOT IN ('scheduled', 'completed', 'cancelled', 'rescheduled') THEN
    RAISE EXCEPTION 'Invalid appointment status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

-- 2. Add CHECK constraints for payments.status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payments_status_check'
  ) THEN
    ALTER TABLE public.payments
      ADD CONSTRAINT payments_status_check 
      CHECK (status IN ('Da Pagare', 'Pagato', 'In Sospeso', 'Cancellato'));
  END IF;
END $$;

-- 3. Add CHECK constraints for vendors.status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'vendors_status_check'
  ) THEN
    ALTER TABLE public.vendors
      ADD CONSTRAINT vendors_status_check 
      CHECK (status IS NULL OR status IN ('evaluating', 'contacted', 'confirmed', 'rejected'));
  END IF;
END $$;

-- 4. Restrict vendor_contracts policies - DROP existing overly permissive policy
DROP POLICY IF EXISTS "Co-planners and managers can manage contracts" ON public.vendor_contracts;

-- 5. Create separate policies for vendor_contracts
-- Co-planners get full CRUD
CREATE POLICY "Co-planners can manage contracts"
  ON public.vendor_contracts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.wedding_id = vendor_contracts.wedding_id
        AND user_roles.role = 'co_planner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.wedding_id = vendor_contracts.wedding_id
        AND user_roles.role = 'co_planner'
    )
  );

-- Managers get SELECT only
CREATE POLICY "Managers can view contracts"
  ON public.vendor_contracts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.wedding_id = vendor_contracts.wedding_id
        AND user_roles.role = 'manager'
    )
  );

-- 6. Fix storage policies for vendor-contracts bucket
-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Users can upload their wedding contracts" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their wedding contracts" ON storage.objects;

-- Create restricted upload policy - co-planners only
CREATE POLICY "Co-planners can upload contracts" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'vendor-contracts' AND
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.wedding_id = (storage.foldername(name))[1]::uuid
        AND user_roles.role = 'co_planner'
    )
  );

-- Create restricted delete policy - co-planners only  
CREATE POLICY "Co-planners can delete contracts" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'vendor-contracts' AND
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.wedding_id = (storage.foldername(name))[1]::uuid
        AND user_roles.role = 'co_planner'
    )
  );