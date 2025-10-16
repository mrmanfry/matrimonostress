-- Create timeline_events table for wedding day schedule
CREATE TABLE public.timeline_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wedding_id UUID NOT NULL,
  time TIME NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.timeline_events ENABLE ROW LEVEL SECURITY;

-- Create policies for timeline_events
CREATE POLICY "Users can view events for accessible weddings"
ON public.timeline_events
FOR SELECT
USING (has_wedding_access(auth.uid(), wedding_id));

CREATE POLICY "Co-planners and managers can manage events"
ON public.timeline_events
FOR ALL
USING (
  has_wedding_role(auth.uid(), wedding_id, 'co_planner'::app_role) OR 
  has_wedding_role(auth.uid(), wedding_id, 'manager'::app_role)
);

-- Add trigger for updated_at
CREATE TRIGGER update_timeline_events_updated_at
BEFORE UPDATE ON public.timeline_events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create table for public timeline sharing tokens
CREATE TABLE public.timeline_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wedding_id UUID NOT NULL,
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '30 days')
);

-- Enable RLS
ALTER TABLE public.timeline_tokens ENABLE ROW LEVEL SECURITY;

-- Create policies for timeline_tokens
CREATE POLICY "Users can view tokens for their weddings"
ON public.timeline_tokens
FOR SELECT
USING (has_wedding_access(auth.uid(), wedding_id));

CREATE POLICY "Co-planners can create tokens"
ON public.timeline_tokens
FOR INSERT
WITH CHECK (
  has_wedding_role(auth.uid(), wedding_id, 'co_planner'::app_role) OR 
  has_wedding_role(auth.uid(), wedding_id, 'manager'::app_role)
);

CREATE POLICY "Co-planners can delete tokens"
ON public.timeline_tokens
FOR DELETE
USING (
  has_wedding_role(auth.uid(), wedding_id, 'co_planner'::app_role) OR 
  has_wedding_role(auth.uid(), wedding_id, 'manager'::app_role)
);