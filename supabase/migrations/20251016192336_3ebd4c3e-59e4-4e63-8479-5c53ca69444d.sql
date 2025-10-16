-- Create tables for seating arrangements
CREATE TABLE public.tables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wedding_id UUID NOT NULL,
  name TEXT NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 8,
  position_x NUMERIC NOT NULL DEFAULT 0,
  position_y NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;

-- Create policies for tables
CREATE POLICY "Users can view tables for accessible weddings"
ON public.tables
FOR SELECT
USING (has_wedding_access(auth.uid(), wedding_id));

CREATE POLICY "Co-planners and managers can manage tables"
ON public.tables
FOR ALL
USING (
  has_wedding_role(auth.uid(), wedding_id, 'co_planner'::app_role) OR 
  has_wedding_role(auth.uid(), wedding_id, 'manager'::app_role)
);

-- Create table assignments
CREATE TABLE public.table_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  table_id UUID NOT NULL REFERENCES public.tables(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(guest_id)
);

-- Enable RLS
ALTER TABLE public.table_assignments ENABLE ROW LEVEL SECURITY;

-- Create policies for table_assignments
CREATE POLICY "Users can view assignments for accessible tables"
ON public.table_assignments
FOR SELECT
USING (
  table_id IN (
    SELECT id FROM public.tables WHERE has_wedding_access(auth.uid(), wedding_id)
  )
);

CREATE POLICY "Co-planners and managers can manage assignments"
ON public.table_assignments
FOR ALL
USING (
  table_id IN (
    SELECT id FROM public.tables 
    WHERE has_wedding_role(auth.uid(), wedding_id, 'co_planner'::app_role) 
       OR has_wedding_role(auth.uid(), wedding_id, 'manager'::app_role)
  )
);

-- Create guest conflicts (NonMettereVicinoA)
CREATE TABLE public.guest_conflicts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wedding_id UUID NOT NULL,
  guest_id_1 UUID NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  guest_id_2 UUID NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT different_guests CHECK (guest_id_1 != guest_id_2),
  UNIQUE(guest_id_1, guest_id_2)
);

-- Enable RLS
ALTER TABLE public.guest_conflicts ENABLE ROW LEVEL SECURITY;

-- Create policies for guest_conflicts
CREATE POLICY "Users can view conflicts for accessible weddings"
ON public.guest_conflicts
FOR SELECT
USING (has_wedding_access(auth.uid(), wedding_id));

CREATE POLICY "Co-planners and managers can manage conflicts"
ON public.guest_conflicts
FOR ALL
USING (
  has_wedding_role(auth.uid(), wedding_id, 'co_planner'::app_role) OR 
  has_wedding_role(auth.uid(), wedding_id, 'manager'::app_role)
);

-- Add triggers for updated_at
CREATE TRIGGER update_tables_updated_at
BEFORE UPDATE ON public.tables
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();