-- 문서(위키 페이지) 태그 — 페이지당 다대다 문자열 태그

create table if not exists public.workspace_page_tag_links (
  page_id uuid not null references public.workspace_pages (id) on delete cascade,
  tag text not null,
  created_at timestamptz not null default now(),
  constraint workspace_page_tag_links_tag_chk check (
    char_length(trim(tag)) > 0
    and char_length(tag) <= 64
  ),
  constraint workspace_page_tag_links_unique unique (page_id, tag)
);

create index if not exists workspace_page_tag_links_page_idx
  on public.workspace_page_tag_links (page_id);

create index if not exists workspace_page_tag_links_tag_lower_idx
  on public.workspace_page_tag_links (lower(tag));

alter table public.workspace_page_tag_links enable row level security;

drop policy if exists "wptl_select" on public.workspace_page_tag_links;
create policy "wptl_select" on public.workspace_page_tag_links
  for select using (
    exists (
      select 1
      from public.workspace_pages wp
      where wp.id = page_id
        and public.can_access_workspace(wp.workspace_id)
    )
  );

drop policy if exists "wptl_insert" on public.workspace_page_tag_links;
create policy "wptl_insert" on public.workspace_page_tag_links
  for insert with check (
    exists (
      select 1
      from public.workspace_pages wp
      where wp.id = page_id
        and public.can_access_workspace(wp.workspace_id)
    )
  );

drop policy if exists "wptl_delete" on public.workspace_page_tag_links;
create policy "wptl_delete" on public.workspace_page_tag_links
  for delete using (
    exists (
      select 1
      from public.workspace_pages wp
      where wp.id = page_id
        and public.can_access_workspace(wp.workspace_id)
    )
  );

comment on table public.workspace_page_tag_links is '워크스페이스 문서 태그 (page_id + tag)';
