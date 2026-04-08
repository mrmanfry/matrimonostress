-- Create mass_booklets table
CREATE TABLE public.mass_booklets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wedding_id UUID NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'completed')),
  template_style TEXT NOT NULL DEFAULT 'minimal' CHECK (template_style IN ('minimal', 'classic', 'modern')),
  schema_version INTEGER NOT NULL DEFAULT 1,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  current_step INTEGER NOT NULL DEFAULT 1 CHECK (current_step BETWEEN 1 AND 5),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT one_booklet_per_wedding UNIQUE (wedding_id)
);

-- Enable RLS
ALTER TABLE public.mass_booklets ENABLE ROW LEVEL SECURITY;

-- Planners can manage booklets
CREATE POLICY "Planners can manage mass booklets"
ON public.mass_booklets
FOR ALL
USING (
  has_wedding_role(auth.uid(), wedding_id, 'co_planner'::app_role)
  OR has_wedding_role(auth.uid(), wedding_id, 'manager'::app_role)
  OR has_wedding_role(auth.uid(), wedding_id, 'planner'::app_role)
);

-- Users with wedding access can view booklets
CREATE POLICY "Users can view mass booklets for accessible weddings"
ON public.mass_booklets
FOR SELECT
USING (has_wedding_access(auth.uid(), wedding_id));

-- Auto-update updated_at
CREATE TRIGGER update_mass_booklets_updated_at
BEFORE UPDATE ON public.mass_booklets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();