-- Allow users to read display names of others who share a workspace they can access
-- (needed for 팀 화면; 기존 policy는 본인 행만 SELECT)

drop policy if exists "profiles_select_workspace_peers" on public.profiles;
create policy "profiles_select_workspace_peers" on public.profiles for select
using (
  id = auth.uid()
  or public.is_site_admin()
  or exists (
    select 1
    from public.workspaces w
    where w.owner_id = profiles.id
      and public.can_access_workspace(w.id)
  )
  or exists (
    select 1
    from public.workspace_members wm
    where wm.user_id = profiles.id
      and public.can_access_workspace(wm.workspace_id)
  )
);
