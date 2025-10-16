-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create weddings table
CREATE TABLE public.weddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner1_name TEXT NOT NULL,
  partner2_name TEXT NOT NULL,
  wedding_date DATE NOT NULL,
  total_budget DECIMAL(10,2),
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE public.weddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own wedding"
  ON public.weddings FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Users can create their own wedding"
  ON public.weddings FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own wedding"
  ON public.weddings FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own wedding"
  ON public.weddings FOR DELETE
  USING (auth.uid() = created_by);

-- Create guest_groups table for customizable grouping
CREATE TABLE public.guest_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID REFERENCES public.weddings(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE public.guest_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage groups for their wedding"
  ON public.guest_groups FOR ALL
  USING (
    wedding_id IN (
      SELECT id FROM public.weddings WHERE created_by = auth.uid()
    )
  );

-- Create guests table
CREATE TABLE public.guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID REFERENCES public.weddings(id) ON DELETE CASCADE NOT NULL,
  group_id UUID REFERENCES public.guest_groups(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  rsvp_status TEXT DEFAULT 'pending' CHECK (rsvp_status IN ('pending', 'confirmed', 'declined')),
  adults_count INTEGER DEFAULT 1,
  children_count INTEGER DEFAULT 0,
  menu_choice TEXT,
  dietary_restrictions TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage guests for their wedding"
  ON public.guests FOR ALL
  USING (
    wedding_id IN (
      SELECT id FROM public.weddings WHERE created_by = auth.uid()
    )
  );

-- Create expense_categories table
CREATE TABLE public.expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID REFERENCES public.weddings(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage categories for their wedding"
  ON public.expense_categories FOR ALL
  USING (
    wedding_id IN (
      SELECT id FROM public.weddings WHERE created_by = auth.uid()
    )
  );

-- Create vendors table
CREATE TABLE public.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID REFERENCES public.weddings(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  category_id UUID REFERENCES public.expense_categories(id) ON DELETE SET NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  status TEXT DEFAULT 'evaluating' CHECK (status IN ('evaluating', 'confirmed', 'declined')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage vendors for their wedding"
  ON public.vendors FOR ALL
  USING (
    wedding_id IN (
      SELECT id FROM public.weddings WHERE created_by = auth.uid()
    )
  );

-- Create expenses table
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID REFERENCES public.weddings(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES public.expense_categories(id) ON DELETE SET NULL NOT NULL,
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  estimated_amount DECIMAL(10,2) NOT NULL,
  final_amount DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage expenses for their wedding"
  ON public.expenses FOR ALL
  USING (
    wedding_id IN (
      SELECT id FROM public.weddings WHERE created_by = auth.uid()
    )
  );

-- Create payments table for installment tracking
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID REFERENCES public.expenses(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  due_date DATE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  paid_by TEXT,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage payments for their wedding expenses"
  ON public.payments FOR ALL
  USING (
    expense_id IN (
      SELECT id FROM public.expenses WHERE wedding_id IN (
        SELECT id FROM public.weddings WHERE created_by = auth.uid()
      )
    )
  );

-- Create checklist_tasks table
CREATE TABLE public.checklist_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID REFERENCES public.weddings(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  assigned_to TEXT CHECK (assigned_to IN ('partner1', 'partner2', 'both')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  is_system_generated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE public.checklist_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage tasks for their wedding"
  ON public.checklist_tasks FOR ALL
  USING (
    wedding_id IN (
      SELECT id FROM public.weddings WHERE created_by = auth.uid()
    )
  );

-- Create trigger function for updating updated_at columns
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all tables with updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_weddings_updated_at
  BEFORE UPDATE ON public.weddings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_guests_updated_at
  BEFORE UPDATE ON public.guests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vendors_updated_at
  BEFORE UPDATE ON public.vendors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_checklist_tasks_updated_at
  BEFORE UPDATE ON public.checklist_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name'
  );
  RETURN NEW;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();