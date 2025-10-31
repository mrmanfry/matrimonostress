-- Create table for contract analysis results
CREATE TABLE IF NOT EXISTS public.vendor_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  wedding_id UUID NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ai_analysis JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vendor_contracts ENABLE ROW LEVEL SECURITY;

-- Policies for vendor_contracts
CREATE POLICY "Users can view contracts for accessible weddings"
  ON public.vendor_contracts
  FOR SELECT
  USING (has_wedding_access(auth.uid(), wedding_id));

CREATE POLICY "Co-planners and managers can manage contracts"
  ON public.vendor_contracts
  FOR ALL
  USING (
    has_wedding_role(auth.uid(), wedding_id, 'co_planner'::app_role) OR 
    has_wedding_role(auth.uid(), wedding_id, 'manager'::app_role)
  );

-- Add trigger for updated_at
CREATE TRIGGER update_vendor_contracts_updated_at
  BEFORE UPDATE ON public.vendor_contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for vendor contracts
INSERT INTO storage.buckets (id, name, public)
VALUES ('vendor-contracts', 'vendor-contracts', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for vendor-contracts bucket
CREATE POLICY "Users can upload their wedding contracts"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'vendor-contracts' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM weddings WHERE has_wedding_access(auth.uid(), id)
    )
  );

CREATE POLICY "Users can view their wedding contracts"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'vendor-contracts' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM weddings WHERE has_wedding_access(auth.uid(), id)
    )
  );

CREATE POLICY "Users can delete their wedding contracts"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'vendor-contracts' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM weddings WHERE has_wedding_access(auth.uid(), id)
    )
  );