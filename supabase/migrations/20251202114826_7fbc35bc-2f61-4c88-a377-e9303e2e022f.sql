-- Add wedding_role to profiles table
ALTER TABLE profiles 
ADD COLUMN wedding_role text 
CHECK (wedding_role IN ('groom', 'bride', 'planner', 'other'));

-- Create vendor_communications table for logging
CREATE TABLE vendor_communications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id uuid NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  task_id uuid REFERENCES checklist_tasks(id) ON DELETE SET NULL,
  sender_user_id uuid NOT NULL,
  channel text NOT NULL CHECK (channel IN ('whatsapp', 'email')),
  tone text CHECK (tone IN ('formal', 'friendly')),
  message_content text NOT NULL,
  outcome text CHECK (outcome IN ('draft_generated', 'opened', 'confirmed_sent', 'unknown')),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE vendor_communications ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Users can manage their wedding communications"
ON vendor_communications
FOR ALL
USING (has_wedding_access(auth.uid(), wedding_id));