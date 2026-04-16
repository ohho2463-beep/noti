-- 일정 참여자(팀 가용성·충돌 감지) + 컨텍스트 채팅(실시간)

-- ---------------------------------------------------------------------------
-- schedule_participants
-- ---------------------------------------------------------------------------
create table if not exists public.schedule_participants (
  schedule_id uuid not null references public.schedules (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (schedule_id, user_id)
);

create index if not exists schedule_participants_user_idx on public.schedule_participants (user_id);
create index if not exists schedule_participants_schedule_idx on public.schedule_participants (schedule_id);

alter table public.schedule_participants enable row level security;

drop policy if exists "sp_select" on public.schedule_participants;
create policy "sp_select" on public.schedule_participants for select using (
  exists (
    select 1
    from public.schedules s
    where s.id = schedule_participants.schedule_id
      and public.can_access_project (s.project_id)
  )
);

drop policy if exists "sp_insert" on public.schedule_participants;
create policy "sp_insert" on public.schedule_participants for insert with check (
  exists (
    select 1
    from public.schedules s
    where s.id = schedule_participants.schedule_id
      and public.can_access_project (s.project_id)
  )
  and exists (
    select 1
    from public.project_members pm
    where
      pm.project_id = (
        select s2.project_id
        from public.schedules s2
        where
          s2.id = schedule_participants.schedule_id
      )
      and pm.user_id = schedule_participants.user_id
  )
);

drop policy if exists "sp_delete" on public.schedule_participants;
create policy "sp_delete" on public.schedule_participants for delete using (
  exists (
    select 1
    from public.schedules s
    where s.id = schedule_participants.schedule_id
      and public.can_access_project (s.project_id)
  )
);

create or replace function public.schedule_add_creator_participant()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.schedule_participants (schedule_id, user_id)
  values (new.id, new.created_by)
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists schedule_participant_creator on public.schedules;
create trigger schedule_participant_creator
after insert on public.schedules for each row
execute function public.schedule_add_creator_participant ();

insert into public.schedule_participants (schedule_id, user_id)
select
  id,
  created_by
from
  public.schedules
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- context_chat_messages (프로젝트·일정·문서·워크스페이스 스레드)
-- ---------------------------------------------------------------------------
create table if not exists public.context_chat_messages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  context_type text not null check (
    context_type in ('workspace', 'project', 'schedule', 'page')
  ),
  context_id uuid not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (
    char_length(trim(body)) > 0
    and char_length(body) <= 4000
  ),
  created_at timestamptz not null default now()
);

create index if not exists context_chat_ctx_idx on public.context_chat_messages (
  workspace_id,
  context_type,
  context_id,
  created_at desc
);

alter table public.context_chat_messages enable row level security;

create or replace function public.can_access_chat_context(
  p_ws uuid,
  p_ctx_type text,
  p_ctx_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.can_access_workspace (p_ws) then
    return false;
  end if;
  if p_ctx_type = 'workspace' then
    return p_ctx_id = p_ws;
  elsif p_ctx_type = 'project' then
    return public.can_access_project (p_ctx_id);
  elsif p_ctx_type = 'schedule' then
    return exists (
      select 1
      from public.schedules s
      where
        s.id = p_ctx_id
        and public.can_access_project (s.project_id)
    );
  elsif p_ctx_type = 'page' then
    return exists (
      select 1
      from public.workspace_pages wp
      where
        wp.id = p_ctx_id
        and wp.workspace_id = p_ws
    );
  end if;
  return false;
end;
$$;

drop policy if exists "ccm_select" on public.context_chat_messages;
create policy "ccm_select" on public.context_chat_messages for select using (
  public.can_access_chat_context (workspace_id, context_type, context_id)
);

drop policy if exists "ccm_insert" on public.context_chat_messages;
create policy "ccm_insert" on public.context_chat_messages for insert with check (
  auth.uid () = user_id
  and public.can_access_workspace (workspace_id)
  and public.can_access_chat_context (workspace_id, context_type, context_id)
);

-- Supabase Realtime (로컬/호스트에 publication 이 없으면 스킵)
do $$
begin
  alter publication supabase_realtime add table public.context_chat_messages;
exception
  when undefined_object then null;
  when duplicate_object then null;
end $$;

comment on table public.schedule_participants is '프로젝트 일정 참여자(팀 가용성·시간 충돌 계산용)';
comment on table public.context_chat_messages is '워크스페이스 범위 컨텍스트 채팅(실시간 구독용)';
