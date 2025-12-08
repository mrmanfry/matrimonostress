-- Add new columns for Checklist 2.0 Sprint 1
ALTER TABLE public.checklist_tasks 
ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
ADD COLUMN IF NOT EXISTS notes text,
ADD COLUMN IF NOT EXISTS blocked_by_task_id uuid REFERENCES public.checklist_tasks(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS linked_payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_checklist_tasks_priority ON public.checklist_tasks(priority);
CREATE INDEX IF NOT EXISTS idx_checklist_tasks_blocked_by ON public.checklist_tasks(blocked_by_task_id);
CREATE INDEX IF NOT EXISTS idx_checklist_tasks_linked_payment ON public.checklist_tasks(linked_payment_id);

-- Add comment for documentation
COMMENT ON COLUMN public.checklist_tasks.priority IS 'Task priority: high, medium, low';
COMMENT ON COLUMN public.checklist_tasks.notes IS 'Collaborative notes for the task';
COMMENT ON COLUMN public.checklist_tasks.blocked_by_task_id IS 'Task dependency - this task is blocked until the referenced task is completed';
COMMENT ON COLUMN public.checklist_tasks.linked_payment_id IS 'Link to a payment for budget integration';