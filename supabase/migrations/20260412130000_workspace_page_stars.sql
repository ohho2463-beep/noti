-- Per-user starred wiki pages (즐겨찾기)

create table if not exists public.workspace_page_stars (
  user_id uuid not null references auth.users (id) on delete cascade,
  page_id uuid not null references public.workspace_pages (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, page_id)
);

create index if not exists workspace_page_stars_page_idx
  on public.workspace_page_stars (page_id);

alter table public.workspace_page_stars enable row level security;

drop policy if exists "wps_select_own" on public.workspace_page_stars;
create policy "wps_select_own" on public.workspace_page_stars
  for select using (auth.uid() = user_id);

drop policy if exists "wps_insert_accessible" on public.workspace_page_stars;
create policy "wps_insert_accessible" on public.workspace_page_stars
  for insert with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.workspace_pages wp
      where wp.id = page_id
        and public.can_access_workspace(wp.workspace_id)
    )
  );

drop policy if exists "wps_delete_own" on public.workspace_page_stars;
create policy "wps_delete_own" on public.workspace_page_stars
  for delete using (auth.uid() = user_id);

comment on table public.workspace_page_stars is '워크스페이스 문서 즐겨찾기 (사용자별)';
