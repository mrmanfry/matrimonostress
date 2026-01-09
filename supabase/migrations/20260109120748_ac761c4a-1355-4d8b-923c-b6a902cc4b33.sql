-- Create vendor_appointments table for managing vendor meetings/appointments
CREATE TABLE public.vendor_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  
  -- Date and time
  appointment_date DATE NOT NULL,
  appointment_time TIME,
  end_time TIME,
  
  -- Details
  title TEXT NOT NULL,
  location TEXT,
  purpose TEXT, -- e.g., "Sopralluogo", "Degustazione", "Prova"
  
  -- Notes (before and after appointment)
  notes_before TEXT,  -- what to ask/prepare
  notes_after TEXT,   -- what was discussed
  
  -- Status
  status TEXT NOT NULL DEFAULT 'scheduled',
  
  -- Link to reminder task in checklist
  linked_task_id UUID REFERENCES public.checklist_tasks(id) ON DELETE SET NULL,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create validation trigger for status (instead of CHECK constraint for better flexibility)
CREATE OR REPLACE FUNCTION public.validate_appointment_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status NOT IN ('scheduled', 'completed', 'cancelled', 'rescheduled') THEN
    RAISE EXCEPTION 'Invalid appointment status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_appointment_status_trigger
BEFORE INSERT OR UPDATE ON public.vendor_appointments
FOR EACH ROW EXECUTE FUNCTION public.validate_appointment_status();

-- Create updated_at trigger
CREATE TRIGGER update_vendor_appointments_updated_at
BEFORE UPDATE ON public.vendor_appointments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.vendor_appointments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Co-planners and managers can manage appointments"
ON public.vendor_appointments
FOR ALL
USING (
  has_wedding_role(auth.uid(), wedding_id, 'co_planner'::app_role) OR 
  has_wedding_role(auth.uid(), wedding_id, 'manager'::app_role)
);

CREATE POLICY "Users can view appointments for accessible weddings"
ON public.vendor_appointments
FOR SELECT
USING (has_wedding_access(auth.uid(), wedding_id));

-- Indexes for common queries
CREATE INDEX idx_vendor_appointments_wedding_id ON public.vendor_appointments(wedding_id);
CREATE INDEX idx_vendor_appointments_vendor_id ON public.vendor_appointments(vendor_id);
CREATE INDEX idx_vendor_appointments_date ON public.vendor_appointments(appointment_date);
CREATE INDEX idx_vendor_appointments_status ON public.vendor_appointments(status);