
-- Add is_accommodation flag to vendors
ALTER TABLE public.vendors ADD COLUMN is_accommodation boolean NOT NULL DEFAULT false;

-- Create accommodation_rooms table
CREATE TABLE public.accommodation_rooms (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wedding_id uuid NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  room_name text NOT NULL,
  room_type text DEFAULT 'doppia',
  capacity integer NOT NULL DEFAULT 2,
  price_per_night numeric NOT NULL DEFAULT 0,
  nights integer NOT NULL DEFAULT 1,
  notes text,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create accommodation_assignments table
CREATE TABLE public.accommodation_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id uuid NOT NULL REFERENCES public.accommodation_rooms(id) ON DELETE CASCADE,
  guest_id uuid NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(room_id, guest_id)
);

-- Enable RLS
ALTER TABLE public.accommodation_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accommodation_assignments ENABLE ROW LEVEL SECURITY;

-- RLS for accommodation_rooms
CREATE POLICY "Planners can manage accommodation rooms"
ON public.accommodation_rooms
FOR ALL
USING (
  has_wedding_role(auth.uid(), wedding_id, 'co_planner'::app_role)
  OR has_wedding_role(auth.uid(), wedding_id, 'manager'::app_role)
  OR has_wedding_role(auth.uid(), wedding_id, 'planner'::app_role)
);

CREATE POLICY "Users can view accommodation rooms for accessible weddings"
ON public.accommodation_rooms
FOR SELECT
USING (has_wedding_access(auth.uid(), wedding_id));

-- RLS for accommodation_assignments (via room -> wedding)
CREATE POLICY "Planners can manage accommodation assignments"
ON public.accommodation_assignments
FOR ALL
USING (
  room_id IN (
    SELECT ar.id FROM accommodation_rooms ar
    WHERE has_wedding_role(auth.uid(), ar.wedding_id, 'co_planner'::app_role)
       OR has_wedding_role(auth.uid(), ar.wedding_id, 'manager'::app_role)
       OR has_wedding_role(auth.uid(), ar.wedding_id, 'planner'::app_role)
  )
);

CREATE POLICY "Users can view accommodation assignments for accessible rooms"
ON public.accommodation_assignments
FOR SELECT
USING (
  room_id IN (
    SELECT ar.id FROM accommodation_rooms ar
    WHERE has_wedding_access(auth.uid(), ar.wedding_id)
  )
);

-- Trigger for updated_at on accommodation_rooms
CREATE TRIGGER update_accommodation_rooms_updated_at
BEFORE UPDATE ON public.accommodation_rooms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
