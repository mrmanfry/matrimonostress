-- Create security definer function to get user email
create or replace function public.get_user_email(_user_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select email::text from auth.users where id = _user_id
$$;

-- Drop existing policies on wedding_invitations that reference auth.users
drop policy if exists "Users can view invitations sent to their email" on public.wedding_invitations;
drop policy if exists "Users can update their own invitations" on public.wedding_invitations;

-- Recreate policies using the security definer function
create policy "Users can view invitations sent to their email"
on public.wedding_invitations
for select
using (
  email = public.get_user_email(auth.uid()) 
  OR has_wedding_role(auth.uid(), wedding_id, 'co_planner'::app_role)
);

create policy "Users can update their own invitations"
on public.wedding_invitations
for update
using (email = public.get_user_email(auth.uid()))
with check (email = public.get_user_email(auth.uid()));