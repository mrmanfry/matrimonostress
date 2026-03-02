
-- Phase 1: Add delegation and completion audit columns to checklist_tasks
ALTER TABLE public.checklist_tasks 
  ADD COLUMN delegated_by_user_id UUID REFERENCES auth.users(id),
  ADD COLUMN delegated_at TIMESTAMPTZ,
  ADD COLUMN completed_at TIMESTAMPTZ,
  ADD COLUMN completed_by_user_id UUID REFERENCES auth.users(id);

-- Enable realtime for checklist_tasks
ALTER PUBLICATION supabase_realtime ADD TABLE public.checklist_tasks;

-- Phase 2: Add last_seen_at to profiles
ALTER TABLE public.profiles ADD COLUMN last_seen_at TIMESTAMPTZ;

-- Phase 3: Create messages table
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'all' CHECK (visibility IN ('couple', 'all')),
  message_type TEXT NOT NULL DEFAULT 'user' CHECK (message_type IN ('user', 'system')),
  system_action_type TEXT,
  system_action_ref_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create message_reads table
CREATE TABLE public.message_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id)
);

-- Enable RLS on both tables
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reads ENABLE ROW LEVEL SECURITY;

-- Indexes for performance
CREATE INDEX idx_messages_wedding_id ON public.messages(wedding_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX idx_messages_wedding_created ON public.messages(wedding_id, created_at DESC);
CREATE INDEX idx_message_reads_message_id ON public.message_reads(message_id);
CREATE INDEX idx_message_reads_user_id ON public.message_reads(user_id);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reads;

-- ============================================
-- RLS POLICIES FOR MESSAGES
-- ============================================

-- Helper function: check if user has co_planner role (can see 'couple' messages)
CREATE OR REPLACE FUNCTION public.can_see_couple_messages(_user_id UUID, _wedding_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND wedding_id = _wedding_id
      AND role = 'co_planner'
  )
$$;

-- SELECT: Users can see messages for their weddings, but planners/managers CANNOT see 'couple' visibility messages
CREATE POLICY "Users can view messages"
ON public.messages
FOR SELECT
USING (
  has_wedding_access(auth.uid(), wedding_id)
  AND (
    visibility = 'all'
    OR can_see_couple_messages(auth.uid(), wedding_id)
  )
);

-- INSERT: Users can send messages to their weddings (sender must be themselves)
CREATE POLICY "Users can send messages"
ON public.messages
FOR INSERT
WITH CHECK (
  has_wedding_access(auth.uid(), wedding_id)
  AND sender_id = auth.uid()
);

-- No UPDATE or DELETE policies (messages are immutable for MVP)

-- ============================================
-- RLS POLICIES FOR MESSAGE_READS
-- ============================================

-- SELECT: Users can view read receipts for messages they can access
CREATE POLICY "Users can view read receipts"
ON public.message_reads
FOR SELECT
USING (
  message_id IN (
    SELECT id FROM public.messages
    WHERE has_wedding_access(auth.uid(), wedding_id)
      AND (visibility = 'all' OR can_see_couple_messages(auth.uid(), wedding_id))
  )
);

-- INSERT: Users can mark messages as read (only for themselves)
CREATE POLICY "Users can mark messages as read"
ON public.message_reads
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND message_id IN (
    SELECT id FROM public.messages
    WHERE has_wedding_access(auth.uid(), wedding_id)
      AND (visibility = 'all' OR can_see_couple_messages(auth.uid(), wedding_id))
  )
);
