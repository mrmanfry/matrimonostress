-- Check if app_role enum exists, create only if not
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('co_planner', 'manager', 'guest');
  END IF;
END $$;

-- Create user_roles table if not exists
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  wedding_id UUID REFERENCES public.weddings(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, wedding_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer functions
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

-- RLS Policies for user_roles
DROP POLICY IF EXISTS "Users can view roles for weddings they have access to" ON public.user_roles;
DROP POLICY IF EXISTS "Only co-planners can manage roles" ON public.user_roles;

CREATE POLICY "Users can view roles for weddings they have access to"
  ON public.user_roles FOR SELECT
  USING (public.has_wedding_access(auth.uid(), wedding_id));

CREATE POLICY "Only co-planners can manage roles"
  ON public.user_roles FOR ALL
  USING (public.has_wedding_role(auth.uid(), wedding_id, 'co_planner'));

-- Auto-assign co_planner role on wedding creation
CREATE OR REPLACE FUNCTION public.assign_co_planner_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, wedding_id, role)
  VALUES (NEW.created_by, NEW.id, 'co_planner')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_wedding_created ON public.weddings;
CREATE TRIGGER on_wedding_created
  AFTER INSERT ON public.weddings
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_co_planner_role();

-- Create invitations table
CREATE TABLE IF NOT EXISTS public.wedding_invitations (
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

DROP POLICY IF EXISTS "Users can view invitations for their weddings" ON public.wedding_invitations;
DROP POLICY IF EXISTS "Co-planners can create invitations" ON public.wedding_invitations;
DROP POLICY IF EXISTS "Co-planners can delete invitations" ON public.wedding_invitations;

CREATE POLICY "Users can view invitations for their weddings"
  ON public.wedding_invitations FOR SELECT
  USING (public.has_wedding_role(auth.uid(), wedding_id, 'co_planner'));

CREATE POLICY "Co-planners can create invitations"
  ON public.wedding_invitations FOR INSERT
  WITH CHECK (public.has_wedding_role(auth.uid(), wedding_id, 'co_planner'));

CREATE POLICY "Co-planners can delete invitations"
  ON public.wedding_invitations FOR DELETE
  USING (public.has_wedding_role(auth.uid(), wedding_id, 'co_planner'));