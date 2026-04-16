-- Noti — PostgreSQL 스키마 + RLS (Supabase)
-- idempotent: public.profiles 가 이미 있어도 나머지 테이블·RLS 적용 가능
-- 적용: Supabase SQL Editor 또는 CLI `supabase db push`

-- ---------------------------------------------------------------------------
-- 확장
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles — auth.users 확장 (이미 있으면 스킵, 없는 컬럼만 추가)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists created_at timestamptz;
alter table public.profiles add column if not exists updated_at timestamptz;

-- 기존 행에 NOT NULL 기본값 보정 (이미 값이 있으면 유지)
alter table public.profiles
  alter column created_at set default now();
alter table public.profiles
  alter column updated_at set default now();
update public.profiles set created_at = now() where created_at is null;
update public.profiles set updated_at = now() where updated_at is null;
alter table public.profiles
  alter column created_at set not null;
alter table public.profiles
  alter column updated_at set not null;

comment on table public.profiles is 'Supabase Auth 사용자 메타(표시 이름, 아바타)';

-- ---------------------------------------------------------------------------
-- organizations
-- ---------------------------------------------------------------------------
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists organizations_created_by_idx on public.organizations (created_by);
create index if not exists organizations_name_idx on public.organizations (name);

-- ---------------------------------------------------------------------------
-- organization_members
-- ---------------------------------------------------------------------------
create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index if not exists organization_members_user_id_idx on public.organization_members (user_id);
create index if not exists organization_members_org_id_idx on public.organization_members (organization_id);

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  organization_id uuid references public.organizations (id) on delete set null,
  created_by uuid not null references auth.users (id) on delete restrict,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_organization_id_idx on public.projects (organization_id);
create index if not exists projects_created_by_idx on public.projects (created_by);
create index if not exists projects_is_active_idx on public.projects (is_active);

-- ---------------------------------------------------------------------------
-- project_members
-- ---------------------------------------------------------------------------
create table if not exists public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('Admin', 'Manager', 'Member', 'Viewer')),
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, user_id)
);

create index if not exists project_members_user_id_idx on public.project_members (user_id);
create index if not exists project_members_project_id_idx on public.project_members (project_id);
create index if not exists project_members_role_idx on public.project_members (role);

-- ---------------------------------------------------------------------------
-- schedules
-- ---------------------------------------------------------------------------
create table if not exists public.schedules (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  title text not null,
  description text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  type text not null check (type in ('normal', 'auction', 'meeting', 'deadline')),
  location text,
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists schedules_project_id_idx on public.schedules (project_id);
create index if not exists schedules_start_time_idx on public.schedules (start_time);
create index if not exists schedules_type_idx on public.schedules (type);
create index if not exists schedules_project_start_idx on public.schedules (project_id, start_time);

-- ---------------------------------------------------------------------------
-- subscriptions
-- ---------------------------------------------------------------------------
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_type text not null check (plan_type in ('free', 'pro', 'enterprise')),
  status text not null check (status in ('active', 'canceled', 'expired')),
  toss_order_id text,
  started_at timestamptz not null,
  expired_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscriptions_user_id_idx on public.subscriptions (user_id);
create index if not exists subscriptions_status_idx on public.subscriptions (status);
create index if not exists subscriptions_toss_order_id_idx on public.subscriptions (toss_order_id);

-- ---------------------------------------------------------------------------
-- 트리거: 프로필 자동 생성
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 트리거: 조직 / 프로젝트
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_organization()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.organization_members (organization_id, user_id, role)
  values (new.id, new.created_by, 'owner');
  return new;
end;
$$;

drop trigger if exists on_organization_created on public.organizations;
create trigger on_organization_created
  after insert on public.organizations
  for each row execute function public.handle_new_organization();

create or replace function public.handle_new_project()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.project_members (project_id, user_id, role)
  values (new.id, new.created_by, 'Admin');
  return new;
end;
$$;

drop trigger if exists on_project_created on public.projects;
create trigger on_project_created
  after insert on public.projects
  for each row execute function public.handle_new_project();

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
drop trigger if exists organizations_updated_at on public.organizations;
create trigger organizations_updated_at before update on public.organizations
  for each row execute function public.set_updated_at();
drop trigger if exists projects_updated_at on public.projects;
create trigger projects_updated_at before update on public.projects
  for each row execute function public.set_updated_at();
drop trigger if exists project_members_updated_at on public.project_members;
create trigger project_members_updated_at before update on public.project_members
  for each row execute function public.set_updated_at();
drop trigger if exists schedules_updated_at on public.schedules;
create trigger schedules_updated_at before update on public.schedules
  for each row execute function public.set_updated_at();
drop trigger if exists subscriptions_updated_at on public.subscriptions;
create trigger subscriptions_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS 헬퍼
-- ---------------------------------------------------------------------------
create or replace function public.is_org_member(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = p_org_id
      and om.user_id = auth.uid()
  );
$$;

create or replace function public.can_access_project(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.project_members pm
    where pm.project_id = p_project_id and pm.user_id = auth.uid()
  )
  or exists (
    select 1 from public.projects p
    where p.id = p_project_id and p.created_by = auth.uid()
  )
  or exists (
    select 1
    from public.projects p
    join public.organization_members om on om.organization_id = p.organization_id
    where p.id = p_project_id
      and p.organization_id is not null
      and om.user_id = auth.uid()
  );
$$;

create or replace function public.project_admin_or_manager(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.project_members pm
    where pm.project_id = p_project_id
      and pm.user_id = auth.uid()
      and pm.role in ('Admin', 'Manager')
  )
  or exists (
    select 1 from public.projects p
    where p.id = p_project_id and p.created_by = auth.uid()
  );
$$;

create or replace function public.org_admin_or_owner(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members om
    where om.organization_id = p_org_id
      and om.user_id = auth.uid()
      and om.role in ('owner', 'admin')
  );
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.schedules enable row level security;
alter table public.subscriptions enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

drop policy if exists "organizations_select_member_or_creator" on public.organizations;
create policy "organizations_select_member_or_creator" on public.organizations for select
  using (created_by = auth.uid() or public.is_org_member(id));
drop policy if exists "organizations_insert_authenticated" on public.organizations;
create policy "organizations_insert_authenticated" on public.organizations for insert
  with check (auth.uid() is not null and created_by = auth.uid());
drop policy if exists "organizations_update_admin" on public.organizations;
create policy "organizations_update_admin" on public.organizations for update
  using (public.org_admin_or_owner(id));
drop policy if exists "organizations_delete_owner" on public.organizations;
create policy "organizations_delete_owner" on public.organizations for delete
  using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = organizations.id
        and om.user_id = auth.uid()
        and om.role = 'owner'
    )
  );

drop policy if exists "organization_members_select_visible" on public.organization_members;
create policy "organization_members_select_visible" on public.organization_members for select
  using (user_id = auth.uid() or public.is_org_member(organization_id));
drop policy if exists "organization_members_insert_admin" on public.organization_members;
create policy "organization_members_insert_admin" on public.organization_members for insert
  with check (public.org_admin_or_owner(organization_id));
drop policy if exists "organization_members_update_admin" on public.organization_members;
create policy "organization_members_update_admin" on public.organization_members for update
  using (public.org_admin_or_owner(organization_id));
drop policy if exists "organization_members_delete_admin_or_self" on public.organization_members;
create policy "organization_members_delete_admin_or_self" on public.organization_members for delete
  using (
    user_id = auth.uid()
    or public.org_admin_or_owner(organization_id)
  );

drop policy if exists "projects_select_access" on public.projects;
create policy "projects_select_access" on public.projects for select
  using (public.can_access_project(id));
drop policy if exists "projects_insert_authenticated" on public.projects;
create policy "projects_insert_authenticated" on public.projects for insert
  with check (
    auth.uid() is not null
    and created_by = auth.uid()
    and (
      organization_id is null
      or public.is_org_member(organization_id)
    )
  );
drop policy if exists "projects_update_elevated" on public.projects;
create policy "projects_update_elevated" on public.projects for update
  using (
    public.can_access_project(id)
    and (
      created_by = auth.uid()
      or public.project_admin_or_manager(id)
    )
  );
drop policy if exists "projects_delete_admin_or_creator" on public.projects;
create policy "projects_delete_admin_or_creator" on public.projects for delete
  using (created_by = auth.uid() or public.project_admin_or_manager(id));

drop policy if exists "project_members_select_access" on public.project_members;
create policy "project_members_select_access" on public.project_members for select
  using (public.can_access_project(project_id));
drop policy if exists "project_members_insert_managers" on public.project_members;
create policy "project_members_insert_managers" on public.project_members for insert
  with check (
    public.project_admin_or_manager(project_id)
    or (
      user_id = auth.uid()
      and exists (
        select 1 from public.projects p
        where p.id = project_id and p.created_by = auth.uid()
      )
    )
  );
drop policy if exists "project_members_update_managers" on public.project_members;
create policy "project_members_update_managers" on public.project_members for update
  using (public.project_admin_or_manager(project_id));
drop policy if exists "project_members_delete_managers_or_self" on public.project_members;
create policy "project_members_delete_managers_or_self" on public.project_members for delete
  using (
    user_id = auth.uid()
    or public.project_admin_or_manager(project_id)
  );

drop policy if exists "schedules_select_access" on public.schedules;
create policy "schedules_select_access" on public.schedules for select
  using (public.can_access_project(project_id));
drop policy if exists "schedules_insert_member" on public.schedules;
create policy "schedules_insert_member" on public.schedules for insert
  with check (
    public.can_access_project(project_id)
    and created_by = auth.uid()
  );
drop policy if exists "schedules_update_access" on public.schedules;
create policy "schedules_update_access" on public.schedules for update
  using (public.can_access_project(project_id));
drop policy if exists "schedules_delete_access" on public.schedules;
create policy "schedules_delete_access" on public.schedules for delete
  using (public.can_access_project(project_id));

drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own" on public.subscriptions for select
  using (auth.uid() = user_id);
drop policy if exists "subscriptions_insert_own" on public.subscriptions;
create policy "subscriptions_insert_own" on public.subscriptions for insert
  with check (auth.uid() = user_id);
drop policy if exists "subscriptions_update_own" on public.subscriptions;
create policy "subscriptions_update_own" on public.subscriptions for update
  using (auth.uid() = user_id);
drop policy if exists "subscriptions_delete_own" on public.subscriptions;
create policy "subscriptions_delete_own" on public.subscriptions for delete
  using (auth.uid() = user_id);
