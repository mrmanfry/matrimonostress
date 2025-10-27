-- Add user_id column to financial_contributors table
ALTER TABLE public.financial_contributors 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX idx_financial_contributors_user_id ON public.financial_contributors(user_id);

-- Add comment for documentation
COMMENT ON COLUMN public.financial_contributors.user_id IS 'Link to authenticated user account (null for contributors without an account)';

-- Update trigger to automatically link "Io" to wedding creator
CREATE OR REPLACE FUNCTION public.create_default_financial_contributors()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert "Io" as default contributor LINKED to the wedding creator
  INSERT INTO public.financial_contributors (wedding_id, name, type, is_default, user_id)
  VALUES (NEW.id, 'Io', 'self', true, NEW.created_by);
  
  -- Insert "Partner" as default contributor (without user_id yet)
  INSERT INTO public.financial_contributors (wedding_id, name, type, is_default)
  VALUES (NEW.id, 'Partner', 'partner', true);
  
  RETURN NEW;
END;
$$;