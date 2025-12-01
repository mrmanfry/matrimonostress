-- Add vendor_id column to checklist_tasks for linking tasks to vendors
ALTER TABLE checklist_tasks 
ADD COLUMN vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL;

-- Create index for performance on vendor-filtered queries
CREATE INDEX idx_checklist_tasks_vendor_id ON checklist_tasks(vendor_id);

-- Update RLS policies to allow co-planners and managers to view/edit tasks with vendor links
-- (existing policies already cover this through wedding_id, no changes needed)