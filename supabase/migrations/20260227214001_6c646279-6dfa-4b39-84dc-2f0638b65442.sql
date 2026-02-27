
-- Add permissions_config column
ALTER TABLE public.user_roles 
ADD COLUMN IF NOT EXISTS permissions_config jsonb DEFAULT NULL;

-- Update get_user_context() for multi-wedding
CREATE OR REPLACE FUNCTION public.get_user_context()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'weddings', COALESCE(json_agg(row_to_json(w)), '[]'::json)
  ) INTO result
  FROM (
    SELECT 
      ur.wedding_id,
      ur.role::text,
      ur.permissions_config,
      wed.partner1_name,
      wed.partner2_name,
      wed.wedding_date::text
    FROM user_roles ur
    JOIN weddings wed ON wed.id = ur.wedding_id
    WHERE ur.user_id = auth.uid()
    
    UNION
    
    SELECT 
      wed.id AS wedding_id,
      'owner'::text AS role,
      NULL::jsonb AS permissions_config,
      wed.partner1_name,
      wed.partner2_name,
      wed.wedding_date::text
    FROM weddings wed
    WHERE wed.created_by = auth.uid()
      AND NOT EXISTS (
        SELECT 1 FROM user_roles ur2 
        WHERE ur2.user_id = auth.uid() AND ur2.wedding_id = wed.id
      )
    
    ORDER BY wedding_date ASC
  ) w;

  RETURN result;
END;
$function$;

-- Update get_wedding_role to include planner
CREATE OR REPLACE FUNCTION public.get_wedding_role(_user_id uuid, _wedding_id uuid)
 RETURNS app_role
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
    AND wedding_id = _wedding_id
  ORDER BY CASE role
    WHEN 'co_planner' THEN 1
    WHEN 'planner' THEN 2
    WHEN 'manager' THEN 3
    WHEN 'guest' THEN 4
  END
  LIMIT 1
$function$;

-- Weddings UPDATE
DROP POLICY IF EXISTS "Co-planners can update their wedding" ON public.weddings;
CREATE POLICY "Co-planners and planners can update their wedding" 
ON public.weddings FOR UPDATE
USING (has_wedding_role(auth.uid(), id, 'co_planner'::app_role) OR has_wedding_role(auth.uid(), id, 'planner'::app_role));

-- Guests
DROP POLICY IF EXISTS "Co-planners and managers can manage guests" ON public.guests;
CREATE POLICY "Planners can insert guests" ON public.guests FOR INSERT
WITH CHECK (has_wedding_role(auth.uid(), wedding_id, 'co_planner'::app_role) OR has_wedding_role(auth.uid(), wedding_id, 'manager'::app_role) OR has_wedding_role(auth.uid(), wedding_id, 'planner'::app_role));

DROP POLICY IF EXISTS "Co-planners and managers can update guests" ON public.guests;
CREATE POLICY "Planners can update guests" ON public.guests FOR UPDATE
USING (has_wedding_role(auth.uid(), wedding_id, 'co_planner'::app_role) OR has_wedding_role(auth.uid(), wedding_id, 'manager'::app_role) OR has_wedding_role(auth.uid(), wedding_id, 'planner'::app_role));

DROP POLICY IF EXISTS "Co-planners and managers can delete guests" ON public.guests;
CREATE POLICY "Planners can delete guests" ON public.guests FOR DELETE
USING (has_wedding_role(auth.uid(), wedding_id, 'co_planner'::app_role) OR has_wedding_role(auth.uid(), wedding_id, 'manager'::app_role) OR has_wedding_role(auth.uid(), wedding_id, 'planner'::app_role));

DROP POLICY IF EXISTS "Co-planners and managers can view guests" ON public.guests;
CREATE POLICY "Planners can view guests" ON public.guests FOR SELECT
USING (has_wedding_role(auth.uid(), wedding_id, 'co_planner'::app_role) OR has_wedding_role(auth.uid(), wedding_id, 'manager'::app_role) OR has_wedding_role(auth.uid(), wedding_id, 'planner'::app_role));

-- Vendors
DROP POLICY IF EXISTS "Co-planners and managers can manage vendors" ON public.vendors;
CREATE POLICY "Planners can manage vendors" ON public.vendors FOR ALL
USING (has_wedding_role(auth.uid(), wedding_id, 'co_planner'::app_role) OR has_wedding_role(auth.uid(), wedding_id, 'manager'::app_role) OR has_wedding_role(auth.uid(), wedding_id, 'planner'::app_role));

DROP POLICY IF EXISTS "Co-planners and managers can view vendors" ON public.vendors;
CREATE POLICY "Planners can view vendors" ON public.vendors FOR SELECT
USING (has_wedding_role(auth.uid(), wedding_id, 'co_planner'::app_role) OR has_wedding_role(auth.uid(), wedding_id, 'manager'::app_role) OR has_wedding_role(auth.uid(), wedding_id, 'planner'::app_role));

-- Checklist tasks
DROP POLICY IF EXISTS "Co-planners and managers can manage tasks" ON public.checklist_tasks;
CREATE POLICY "Planners can manage tasks" ON public.checklist_tasks FOR ALL
USING (has_wedding_role(auth.uid(), wedding_id, 'co_planner'::app_role) OR has_wedding_role(auth.uid(), wedding_id, 'manager'::app_role) OR has_wedding_role(auth.uid(), wedding_id, 'planner'::app_role));

-- Expense items
DROP POLICY IF EXISTS "Co-planners and managers can manage expense items" ON public.expense_items;
CREATE POLICY "Planners can manage expense items" ON public.expense_items FOR ALL
USING (has_wedding_role(auth.uid(), wedding_id, 'co_planner'::app_role) OR has_wedding_role(auth.uid(), wedding_id, 'manager'::app_role) OR has_wedding_role(auth.uid(), wedding_id, 'planner'::app_role));

-- Expense line items
DROP POLICY IF EXISTS "Co-planners and managers can manage line items" ON public.expense_line_items;
CREATE POLICY "Planners can manage line items" ON public.expense_line_items FOR ALL
USING (expense_item_id IN (SELECT ei.id FROM expense_items ei WHERE has_wedding_role(auth.uid(), ei.wedding_id, 'co_planner'::app_role) OR has_wedding_role(auth.uid(), ei.wedding_id, 'manager'::app_role) OR has_wedding_role(auth.uid(), ei.wedding_id, 'planner'::app_role)));

-- Payments
DROP POLICY IF EXISTS "Co-planners and managers can manage payments" ON public.payments;
CREATE POLICY "Planners can manage payments" ON public.payments FOR ALL
USING (expense_item_id IN (SELECT ei.id FROM expense_items ei WHERE has_wedding_role(auth.uid(), ei.wedding_id, 'co_planner'::app_role) OR has_wedding_role(auth.uid(), ei.wedding_id, 'manager'::app_role) OR has_wedding_role(auth.uid(), ei.wedding_id, 'planner'::app_role)));

-- Payment allocations
DROP POLICY IF EXISTS "Co-planners and managers can manage allocations" ON public.payment_allocations;
CREATE POLICY "Planners can manage allocations" ON public.payment_allocations FOR ALL
USING (payment_id IN (SELECT p.id FROM payments p JOIN expense_items ei ON p.expense_item_id = ei.id WHERE has_wedding_role(auth.uid(), ei.wedding_id, 'co_planner'::app_role) OR has_wedding_role(auth.uid(), ei.wedding_id, 'manager'::app_role) OR has_wedding_role(auth.uid(), ei.wedding_id, 'planner'::app_role)));

-- Financial contributors
DROP POLICY IF EXISTS "Co-planners and managers can manage contributors" ON public.financial_contributors;
CREATE POLICY "Planners can manage contributors" ON public.financial_contributors FOR ALL
USING (has_wedding_role(auth.uid(), wedding_id, 'co_planner'::app_role) OR has_wedding_role(auth.uid(), wedding_id, 'manager'::app_role) OR has_wedding_role(auth.uid(), wedding_id, 'planner'::app_role));

-- Tables
DROP POLICY IF EXISTS "Co-planners and managers can manage tables" ON public.tables;
CREATE POLICY "Planners can manage tables" ON public.tables FOR ALL
USING (has_wedding_role(auth.uid(), wedding_id, 'co_planner'::app_role) OR has_wedding_role(auth.uid(), wedding_id, 'manager'::app_role) OR has_wedding_role(auth.uid(), wedding_id, 'planner'::app_role));

-- Table assignments
DROP POLICY IF EXISTS "Co-planners and managers can manage assignments" ON public.table_assignments;
CREATE POLICY "Planners can manage assignments" ON public.table_assignments FOR ALL
USING (table_id IN (SELECT t.id FROM tables t WHERE has_wedding_role(auth.uid(), t.wedding_id, 'co_planner'::app_role) OR has_wedding_role(auth.uid(), t.wedding_id, 'manager'::app_role) OR has_wedding_role(auth.uid(), t.wedding_id, 'planner'::app_role)));

-- Timeline events
DROP POLICY IF EXISTS "Co-planners and managers can manage events" ON public.timeline_events;
CREATE POLICY "Planners can manage events" ON public.timeline_events FOR ALL
USING (has_wedding_role(auth.uid(), wedding_id, 'co_planner'::app_role) OR has_wedding_role(auth.uid(), wedding_id, 'manager'::app_role) OR has_wedding_role(auth.uid(), wedding_id, 'planner'::app_role));

-- Guest groups
DROP POLICY IF EXISTS "Co-planners and managers can manage groups" ON public.guest_groups;
CREATE POLICY "Planners can manage groups" ON public.guest_groups FOR ALL
USING (has_wedding_role(auth.uid(), wedding_id, 'co_planner'::app_role) OR has_wedding_role(auth.uid(), wedding_id, 'manager'::app_role) OR has_wedding_role(auth.uid(), wedding_id, 'planner'::app_role));

-- Guest conflicts
DROP POLICY IF EXISTS "Co-planners and managers can manage conflicts" ON public.guest_conflicts;
CREATE POLICY "Planners can manage conflicts" ON public.guest_conflicts FOR ALL
USING (has_wedding_role(auth.uid(), wedding_id, 'co_planner'::app_role) OR has_wedding_role(auth.uid(), wedding_id, 'manager'::app_role) OR has_wedding_role(auth.uid(), wedding_id, 'planner'::app_role));

-- Invite parties
DROP POLICY IF EXISTS "Co-planners and managers can manage parties" ON public.invite_parties;
CREATE POLICY "Planners can manage parties" ON public.invite_parties FOR ALL
USING (has_wedding_role(auth.uid(), wedding_id, 'co_planner'::app_role) OR has_wedding_role(auth.uid(), wedding_id, 'manager'::app_role) OR has_wedding_role(auth.uid(), wedding_id, 'planner'::app_role));

-- Vendor appointments
DROP POLICY IF EXISTS "Co-planners and managers can manage appointments" ON public.vendor_appointments;
CREATE POLICY "Planners can manage appointments" ON public.vendor_appointments FOR ALL
USING (has_wedding_role(auth.uid(), wedding_id, 'co_planner'::app_role) OR has_wedding_role(auth.uid(), wedding_id, 'manager'::app_role) OR has_wedding_role(auth.uid(), wedding_id, 'planner'::app_role));

-- Expense categories
DROP POLICY IF EXISTS "Co-planners and managers can create categories" ON public.expense_categories;
CREATE POLICY "Planners can create categories" ON public.expense_categories FOR INSERT
WITH CHECK (has_wedding_role(auth.uid(), wedding_id, 'co_planner'::app_role) OR has_wedding_role(auth.uid(), wedding_id, 'manager'::app_role) OR has_wedding_role(auth.uid(), wedding_id, 'planner'::app_role));

DROP POLICY IF EXISTS "Co-planners and managers can update categories" ON public.expense_categories;
CREATE POLICY "Planners can update categories" ON public.expense_categories FOR UPDATE
USING (has_wedding_role(auth.uid(), wedding_id, 'co_planner'::app_role) OR has_wedding_role(auth.uid(), wedding_id, 'manager'::app_role) OR has_wedding_role(auth.uid(), wedding_id, 'planner'::app_role));

-- Timeline tokens
DROP POLICY IF EXISTS "Co-planners can create tokens" ON public.timeline_tokens;
CREATE POLICY "Planners can create tokens" ON public.timeline_tokens FOR INSERT
WITH CHECK (has_wedding_role(auth.uid(), wedding_id, 'co_planner'::app_role) OR has_wedding_role(auth.uid(), wedding_id, 'manager'::app_role) OR has_wedding_role(auth.uid(), wedding_id, 'planner'::app_role));

DROP POLICY IF EXISTS "Co-planners can delete tokens" ON public.timeline_tokens;
CREATE POLICY "Planners can delete tokens" ON public.timeline_tokens FOR DELETE
USING (has_wedding_role(auth.uid(), wedding_id, 'co_planner'::app_role) OR has_wedding_role(auth.uid(), wedding_id, 'manager'::app_role) OR has_wedding_role(auth.uid(), wedding_id, 'planner'::app_role));

-- Progress tokens
DROP POLICY IF EXISTS "Co-planners can manage progress tokens" ON public.progress_tokens;
CREATE POLICY "Planners can manage progress tokens" ON public.progress_tokens FOR ALL
USING (has_wedding_role(auth.uid(), wedding_id, 'co_planner'::app_role) OR has_wedding_role(auth.uid(), wedding_id, 'manager'::app_role) OR has_wedding_role(auth.uid(), wedding_id, 'planner'::app_role));

-- Wedding invitations
DROP POLICY IF EXISTS "Co-planners can create invitations" ON public.wedding_invitations;
CREATE POLICY "Planners can create invitations" ON public.wedding_invitations FOR INSERT
WITH CHECK (has_wedding_role(auth.uid(), wedding_id, 'co_planner'::app_role) OR has_wedding_role(auth.uid(), wedding_id, 'planner'::app_role));

DROP POLICY IF EXISTS "Co-planners can delete invitations" ON public.wedding_invitations;
CREATE POLICY "Planners can delete invitations" ON public.wedding_invitations FOR DELETE
USING (has_wedding_role(auth.uid(), wedding_id, 'co_planner'::app_role) OR has_wedding_role(auth.uid(), wedding_id, 'planner'::app_role));

DROP POLICY IF EXISTS "Users can view invitations for their weddings" ON public.wedding_invitations;
DROP POLICY IF EXISTS "Users can view invitations sent to their email" ON public.wedding_invitations;
CREATE POLICY "View invitations" ON public.wedding_invitations FOR SELECT
USING (has_wedding_role(auth.uid(), wedding_id, 'co_planner'::app_role) OR has_wedding_role(auth.uid(), wedding_id, 'planner'::app_role) OR email = get_user_email(auth.uid()));

-- Vendor contracts
DROP POLICY IF EXISTS "Co-planners can manage contracts" ON public.vendor_contracts;
CREATE POLICY "Planners can manage contracts" ON public.vendor_contracts FOR ALL
USING (has_wedding_role(auth.uid(), wedding_id, 'co_planner'::app_role) OR has_wedding_role(auth.uid(), wedding_id, 'planner'::app_role))
WITH CHECK (has_wedding_role(auth.uid(), wedding_id, 'co_planner'::app_role) OR has_wedding_role(auth.uid(), wedding_id, 'planner'::app_role));
