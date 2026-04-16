-- NOTI v2 (Flask 데모) 워크스페이스 · 위키 페이지 · 칸반 · 팀 초대 · 운영
-- 기존 organizations/projects 와 별도: 개인/팀 "워크스페이스" 허브

-- ---------------------------------------------------------------------------
-- profiles 확장
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists is_admin boolean not null default false;
alter table public.profiles add column if not exists is_suspended boolean not null default false;
alter table public.profiles add column if not exists theme_preference text not null default 'system';

-- current_workspace_id 는 workspaces 생성 후 추가
-- ---------------------------------------------------------------------------
-- workspaces
-- ---------------------------------------------------------------------------
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workspaces_owner_id_idx on public.workspaces (owner_id);

alter table public.profiles
  add column if not exists current_workspace_id uuid references public.workspaces (id) on delete set null;

-- ---------------------------------------------------------------------------
-- workspace_members (owner 는 테이블에 없을 수 있음 — owner_id 로 판별)
-- ---------------------------------------------------------------------------
create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('viewer', 'editor', 'admin')),
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create index if not exists workspace_members_ws_idx on public.workspace_members (workspace_id);
create index if not exists workspace_members_user_idx on public.workspace_members (user_id);

-- ---------------------------------------------------------------------------
-- workspace_subscriptions (플랜 UI용)
-- ---------------------------------------------------------------------------
create table if not exists public.workspace_subscriptions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  plan_code text not null default 'free' check (plan_code in ('free', 'pro', 'team')),
  status text not null default 'active' check (status in ('active', 'canceled')),
  billing_cycle text not null default 'monthly',
  renews_at timestamptz,
  seats int not null default 3,
  created_at timestamptz not null default now(),
  unique (workspace_id)
);

-- ---------------------------------------------------------------------------
-- workspace_pages (블록 JSON)
-- ---------------------------------------------------------------------------
create table if not exists public.workspace_pages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  parent_id uuid references public.workspace_pages (id) on delete cascade,
  title text not null default 'Untitled',
  icon text default '📄',
  position int not null default 0,
  content_json text not null default '[]',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workspace_pages_ws_idx on public.workspace_pages (workspace_id);
create index if not exists workspace_pages_parent_idx on public.workspace_pages (parent_id);

-- ---------------------------------------------------------------------------
-- workspace_tasks
-- ---------------------------------------------------------------------------
create table if not exists public.workspace_tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  page_id uuid references public.workspace_pages (id) on delete set null,
  title text not null,
  description text,
  status text not null default 'todo' check (status in ('todo', 'doing', 'review', 'done')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  due_date date,
  position int not null default 0,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workspace_tasks_ws_idx on public.workspace_tasks (workspace_id);
create index if not exists workspace_tasks_status_idx on public.workspace_tasks (workspace_id, status);

-- ---------------------------------------------------------------------------
-- workspace_invitations
-- ---------------------------------------------------------------------------
create table if not exists public.workspace_invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  email text not null,
  role text not null default 'editor' check (role in ('viewer', 'editor', 'admin')),
  token text not null unique,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'expired', 'cancelled')),
  invited_by uuid references auth.users (id) on delete set null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists workspace_invitations_ws_idx on public.workspace_invitations (workspace_id);
create index if not exists workspace_invitations_email_idx on public.workspace_invitations (lower(email));

-- ---------------------------------------------------------------------------
-- announcements (전역 공지)
-- ---------------------------------------------------------------------------
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  is_published boolean not null default true,
  is_pinned boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- audit_logs
-- ---------------------------------------------------------------------------
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  workspace_id uuid references public.workspaces (id) on delete set null,
  action text not null,
  target_type text,
  target_id uuid,
  message text not null,
  metadata_json text not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_ws_idx on public.audit_logs (workspace_id);
create index if not exists audit_logs_created_idx on public.audit_logs (created_at desc);

-- ---------------------------------------------------------------------------
-- visit_events (간단 방문 로그)
-- ---------------------------------------------------------------------------
create table if not exists public.visit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  path text not null,
  method text not null default 'GET',
  ip text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists visit_events_created_idx on public.visit_events (created_at desc);

-- ---------------------------------------------------------------------------
-- updated_at 트리거
-- ---------------------------------------------------------------------------
drop trigger if exists workspaces_updated_at on public.workspaces;
create trigger workspaces_updated_at before update on public.workspaces
  for each row execute function public.set_updated_at();
drop trigger if exists workspace_pages_updated_at on public.workspace_pages;
create trigger workspace_pages_updated_at before update on public.workspace_pages
  for each row execute function public.set_updated_at();
drop trigger if exists workspace_tasks_updated_at on public.workspace_tasks;
create trigger workspace_tasks_updated_at before update on public.workspace_tasks
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 헬퍼 함수
-- ---------------------------------------------------------------------------
create or replace function public.is_site_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.is_admin from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

create or replace function public.can_access_workspace(p_ws uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspaces w
    where w.id = p_ws and w.owner_id = auth.uid()
  )
  or exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = p_ws and wm.user_id = auth.uid()
  );
$$;

create or replace function public.can_manage_workspace(p_ws uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspaces w
    where w.id = p_ws and w.owner_id = auth.uid()
  )
  or exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = p_ws
      and wm.user_id = auth.uid()
      and wm.role = 'admin'
  );
$$;

-- 초대 수락 (이메일 일치는 auth.users 에서)
create or replace function public.accept_workspace_invitation(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  inv public.workspace_invitations%rowtype;
  em text;
  uid uuid := auth.uid();
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  select email into em from auth.users where id = uid;
  select * into inv
  from public.workspace_invitations
  where token = p_token and status = 'pending';
  if not found then
    return jsonb_build_object('ok', false, 'error', 'invalid_token');
  end if;
  if inv.expires_at < now() then
    update public.workspace_invitations set status = 'expired' where id = inv.id;
    return jsonb_build_object('ok', false, 'error', 'expired');
  end if;
  if lower(trim(inv.email)) <> lower(trim(em)) then
    return jsonb_build_object('ok', false, 'error', 'email_mismatch');
  end if;
  if exists (select 1 from public.workspaces w where w.id = inv.workspace_id and w.owner_id = uid) then
    update public.workspace_invitations set status = 'accepted' where id = inv.id;
    update public.profiles set current_workspace_id = inv.workspace_id where id = uid;
    return jsonb_build_object('ok', true, 'workspace_id', inv.workspace_id);
  end if;
  insert into public.workspace_members (workspace_id, user_id, role)
  values (inv.workspace_id, uid, inv.role)
  on conflict (workspace_id, user_id) do update set role = excluded.role;
  update public.workspace_invitations set status = 'accepted' where id = inv.id;
  update public.profiles set current_workspace_id = inv.workspace_id where id = uid;
  return jsonb_build_object('ok', true, 'workspace_id', inv.workspace_id);
end;
$$;

revoke all on function public.accept_workspace_invitation(text) from public;
grant execute on function public.accept_workspace_invitation(text) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_subscriptions enable row level security;
alter table public.workspace_pages enable row level security;
alter table public.workspace_tasks enable row level security;
alter table public.workspace_invitations enable row level security;
alter table public.announcements enable row level security;
alter table public.audit_logs enable row level security;
alter table public.visit_events enable row level security;

-- workspaces
drop policy if exists "workspaces_select" on public.workspaces;
create policy "workspaces_select" on public.workspaces for select
  using (public.can_access_workspace(id) or public.is_site_admin());
drop policy if exists "workspaces_insert" on public.workspaces;
create policy "workspaces_insert" on public.workspaces for insert
  with check (auth.uid() = owner_id);
drop policy if exists "workspaces_update" on public.workspaces;
create policy "workspaces_update" on public.workspaces for update
  using (owner_id = auth.uid() or public.can_manage_workspace(id));
drop policy if exists "workspaces_delete" on public.workspaces;
create policy "workspaces_delete" on public.workspaces for delete
  using (owner_id = auth.uid());

-- workspace_members
drop policy if exists "wm_select" on public.workspace_members;
create policy "wm_select" on public.workspace_members for select
  using (public.can_access_workspace(workspace_id) or public.is_site_admin());
drop policy if exists "wm_insert" on public.workspace_members;
create policy "wm_insert" on public.workspace_members for insert
  with check (public.can_manage_workspace(workspace_id));
drop policy if exists "wm_update" on public.workspace_members;
create policy "wm_update" on public.workspace_members for update
  using (public.can_manage_workspace(workspace_id));
drop policy if exists "wm_delete" on public.workspace_members;
create policy "wm_delete" on public.workspace_members for delete
  using (public.can_manage_workspace(workspace_id));

-- subscriptions (행은 트리거로 생성, 플랜 변경은 관리자만)
drop policy if exists "wsub_select" on public.workspace_subscriptions;
create policy "wsub_select" on public.workspace_subscriptions for select
  using (public.can_access_workspace(workspace_id) or public.is_site_admin());
drop policy if exists "wsub_update" on public.workspace_subscriptions;
create policy "wsub_update" on public.workspace_subscriptions for update
  using (public.can_manage_workspace(workspace_id));

-- pages
drop policy if exists "wp_select" on public.workspace_pages;
create policy "wp_select" on public.workspace_pages for select
  using (public.can_access_workspace(workspace_id) or public.is_site_admin());
drop policy if exists "wp_insert" on public.workspace_pages;
create policy "wp_insert" on public.workspace_pages for insert
  with check (public.can_access_workspace(workspace_id) and created_by = auth.uid());
drop policy if exists "wp_update" on public.workspace_pages;
create policy "wp_update" on public.workspace_pages for update
  using (public.can_access_workspace(workspace_id));
drop policy if exists "wp_delete" on public.workspace_pages;
create policy "wp_delete" on public.workspace_pages for delete
  using (public.can_access_workspace(workspace_id));

-- tasks
drop policy if exists "wt_select" on public.workspace_tasks;
create policy "wt_select" on public.workspace_tasks for select
  using (public.can_access_workspace(workspace_id) or public.is_site_admin());
drop policy if exists "wt_insert" on public.workspace_tasks;
create policy "wt_insert" on public.workspace_tasks for insert
  with check (public.can_access_workspace(workspace_id) and created_by = auth.uid());
drop policy if exists "wt_update" on public.workspace_tasks;
create policy "wt_update" on public.workspace_tasks for update
  using (public.can_access_workspace(workspace_id));
drop policy if exists "wt_delete" on public.workspace_tasks;
create policy "wt_delete" on public.workspace_tasks for delete
  using (public.can_access_workspace(workspace_id));

-- invitations
drop policy if exists "winv_select" on public.workspace_invitations;
create policy "winv_select" on public.workspace_invitations for select
  using (public.can_manage_workspace(workspace_id) or public.is_site_admin());
drop policy if exists "winv_insert" on public.workspace_invitations;
create policy "winv_insert" on public.workspace_invitations for insert
  with check (public.can_manage_workspace(workspace_id));
drop policy if exists "winv_update" on public.workspace_invitations;
create policy "winv_update" on public.workspace_invitations for update
  using (public.can_manage_workspace(workspace_id));

-- announcements
drop policy if exists "ann_select" on public.announcements;
create policy "ann_select" on public.announcements for select
  using (
    auth.uid() is not null
    and (is_published = true or public.is_site_admin())
  );
drop policy if exists "ann_insert" on public.announcements;
create policy "ann_insert" on public.announcements for insert
  with check (public.is_site_admin());
drop policy if exists "ann_update" on public.announcements;
create policy "ann_update" on public.announcements for update
  using (public.is_site_admin());
drop policy if exists "ann_delete" on public.announcements;
create policy "ann_delete" on public.announcements for delete
  using (public.is_site_admin());

-- audit_logs: 워크스페이스 멤버는 해당 로그 조회, 삽입은 인증 사용자
drop policy if exists "al_select" on public.audit_logs;
create policy "al_select" on public.audit_logs for select
  using (
    public.is_site_admin()
    or (workspace_id is not null and public.can_access_workspace(workspace_id))
    or (workspace_id is null and user_id = auth.uid())
  );
drop policy if exists "al_insert" on public.audit_logs;
create policy "al_insert" on public.audit_logs for insert
  with check (user_id = auth.uid());

-- visit_events: 본인 + 관리자 조회, 삽입 인증
drop policy if exists "ve_select" on public.visit_events;
create policy "ve_select" on public.visit_events for select
  using (public.is_site_admin() or user_id = auth.uid());
drop policy if exists "ve_insert" on public.visit_events;
create policy "ve_insert" on public.visit_events for insert
  with check (auth.uid() is not null and (user_id is null or user_id = auth.uid()));

-- profiles: 기존 정책 유지 + is_admin 등 업데이트는 본인만 (관리자 승격은 SQL/대시보드 서비스롤)
-- profiles_update_own 이미 있음

-- ---------------------------------------------------------------------------
-- 워크스페이스 생성 시 구독 행 + 홈 페이지 시드
create or replace function public.handle_new_workspace()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.workspace_subscriptions (workspace_id, plan_code, status, seats)
  values (new.id, 'free', 'active', 3)
  on conflict (workspace_id) do nothing;
  insert into public.workspace_pages (workspace_id, title, icon, position, created_by, content_json)
  values (new.id, '홈', '🏠', 0, new.owner_id, '[]');
  return new;
end;
$$;

drop trigger if exists on_workspace_created on public.workspaces;
create trigger on_workspace_created
  after insert on public.workspaces
  for each row execute function public.handle_new_workspace();
