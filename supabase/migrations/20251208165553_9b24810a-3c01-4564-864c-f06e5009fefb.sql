-- Create progress tokens table for public progress page sharing
CREATE TABLE public.progress_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wedding_id UUID NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '90 days'),
  is_active BOOLEAN NOT NULL DEFAULT true,
  -- Visibility settings
  show_checklist BOOLEAN NOT NULL DEFAULT true,
  show_vendors BOOLEAN NOT NULL DEFAULT true,
  show_timeline BOOLEAN NOT NULL DEFAULT true,
  show_countdown BOOLEAN NOT NULL DEFAULT true
);

-- Enable RLS
ALTER TABLE public.progress_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Co-planners can manage progress tokens" 
ON public.progress_tokens 
FOR ALL 
USING (has_wedding_role(auth.uid(), wedding_id, 'co_planner'::app_role) OR has_wedding_role(auth.uid(), wedding_id, 'manager'::app_role));

CREATE POLICY "Users can view progress tokens for accessible weddings" 
ON public.progress_tokens 
FOR SELECT 
USING (has_wedding_access(auth.uid(), wedding_id));

-- Index for token lookup
CREATE INDEX idx_progress_tokens_token ON public.progress_tokens(token);

-- Function to generate progress token
CREATE OR REPLACE FUNCTION public.generate_progress_token()
RETURNS TEXT AS $$
BEGIN
  RETURN 'prog_' || LOWER(REPLACE(gen_random_uuid()::TEXT, '-', ''));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;