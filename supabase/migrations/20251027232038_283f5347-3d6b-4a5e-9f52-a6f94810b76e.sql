-- Create financial_contributors table
CREATE TABLE public.financial_contributors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wedding_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('self', 'partner', 'other')),
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.financial_contributors ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view contributors for accessible weddings"
ON public.financial_contributors
FOR SELECT
USING (has_wedding_access(auth.uid(), wedding_id));

CREATE POLICY "Co-planners and managers can manage contributors"
ON public.financial_contributors
FOR ALL
USING (
  has_wedding_role(auth.uid(), wedding_id, 'co_planner'::app_role) OR 
  has_wedding_role(auth.uid(), wedding_id, 'manager'::app_role)
);

-- Trigger per popolare automaticamente i contributor quando viene creato un wedding
CREATE OR REPLACE FUNCTION public.create_default_financial_contributors()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Inserisci "Io" come contributor predefinito
  INSERT INTO public.financial_contributors (wedding_id, name, type, is_default)
  VALUES (NEW.id, 'Io', 'self', true);
  
  -- Inserisci "Partner" come contributor predefinito
  INSERT INTO public.financial_contributors (wedding_id, name, type, is_default)
  VALUES (NEW.id, 'Partner', 'partner', true);
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER create_default_contributors_on_wedding
AFTER INSERT ON public.weddings
FOR EACH ROW
EXECUTE FUNCTION public.create_default_financial_contributors();