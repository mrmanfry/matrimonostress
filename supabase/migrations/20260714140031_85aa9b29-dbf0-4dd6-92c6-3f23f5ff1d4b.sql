
CREATE OR REPLACE FUNCTION public.has_wedding_permission(
  _user_id uuid, _wedding_id uuid, _area text, _level text
) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id AND ur.wedding_id = _wedding_id
      AND (
        ur.role IN ('co_planner', 'planner')
        OR (ur.role = 'manager'
            AND COALESCE((ur.permissions_config -> _area ->> _level)::boolean, false) = true)
      )
  );
$$;
GRANT EXECUTE ON FUNCTION public.has_wedding_permission(uuid, uuid, text, text) TO authenticated;

UPDATE public.user_roles
SET permissions_config = jsonb_build_object(
  'guests',         jsonb_build_object('view', true, 'edit', true, 'create', true),
  'communications', jsonb_build_object('view', true, 'edit', true, 'create', true),
  'budget',         jsonb_build_object('view', true, 'edit', true, 'create', true),
  'gifts',          jsonb_build_object('view', true, 'edit', true, 'create', true),
  'vendors',        jsonb_build_object('view', true, 'edit', true, 'create', true),
  'vendor_costs',   jsonb_build_object('view', true, 'edit', true, 'create', true),
  'checklist',      jsonb_build_object('view', true, 'edit', true, 'create', true),
  'chat',           jsonb_build_object('view', true, 'edit', true, 'create', true),
  'calendar',       jsonb_build_object('view', true, 'edit', true, 'create', true),
  'tables',         jsonb_build_object('view', true, 'edit', true, 'create', true),
  'catering',       jsonb_build_object('view', true, 'edit', true, 'create', true),
  'accommodation',  jsonb_build_object('view', true, 'edit', true, 'create', true),
  'memories',       jsonb_build_object('view', true, 'edit', true, 'create', true),
  'mass_booklet',   jsonb_build_object('view', true, 'edit', true, 'create', true),
  'timeline',       jsonb_build_object('view', true, 'edit', true, 'create', true)
)
WHERE role = 'manager' AND (permissions_config IS NULL OR NOT (permissions_config ? 'checklist'));

-- GUESTS
DROP POLICY IF EXISTS "Planners can view guests" ON public.guests;
DROP POLICY IF EXISTS "Planners can insert guests" ON public.guests;
DROP POLICY IF EXISTS "Planners can update guests" ON public.guests;
DROP POLICY IF EXISTS "Planners can delete guests" ON public.guests;
CREATE POLICY "guests_select" ON public.guests FOR SELECT USING (public.has_wedding_permission(auth.uid(), wedding_id, 'guests', 'view'));
CREATE POLICY "guests_insert" ON public.guests FOR INSERT WITH CHECK (public.has_wedding_permission(auth.uid(), wedding_id, 'guests', 'create'));
CREATE POLICY "guests_update" ON public.guests FOR UPDATE USING (public.has_wedding_permission(auth.uid(), wedding_id, 'guests', 'edit')) WITH CHECK (public.has_wedding_permission(auth.uid(), wedding_id, 'guests', 'edit'));
CREATE POLICY "guests_delete" ON public.guests FOR DELETE USING (public.has_wedding_permission(auth.uid(), wedding_id, 'guests', 'edit'));

-- INVITE_PARTIES
DROP POLICY IF EXISTS "Planners can manage parties" ON public.invite_parties;
DROP POLICY IF EXISTS "Users can view parties for accessible weddings" ON public.invite_parties;
CREATE POLICY "parties_select" ON public.invite_parties FOR SELECT USING (public.has_wedding_permission(auth.uid(), wedding_id, 'guests', 'view'));
CREATE POLICY "parties_insert" ON public.invite_parties FOR INSERT WITH CHECK (public.has_wedding_permission(auth.uid(), wedding_id, 'guests', 'create'));
CREATE POLICY "parties_update" ON public.invite_parties FOR UPDATE USING (public.has_wedding_permission(auth.uid(), wedding_id, 'guests', 'edit')) WITH CHECK (public.has_wedding_permission(auth.uid(), wedding_id, 'guests', 'edit'));
CREATE POLICY "parties_delete" ON public.invite_parties FOR DELETE USING (public.has_wedding_permission(auth.uid(), wedding_id, 'guests', 'edit'));

-- GUEST_GROUPS
DROP POLICY IF EXISTS "Planners can manage groups" ON public.guest_groups;
DROP POLICY IF EXISTS "Users can view groups for accessible weddings" ON public.guest_groups;
CREATE POLICY "groups_select" ON public.guest_groups FOR SELECT USING (public.has_wedding_permission(auth.uid(), wedding_id, 'guests', 'view'));
CREATE POLICY "groups_insert" ON public.guest_groups FOR INSERT WITH CHECK (public.has_wedding_permission(auth.uid(), wedding_id, 'guests', 'create'));
CREATE POLICY "groups_update" ON public.guest_groups FOR UPDATE USING (public.has_wedding_permission(auth.uid(), wedding_id, 'guests', 'edit')) WITH CHECK (public.has_wedding_permission(auth.uid(), wedding_id, 'guests', 'edit'));
CREATE POLICY "groups_delete" ON public.guest_groups FOR DELETE USING (public.has_wedding_permission(auth.uid(), wedding_id, 'guests', 'edit'));

-- GUEST_CONFLICTS
DROP POLICY IF EXISTS "Planners can manage conflicts" ON public.guest_conflicts;
DROP POLICY IF EXISTS "Users can view conflicts for accessible weddings" ON public.guest_conflicts;
CREATE POLICY "conflicts_select" ON public.guest_conflicts FOR SELECT USING (public.has_wedding_permission(auth.uid(), wedding_id, 'guests', 'view'));
CREATE POLICY "conflicts_insert" ON public.guest_conflicts FOR INSERT WITH CHECK (public.has_wedding_permission(auth.uid(), wedding_id, 'guests', 'create'));
CREATE POLICY "conflicts_update" ON public.guest_conflicts FOR UPDATE USING (public.has_wedding_permission(auth.uid(), wedding_id, 'guests', 'edit')) WITH CHECK (public.has_wedding_permission(auth.uid(), wedding_id, 'guests', 'edit'));
CREATE POLICY "conflicts_delete" ON public.guest_conflicts FOR DELETE USING (public.has_wedding_permission(auth.uid(), wedding_id, 'guests', 'edit'));

-- VENDORS
DROP POLICY IF EXISTS "Planners can manage vendors" ON public.vendors;
DROP POLICY IF EXISTS "Planners can view vendors" ON public.vendors;
CREATE POLICY "vendors_select" ON public.vendors FOR SELECT USING (public.has_wedding_permission(auth.uid(), wedding_id, 'vendors', 'view'));
CREATE POLICY "vendors_insert" ON public.vendors FOR INSERT WITH CHECK (public.has_wedding_permission(auth.uid(), wedding_id, 'vendors', 'create'));
CREATE POLICY "vendors_update" ON public.vendors FOR UPDATE USING (public.has_wedding_permission(auth.uid(), wedding_id, 'vendors', 'edit')) WITH CHECK (public.has_wedding_permission(auth.uid(), wedding_id, 'vendors', 'edit'));
CREATE POLICY "vendors_delete" ON public.vendors FOR DELETE USING (public.has_wedding_permission(auth.uid(), wedding_id, 'vendors', 'edit'));

-- VENDOR_APPOINTMENTS
DROP POLICY IF EXISTS "Planners can manage appointments" ON public.vendor_appointments;
DROP POLICY IF EXISTS "Users can view appointments for accessible weddings" ON public.vendor_appointments;
CREATE POLICY "vappt_select" ON public.vendor_appointments FOR SELECT USING (public.has_wedding_permission(auth.uid(), wedding_id, 'vendors', 'view'));
CREATE POLICY "vappt_insert" ON public.vendor_appointments FOR INSERT WITH CHECK (public.has_wedding_permission(auth.uid(), wedding_id, 'vendors', 'create'));
CREATE POLICY "vappt_update" ON public.vendor_appointments FOR UPDATE USING (public.has_wedding_permission(auth.uid(), wedding_id, 'vendors', 'edit')) WITH CHECK (public.has_wedding_permission(auth.uid(), wedding_id, 'vendors', 'edit'));
CREATE POLICY "vappt_delete" ON public.vendor_appointments FOR DELETE USING (public.has_wedding_permission(auth.uid(), wedding_id, 'vendors', 'edit'));

-- VENDOR_COMMUNICATIONS
DROP POLICY IF EXISTS "Non-guests can write vendor communications" ON public.vendor_communications;
DROP POLICY IF EXISTS "Members can view vendor communications" ON public.vendor_communications;
CREATE POLICY "vcomm_select" ON public.vendor_communications FOR SELECT USING (public.has_wedding_permission(auth.uid(), wedding_id, 'vendors', 'view'));
CREATE POLICY "vcomm_insert" ON public.vendor_communications FOR INSERT WITH CHECK (public.has_wedding_permission(auth.uid(), wedding_id, 'vendors', 'create'));
CREATE POLICY "vcomm_update" ON public.vendor_communications FOR UPDATE USING (public.has_wedding_permission(auth.uid(), wedding_id, 'vendors', 'edit')) WITH CHECK (public.has_wedding_permission(auth.uid(), wedding_id, 'vendors', 'edit'));
CREATE POLICY "vcomm_delete" ON public.vendor_communications FOR DELETE USING (public.has_wedding_permission(auth.uid(), wedding_id, 'vendors', 'edit'));

-- VENDOR_CONTRACTS
DROP POLICY IF EXISTS "Planners can manage contracts" ON public.vendor_contracts;
CREATE POLICY "vcontract_select" ON public.vendor_contracts FOR SELECT USING (public.has_wedding_permission(auth.uid(), wedding_id, 'vendors', 'view') AND public.has_wedding_permission(auth.uid(), wedding_id, 'vendor_costs', 'view'));
CREATE POLICY "vcontract_insert" ON public.vendor_contracts FOR INSERT WITH CHECK (public.has_wedding_permission(auth.uid(), wedding_id, 'vendors', 'create'));
CREATE POLICY "vcontract_update" ON public.vendor_contracts FOR UPDATE USING (public.has_wedding_permission(auth.uid(), wedding_id, 'vendors', 'edit')) WITH CHECK (public.has_wedding_permission(auth.uid(), wedding_id, 'vendors', 'edit'));
CREATE POLICY "vcontract_delete" ON public.vendor_contracts FOR DELETE USING (public.has_wedding_permission(auth.uid(), wedding_id, 'vendors', 'edit'));

-- EXPENSE_ITEMS
DROP POLICY IF EXISTS "Planners can manage expense items" ON public.expense_items;
DROP POLICY IF EXISTS "Users can view expense items for accessible weddings" ON public.expense_items;
CREATE POLICY "expitems_select" ON public.expense_items FOR SELECT USING (public.has_wedding_permission(auth.uid(), wedding_id, 'budget', 'view'));
CREATE POLICY "expitems_insert" ON public.expense_items FOR INSERT WITH CHECK (public.has_wedding_permission(auth.uid(), wedding_id, 'budget', 'create'));
CREATE POLICY "expitems_update" ON public.expense_items FOR UPDATE USING (public.has_wedding_permission(auth.uid(), wedding_id, 'budget', 'edit')) WITH CHECK (public.has_wedding_permission(auth.uid(), wedding_id, 'budget', 'edit'));
CREATE POLICY "expitems_delete" ON public.expense_items FOR DELETE USING (public.has_wedding_permission(auth.uid(), wedding_id, 'budget', 'edit'));

-- EXPENSE_LINE_ITEMS
DROP POLICY IF EXISTS "Planners can manage line items" ON public.expense_line_items;
DROP POLICY IF EXISTS "Users can view line items for accessible expense items" ON public.expense_line_items;
CREATE POLICY "expline_select" ON public.expense_line_items FOR SELECT USING (expense_item_id IN (SELECT id FROM public.expense_items ei WHERE public.has_wedding_permission(auth.uid(), ei.wedding_id, 'budget', 'view')));
CREATE POLICY "expline_insert" ON public.expense_line_items FOR INSERT WITH CHECK (expense_item_id IN (SELECT id FROM public.expense_items ei WHERE public.has_wedding_permission(auth.uid(), ei.wedding_id, 'budget', 'create')));
CREATE POLICY "expline_update" ON public.expense_line_items FOR UPDATE USING (expense_item_id IN (SELECT id FROM public.expense_items ei WHERE public.has_wedding_permission(auth.uid(), ei.wedding_id, 'budget', 'edit'))) WITH CHECK (expense_item_id IN (SELECT id FROM public.expense_items ei WHERE public.has_wedding_permission(auth.uid(), ei.wedding_id, 'budget', 'edit')));
CREATE POLICY "expline_delete" ON public.expense_line_items FOR DELETE USING (expense_item_id IN (SELECT id FROM public.expense_items ei WHERE public.has_wedding_permission(auth.uid(), ei.wedding_id, 'budget', 'edit')));

-- PAYMENTS
DROP POLICY IF EXISTS "Planners can manage payments" ON public.payments;
DROP POLICY IF EXISTS "Users can view payments for accessible expense items" ON public.payments;
CREATE POLICY "payments_select" ON public.payments FOR SELECT USING (expense_item_id IN (SELECT id FROM public.expense_items ei WHERE public.has_wedding_permission(auth.uid(), ei.wedding_id, 'budget', 'view')));
CREATE POLICY "payments_insert" ON public.payments FOR INSERT WITH CHECK (expense_item_id IN (SELECT id FROM public.expense_items ei WHERE public.has_wedding_permission(auth.uid(), ei.wedding_id, 'budget', 'create')));
CREATE POLICY "payments_update" ON public.payments FOR UPDATE USING (expense_item_id IN (SELECT id FROM public.expense_items ei WHERE public.has_wedding_permission(auth.uid(), ei.wedding_id, 'budget', 'edit'))) WITH CHECK (expense_item_id IN (SELECT id FROM public.expense_items ei WHERE public.has_wedding_permission(auth.uid(), ei.wedding_id, 'budget', 'edit')));
CREATE POLICY "payments_delete" ON public.payments FOR DELETE USING (expense_item_id IN (SELECT id FROM public.expense_items ei WHERE public.has_wedding_permission(auth.uid(), ei.wedding_id, 'budget', 'edit')));

-- PAYMENT_ALLOCATIONS
DROP POLICY IF EXISTS "Planners can manage allocations" ON public.payment_allocations;
DROP POLICY IF EXISTS "Users can view allocations for accessible payments" ON public.payment_allocations;
CREATE POLICY "palloc_select" ON public.payment_allocations FOR SELECT USING (payment_id IN (SELECT p.id FROM public.payments p JOIN public.expense_items ei ON ei.id = p.expense_item_id WHERE public.has_wedding_permission(auth.uid(), ei.wedding_id, 'budget', 'view')));
CREATE POLICY "palloc_insert" ON public.payment_allocations FOR INSERT WITH CHECK (payment_id IN (SELECT p.id FROM public.payments p JOIN public.expense_items ei ON ei.id = p.expense_item_id WHERE public.has_wedding_permission(auth.uid(), ei.wedding_id, 'budget', 'edit')));
CREATE POLICY "palloc_update" ON public.payment_allocations FOR UPDATE USING (payment_id IN (SELECT p.id FROM public.payments p JOIN public.expense_items ei ON ei.id = p.expense_item_id WHERE public.has_wedding_permission(auth.uid(), ei.wedding_id, 'budget', 'edit'))) WITH CHECK (payment_id IN (SELECT p.id FROM public.payments p JOIN public.expense_items ei ON ei.id = p.expense_item_id WHERE public.has_wedding_permission(auth.uid(), ei.wedding_id, 'budget', 'edit')));
CREATE POLICY "palloc_delete" ON public.payment_allocations FOR DELETE USING (payment_id IN (SELECT p.id FROM public.payments p JOIN public.expense_items ei ON ei.id = p.expense_item_id WHERE public.has_wedding_permission(auth.uid(), ei.wedding_id, 'budget', 'edit')));

-- FINANCIAL_CONTRIBUTORS
DROP POLICY IF EXISTS "Planners can manage contributors" ON public.financial_contributors;
DROP POLICY IF EXISTS "Users can view contributors for accessible weddings" ON public.financial_contributors;
CREATE POLICY "contrib_select" ON public.financial_contributors FOR SELECT USING (public.has_wedding_permission(auth.uid(), wedding_id, 'budget', 'view'));
CREATE POLICY "contrib_insert" ON public.financial_contributors FOR INSERT WITH CHECK (public.has_wedding_permission(auth.uid(), wedding_id, 'budget', 'create'));
CREATE POLICY "contrib_update" ON public.financial_contributors FOR UPDATE USING (public.has_wedding_permission(auth.uid(), wedding_id, 'budget', 'edit')) WITH CHECK (public.has_wedding_permission(auth.uid(), wedding_id, 'budget', 'edit'));
CREATE POLICY "contrib_delete" ON public.financial_contributors FOR DELETE USING (public.has_wedding_permission(auth.uid(), wedding_id, 'budget', 'edit'));

-- EXPENSE_CATEGORIES
DROP POLICY IF EXISTS "Only co-planners can delete categories" ON public.expense_categories;
DROP POLICY IF EXISTS "Planners can create categories" ON public.expense_categories;
DROP POLICY IF EXISTS "Users can view categories for accessible weddings" ON public.expense_categories;
DROP POLICY IF EXISTS "Planners can update categories" ON public.expense_categories;
CREATE POLICY "expcat_select" ON public.expense_categories FOR SELECT USING (public.has_wedding_permission(auth.uid(), wedding_id, 'budget', 'view'));
CREATE POLICY "expcat_insert" ON public.expense_categories FOR INSERT WITH CHECK (public.has_wedding_permission(auth.uid(), wedding_id, 'budget', 'create'));
CREATE POLICY "expcat_update" ON public.expense_categories FOR UPDATE USING (public.has_wedding_permission(auth.uid(), wedding_id, 'budget', 'edit')) WITH CHECK (public.has_wedding_permission(auth.uid(), wedding_id, 'budget', 'edit'));
CREATE POLICY "expcat_delete" ON public.expense_categories FOR DELETE USING (public.has_wedding_role(auth.uid(), wedding_id, 'co_planner'::app_role));

-- GIFTS
DROP POLICY IF EXISTS "Co-planners can manage gifts" ON public.gifts;
CREATE POLICY "gifts_select" ON public.gifts FOR SELECT USING (public.has_wedding_permission(auth.uid(), wedding_id, 'gifts', 'view'));
CREATE POLICY "gifts_insert" ON public.gifts FOR INSERT WITH CHECK (public.has_wedding_permission(auth.uid(), wedding_id, 'gifts', 'create'));
CREATE POLICY "gifts_update" ON public.gifts FOR UPDATE USING (public.has_wedding_permission(auth.uid(), wedding_id, 'gifts', 'edit')) WITH CHECK (public.has_wedding_permission(auth.uid(), wedding_id, 'gifts', 'edit'));
CREATE POLICY "gifts_delete" ON public.gifts FOR DELETE USING (public.has_wedding_permission(auth.uid(), wedding_id, 'gifts', 'edit'));

-- CHECKLIST_TASKS
DROP POLICY IF EXISTS "Planners can manage tasks" ON public.checklist_tasks;
DROP POLICY IF EXISTS "Users can view tasks for accessible weddings" ON public.checklist_tasks;
CREATE POLICY "checklist_select" ON public.checklist_tasks FOR SELECT USING (public.has_wedding_permission(auth.uid(), wedding_id, 'checklist', 'view'));
CREATE POLICY "checklist_insert" ON public.checklist_tasks FOR INSERT WITH CHECK (public.has_wedding_permission(auth.uid(), wedding_id, 'checklist', 'create'));
CREATE POLICY "checklist_update" ON public.checklist_tasks FOR UPDATE USING (public.has_wedding_permission(auth.uid(), wedding_id, 'checklist', 'edit')) WITH CHECK (public.has_wedding_permission(auth.uid(), wedding_id, 'checklist', 'edit'));
CREATE POLICY "checklist_delete" ON public.checklist_tasks FOR DELETE USING (public.has_wedding_permission(auth.uid(), wedding_id, 'checklist', 'edit'));

-- TABLES
DROP POLICY IF EXISTS "Planners can manage tables" ON public.tables;
DROP POLICY IF EXISTS "Users can view tables for accessible weddings" ON public.tables;
CREATE POLICY "tables_select" ON public.tables FOR SELECT USING (public.has_wedding_permission(auth.uid(), wedding_id, 'tables', 'view'));
CREATE POLICY "tables_insert" ON public.tables FOR INSERT WITH CHECK (public.has_wedding_permission(auth.uid(), wedding_id, 'tables', 'create'));
CREATE POLICY "tables_update" ON public.tables FOR UPDATE USING (public.has_wedding_permission(auth.uid(), wedding_id, 'tables', 'edit')) WITH CHECK (public.has_wedding_permission(auth.uid(), wedding_id, 'tables', 'edit'));
CREATE POLICY "tables_delete" ON public.tables FOR DELETE USING (public.has_wedding_permission(auth.uid(), wedding_id, 'tables', 'edit'));

-- TABLE_ASSIGNMENTS
DROP POLICY IF EXISTS "Planners can manage assignments" ON public.table_assignments;
DROP POLICY IF EXISTS "Users can view assignments for accessible tables" ON public.table_assignments;
CREATE POLICY "tassign_select" ON public.table_assignments FOR SELECT USING (table_id IN (SELECT id FROM public.tables t WHERE public.has_wedding_permission(auth.uid(), t.wedding_id, 'tables', 'view')));
CREATE POLICY "tassign_insert" ON public.table_assignments FOR INSERT WITH CHECK (table_id IN (SELECT id FROM public.tables t WHERE public.has_wedding_permission(auth.uid(), t.wedding_id, 'tables', 'edit')));
CREATE POLICY "tassign_update" ON public.table_assignments FOR UPDATE USING (table_id IN (SELECT id FROM public.tables t WHERE public.has_wedding_permission(auth.uid(), t.wedding_id, 'tables', 'edit'))) WITH CHECK (table_id IN (SELECT id FROM public.tables t WHERE public.has_wedding_permission(auth.uid(), t.wedding_id, 'tables', 'edit')));
CREATE POLICY "tassign_delete" ON public.table_assignments FOR DELETE USING (table_id IN (SELECT id FROM public.tables t WHERE public.has_wedding_permission(auth.uid(), t.wedding_id, 'tables', 'edit')));

-- TABLEAU_LAYOUTS
DROP POLICY IF EXISTS "Planners and managers can delete tableau layouts" ON public.tableau_layouts;
DROP POLICY IF EXISTS "Planners and managers can insert tableau layouts" ON public.tableau_layouts;
DROP POLICY IF EXISTS "Collaborators can view tableau layouts" ON public.tableau_layouts;
DROP POLICY IF EXISTS "Planners and managers can update tableau layouts" ON public.tableau_layouts;
CREATE POLICY "tlayout_select" ON public.tableau_layouts FOR SELECT USING (public.has_wedding_permission(auth.uid(), wedding_id, 'tables', 'view'));
CREATE POLICY "tlayout_insert" ON public.tableau_layouts FOR INSERT WITH CHECK (public.has_wedding_permission(auth.uid(), wedding_id, 'tables', 'create'));
CREATE POLICY "tlayout_update" ON public.tableau_layouts FOR UPDATE USING (public.has_wedding_permission(auth.uid(), wedding_id, 'tables', 'edit')) WITH CHECK (public.has_wedding_permission(auth.uid(), wedding_id, 'tables', 'edit'));
CREATE POLICY "tlayout_delete" ON public.tableau_layouts FOR DELETE USING (public.has_wedding_permission(auth.uid(), wedding_id, 'tables', 'edit'));

-- AI_AFFINITIES
DROP POLICY IF EXISTS "Planners can manage affinities" ON public.ai_affinities;
DROP POLICY IF EXISTS "Users can view affinities for accessible weddings" ON public.ai_affinities;
CREATE POLICY "aff_select" ON public.ai_affinities FOR SELECT USING (public.has_wedding_permission(auth.uid(), wedding_id, 'tables', 'view'));
CREATE POLICY "aff_insert" ON public.ai_affinities FOR INSERT WITH CHECK (public.has_wedding_permission(auth.uid(), wedding_id, 'tables', 'edit'));
CREATE POLICY "aff_update" ON public.ai_affinities FOR UPDATE USING (public.has_wedding_permission(auth.uid(), wedding_id, 'tables', 'edit')) WITH CHECK (public.has_wedding_permission(auth.uid(), wedding_id, 'tables', 'edit'));
CREATE POLICY "aff_delete" ON public.ai_affinities FOR DELETE USING (public.has_wedding_permission(auth.uid(), wedding_id, 'tables', 'edit'));

-- ACCOMMODATION_ROOMS
DROP POLICY IF EXISTS "Planners can manage accommodation rooms" ON public.accommodation_rooms;
DROP POLICY IF EXISTS "Users can view accommodation rooms for accessible weddings" ON public.accommodation_rooms;
CREATE POLICY "accroom_select" ON public.accommodation_rooms FOR SELECT USING (public.has_wedding_permission(auth.uid(), wedding_id, 'accommodation', 'view'));
CREATE POLICY "accroom_insert" ON public.accommodation_rooms FOR INSERT WITH CHECK (public.has_wedding_permission(auth.uid(), wedding_id, 'accommodation', 'create'));
CREATE POLICY "accroom_update" ON public.accommodation_rooms FOR UPDATE USING (public.has_wedding_permission(auth.uid(), wedding_id, 'accommodation', 'edit')) WITH CHECK (public.has_wedding_permission(auth.uid(), wedding_id, 'accommodation', 'edit'));
CREATE POLICY "accroom_delete" ON public.accommodation_rooms FOR DELETE USING (public.has_wedding_permission(auth.uid(), wedding_id, 'accommodation', 'edit'));

-- ACCOMMODATION_ASSIGNMENTS
DROP POLICY IF EXISTS "Planners can manage accommodation assignments" ON public.accommodation_assignments;
DROP POLICY IF EXISTS "Users can view accommodation assignments for accessible rooms" ON public.accommodation_assignments;
CREATE POLICY "accass_select" ON public.accommodation_assignments FOR SELECT USING (room_id IN (SELECT id FROM public.accommodation_rooms r WHERE public.has_wedding_permission(auth.uid(), r.wedding_id, 'accommodation', 'view')));
CREATE POLICY "accass_insert" ON public.accommodation_assignments FOR INSERT WITH CHECK (room_id IN (SELECT id FROM public.accommodation_rooms r WHERE public.has_wedding_permission(auth.uid(), r.wedding_id, 'accommodation', 'edit')));
CREATE POLICY "accass_update" ON public.accommodation_assignments FOR UPDATE USING (room_id IN (SELECT id FROM public.accommodation_rooms r WHERE public.has_wedding_permission(auth.uid(), r.wedding_id, 'accommodation', 'edit'))) WITH CHECK (room_id IN (SELECT id FROM public.accommodation_rooms r WHERE public.has_wedding_permission(auth.uid(), r.wedding_id, 'accommodation', 'edit')));
CREATE POLICY "accass_delete" ON public.accommodation_assignments FOR DELETE USING (room_id IN (SELECT id FROM public.accommodation_rooms r WHERE public.has_wedding_permission(auth.uid(), r.wedding_id, 'accommodation', 'edit')));

-- TIMELINE_EVENTS
DROP POLICY IF EXISTS "Planners can manage events" ON public.timeline_events;
DROP POLICY IF EXISTS "Users can view events for accessible weddings" ON public.timeline_events;
CREATE POLICY "tevt_select" ON public.timeline_events FOR SELECT USING (public.has_wedding_permission(auth.uid(), wedding_id, 'timeline', 'view'));
CREATE POLICY "tevt_insert" ON public.timeline_events FOR INSERT WITH CHECK (public.has_wedding_permission(auth.uid(), wedding_id, 'timeline', 'create'));
CREATE POLICY "tevt_update" ON public.timeline_events FOR UPDATE USING (public.has_wedding_permission(auth.uid(), wedding_id, 'timeline', 'edit')) WITH CHECK (public.has_wedding_permission(auth.uid(), wedding_id, 'timeline', 'edit'));
CREATE POLICY "tevt_delete" ON public.timeline_events FOR DELETE USING (public.has_wedding_permission(auth.uid(), wedding_id, 'timeline', 'edit'));

-- TIMELINE_TOKENS
DROP POLICY IF EXISTS "Planners can delete tokens" ON public.timeline_tokens;
DROP POLICY IF EXISTS "Planners can create tokens" ON public.timeline_tokens;
DROP POLICY IF EXISTS "Users can view tokens for their weddings" ON public.timeline_tokens;
CREATE POLICY "ttok_select" ON public.timeline_tokens FOR SELECT USING (public.has_wedding_permission(auth.uid(), wedding_id, 'timeline', 'view'));
CREATE POLICY "ttok_insert" ON public.timeline_tokens FOR INSERT WITH CHECK (public.has_wedding_permission(auth.uid(), wedding_id, 'timeline', 'edit'));
CREATE POLICY "ttok_delete" ON public.timeline_tokens FOR DELETE USING (public.has_wedding_permission(auth.uid(), wedding_id, 'timeline', 'edit'));

-- DISPOSABLE_CAMERAS
DROP POLICY IF EXISTS "Planners can manage cameras" ON public.disposable_cameras;
DROP POLICY IF EXISTS "Users can view cameras for accessible weddings" ON public.disposable_cameras;
CREATE POLICY "cam_select" ON public.disposable_cameras FOR SELECT USING (public.has_wedding_permission(auth.uid(), wedding_id, 'memories', 'view'));
CREATE POLICY "cam_insert" ON public.disposable_cameras FOR INSERT WITH CHECK (public.has_wedding_permission(auth.uid(), wedding_id, 'memories', 'create'));
CREATE POLICY "cam_update" ON public.disposable_cameras FOR UPDATE USING (public.has_wedding_permission(auth.uid(), wedding_id, 'memories', 'edit')) WITH CHECK (public.has_wedding_permission(auth.uid(), wedding_id, 'memories', 'edit'));
CREATE POLICY "cam_delete" ON public.disposable_cameras FOR DELETE USING (public.has_wedding_permission(auth.uid(), wedding_id, 'memories', 'edit'));

-- CAMERA_PHOTOS
DROP POLICY IF EXISTS "Planners can manage camera photos" ON public.camera_photos;
DROP POLICY IF EXISTS "Users can view camera photos for accessible weddings" ON public.camera_photos;
CREATE POLICY "camphoto_select" ON public.camera_photos FOR SELECT USING (camera_id IN (SELECT id FROM public.disposable_cameras c WHERE public.has_wedding_permission(auth.uid(), c.wedding_id, 'memories', 'view')));
CREATE POLICY "camphoto_update" ON public.camera_photos FOR UPDATE USING (camera_id IN (SELECT id FROM public.disposable_cameras c WHERE public.has_wedding_permission(auth.uid(), c.wedding_id, 'memories', 'edit'))) WITH CHECK (camera_id IN (SELECT id FROM public.disposable_cameras c WHERE public.has_wedding_permission(auth.uid(), c.wedding_id, 'memories', 'edit')));
CREATE POLICY "camphoto_delete" ON public.camera_photos FOR DELETE USING (camera_id IN (SELECT id FROM public.disposable_cameras c WHERE public.has_wedding_permission(auth.uid(), c.wedding_id, 'memories', 'edit')));

-- MASS_BOOKLETS
DROP POLICY IF EXISTS "Planners can manage mass booklets" ON public.mass_booklets;
DROP POLICY IF EXISTS "Users can view mass booklets for accessible weddings" ON public.mass_booklets;
CREATE POLICY "book_select" ON public.mass_booklets FOR SELECT USING (public.has_wedding_permission(auth.uid(), wedding_id, 'mass_booklet', 'view'));
CREATE POLICY "book_insert" ON public.mass_booklets FOR INSERT WITH CHECK (public.has_wedding_permission(auth.uid(), wedding_id, 'mass_booklet', 'create'));
CREATE POLICY "book_update" ON public.mass_booklets FOR UPDATE USING (public.has_wedding_permission(auth.uid(), wedding_id, 'mass_booklet', 'edit')) WITH CHECK (public.has_wedding_permission(auth.uid(), wedding_id, 'mass_booklet', 'edit'));
CREATE POLICY "book_delete" ON public.mass_booklets FOR DELETE USING (public.has_wedding_permission(auth.uid(), wedding_id, 'mass_booklet', 'edit'));

-- MESSAGES (uses sender_id, not user_id)
DROP POLICY IF EXISTS "Users can view messages" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
CREATE POLICY "msg_select" ON public.messages FOR SELECT USING (public.has_wedding_permission(auth.uid(), wedding_id, 'chat', 'view') AND ((visibility = 'all') OR public.can_see_couple_messages(auth.uid(), wedding_id)));
CREATE POLICY "msg_insert" ON public.messages FOR INSERT WITH CHECK (public.has_wedding_permission(auth.uid(), wedding_id, 'chat', 'edit') AND sender_id = auth.uid());
CREATE POLICY "msg_update" ON public.messages FOR UPDATE USING (sender_id = auth.uid() AND public.has_wedding_permission(auth.uid(), wedding_id, 'chat', 'edit')) WITH CHECK (sender_id = auth.uid() AND public.has_wedding_permission(auth.uid(), wedding_id, 'chat', 'edit'));
CREATE POLICY "msg_delete" ON public.messages FOR DELETE USING (sender_id = auth.uid() AND public.has_wedding_permission(auth.uid(), wedding_id, 'chat', 'edit'));

-- get_vendor_financials rispetta vendor_costs
CREATE OR REPLACE FUNCTION public.get_vendor_financials(p_vendor_id uuid)
 RETURNS TABLE(iban text, intestatario_conto text, partita_iva_cf text, ragione_sociale text)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_wedding uuid;
BEGIN
  SELECT wedding_id INTO v_wedding FROM public.vendors WHERE id = p_vendor_id;
  IF v_wedding IS NULL THEN RETURN; END IF;
  IF NOT public.has_wedding_permission(auth.uid(), v_wedding, 'vendor_costs', 'view') THEN RETURN; END IF;
  RETURN QUERY SELECT v.iban, v.intestatario_conto, v.partita_iva_cf, v.ragione_sociale FROM public.vendors v WHERE v.id = p_vendor_id;
END;
$function$;
