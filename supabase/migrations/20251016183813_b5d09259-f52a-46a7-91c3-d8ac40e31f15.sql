-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('co_planner', 'manager', 'guest');

-- Create user_roles table (MUST be separate for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  wedding_id UUID REFERENCES public.weddings(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, wedding_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_wedding_role(_user_id UUID, _wedding_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND wedding_id = _wedding_id
      AND role = _role
  )
$$;

-- Create function to check if user has any role in wedding
CREATE OR REPLACE FUNCTION public.has_wedding_access(_user_id UUID, _wedding_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND wedding_id = _wedding_id
  )
$$;

-- Create function to get user's highest role in wedding
CREATE OR REPLACE FUNCTION public.get_wedding_role(_user_id UUID, _wedding_id UUID)
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
    AND wedding_id = _wedding_id
  ORDER BY CASE role
    WHEN 'co_planner' THEN 1
    WHEN 'manager' THEN 2
    WHEN 'guest' THEN 3
  END
  LIMIT 1
$$;

-- RLS Policy for user_roles table
CREATE POLICY "Users can view roles for weddings they have access to"
  ON public.user_roles FOR SELECT
  USING (
    public.has_wedding_access(auth.uid(), wedding_id)
  );

CREATE POLICY "Only co-planners can manage roles"
  ON public.user_roles FOR ALL
  USING (
    public.has_wedding_role(auth.uid(), wedding_id, 'co_planner')
  );

-- Update weddings table policies to use roles
DROP POLICY IF EXISTS "Users can view their own wedding" ON public.weddings;
DROP POLICY IF EXISTS "Users can create their own wedding" ON public.weddings;
DROP POLICY IF EXISTS "Users can update their own wedding" ON public.weddings;
DROP POLICY IF EXISTS "Users can delete their own wedding" ON public.weddings;

CREATE POLICY "Users can view weddings they have access to"
  ON public.weddings FOR SELECT
  USING (
    public.has_wedding_access(auth.uid(), id)
  );

CREATE POLICY "Co-planners can update their wedding"
  ON public.weddings FOR UPDATE
  USING (
    public.has_wedding_role(auth.uid(), id, 'co_planner')
  );

CREATE POLICY "Co-planners can delete their wedding"
  ON public.weddings FOR DELETE
  USING (
    public.has_wedding_role(auth.uid(), id, 'co_planner')
  );

-- Allow creating weddings (will assign role via trigger)
CREATE POLICY "Authenticated users can create weddings"
  ON public.weddings FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Create trigger to auto-assign co_planner role on wedding creation
CREATE OR REPLACE FUNCTION public.assign_co_planner_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, wedding_id, role)
  VALUES (NEW.created_by, NEW.id, 'co_planner');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_wedding_created
  AFTER INSERT ON public.weddings
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_co_planner_role();

-- Update guest policies to check wedding access via roles
DROP POLICY IF EXISTS "Users can manage guests for their wedding" ON public.guests;

CREATE POLICY "Users can view guests for accessible weddings"
  ON public.guests FOR SELECT
  USING (
    public.has_wedding_access(auth.uid(), wedding_id)
  );

CREATE POLICY "Co-planners and managers can manage guests"
  ON public.guests FOR INSERT
  WITH CHECK (
    public.has_wedding_role(auth.uid(), wedding_id, 'co_planner') OR
    public.has_wedding_role(auth.uid(), wedding_id, 'manager')
  );

CREATE POLICY "Co-planners and managers can update guests"
  ON public.guests FOR UPDATE
  USING (
    public.has_wedding_role(auth.uid(), wedding_id, 'co_planner') OR
    public.has_wedding_role(auth.uid(), wedding_id, 'manager')
  );

CREATE POLICY "Co-planners and managers can delete guests"
  ON public.guests FOR DELETE
  USING (
    public.has_wedding_role(auth.uid(), wedding_id, 'co_planner') OR
    public.has_wedding_role(auth.uid(), wedding_id, 'manager')
  );

-- Update other table policies similarly
DROP POLICY IF EXISTS "Users can manage groups for their wedding" ON public.guest_groups;

CREATE POLICY "Users can view groups for accessible weddings"
  ON public.guest_groups FOR SELECT
  USING (public.has_wedding_access(auth.uid(), wedding_id));

CREATE POLICY "Co-planners and managers can manage groups"
  ON public.guest_groups FOR ALL
  USING (
    public.has_wedding_role(auth.uid(), wedding_id, 'co_planner') OR
    public.has_wedding_role(auth.uid(), wedding_id, 'manager')
  );

-- Update expense categories policies
DROP POLICY IF EXISTS "Users can manage categories for their wedding" ON public.expense_categories;

CREATE POLICY "Users can view categories for accessible weddings"
  ON public.expense_categories FOR SELECT
  USING (public.has_wedding_access(auth.uid(), wedding_id));

CREATE POLICY "Co-planners and managers can create categories"
  ON public.expense_categories FOR INSERT
  WITH CHECK (
    public.has_wedding_role(auth.uid(), wedding_id, 'co_planner') OR
    public.has_wedding_role(auth.uid(), wedding_id, 'manager')
  );

CREATE POLICY "Co-planners and managers can update categories"
  ON public.expense_categories FOR UPDATE
  USING (
    public.has_wedding_role(auth.uid(), wedding_id, 'co_planner') OR
    public.has_wedding_role(auth.uid(), wedding_id, 'manager')
  );

CREATE POLICY "Only co-planners can delete categories"
  ON public.expense_categories FOR DELETE
  USING (public.has_wedding_role(auth.uid(), wedding_id, 'co_planner'));

-- Update vendors policies
DROP POLICY IF EXISTS "Users can manage vendors for their wedding" ON public.vendors;

CREATE POLICY "Users can view vendors for accessible weddings"
  ON public.vendors FOR SELECT
  USING (public.has_wedding_access(auth.uid(), wedding_id));

CREATE POLICY "Co-planners and managers can manage vendors"
  ON public.vendors FOR ALL
  USING (
    public.has_wedding_role(auth.uid(), wedding_id, 'co_planner') OR
    public.has_wedding_role(auth.uid(), wedding_id, 'manager')
  );

-- Update expenses policies
DROP POLICY IF EXISTS "Users can manage expenses for their wedding" ON public.expenses;

CREATE POLICY "Users can view expenses for accessible weddings"
  ON public.expenses FOR SELECT
  USING (public.has_wedding_access(auth.uid(), wedding_id));

CREATE POLICY "Co-planners and managers can manage expenses"
  ON public.expenses FOR ALL
  USING (
    public.has_wedding_role(auth.uid(), wedding_id, 'co_planner') OR
    public.has_wedding_role(auth.uid(), wedding_id, 'manager')
  );

-- Update payments policies
DROP POLICY IF EXISTS "Users can manage payments for their wedding expenses" ON public.payments;

CREATE POLICY "Users can view payments for accessible expenses"
  ON public.payments FOR SELECT
  USING (
    expense_id IN (
      SELECT id FROM public.expenses WHERE public.has_wedding_access(auth.uid(), wedding_id)
    )
  );

CREATE POLICY "Co-planners and managers can manage payments"
  ON public.payments FOR ALL
  USING (
    expense_id IN (
      SELECT id FROM public.expenses WHERE 
        public.has_wedding_role(auth.uid(), wedding_id, 'co_planner') OR
        public.has_wedding_role(auth.uid(), wedding_id, 'manager')
    )
  );

-- Update checklist tasks policies
DROP POLICY IF EXISTS "Users can manage tasks for their wedding" ON public.checklist_tasks;

CREATE POLICY "Users can view tasks for accessible weddings"
  ON public.checklist_tasks FOR SELECT
  USING (public.has_wedding_access(auth.uid(), wedding_id));

CREATE POLICY "Co-planners and managers can manage tasks"
  ON public.checklist_tasks FOR ALL
  USING (
    public.has_wedding_role(auth.uid(), wedding_id, 'co_planner') OR
    public.has_wedding_role(auth.uid(), wedding_id, 'manager')
  );

-- Create invitations table for partner and manager invites
CREATE TABLE public.wedding_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID REFERENCES public.weddings(id) ON DELETE CASCADE NOT NULL,
  invited_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  role public.app_role NOT NULL,
  token TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE public.wedding_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view invitations for their weddings"
  ON public.wedding_invitations FOR SELECT
  USING (
    public.has_wedding_role(auth.uid(), wedding_id, 'co_planner')
  );

CREATE POLICY "Co-planners can create invitations"
  ON public.wedding_invitations FOR INSERT
  WITH CHECK (
    public.has_wedding_role(auth.uid(), wedding_id, 'co_planner')
  );

CREATE POLICY "Co-planners can delete invitations"
  ON public.wedding_invitations FOR DELETE
  USING (
    public.has_wedding_role(auth.uid(), wedding_id, 'co_planner')
  );