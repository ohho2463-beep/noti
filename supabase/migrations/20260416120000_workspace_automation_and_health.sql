-- 워크스페이스 자동화 룰 엔진 + 프로젝트 리스크 스냅샷 + 일정 충돌 감지

-- ---------------------------------------------------------------------------
-- A. 룰 엔진
-- ---------------------------------------------------------------------------
create table if not exists public.workspace_automation_rules (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null,
  enabled boolean not null default true,
  trigger_type text not null check (trigger_type in ('schedule_dday')),
  trigger_config jsonb not null default '{}'::jsonb,
  action_type text not null check (action_type in ('create_task', 'notify_user', 'set_project_status')),
  action_config jsonb not null default '{}'::jsonb,
  cooldown_minutes int not null default 1440 check (cooldown_minutes >= 0),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workspace_automation_rules_ws_idx
  on public.workspace_automation_rules (workspace_id);

create index if not exists workspace_automation_rules_enabled_idx
  on public.workspace_automation_rules (workspace_id, enabled);

create index if not exists workspace_automation_rules_trigger_idx
  on public.workspace_automation_rules (workspace_id, trigger_type);

drop trigger if exists workspace_automation_rules_updated_at on public.workspace_automation_rules;
create trigger workspace_automation_rules_updated_at
before update on public.workspace_automation_rules
for each row execute function public.set_updated_at();

comment on table public.workspace_automation_rules is
  '워크스페이스 자동화 룰 정의(트리거/액션/쿨다운)';

create table if not exists public.workspace_automation_runs (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid not null references public.workspace_automation_rules (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  target_type text not null default 'schedule' check (target_type in ('schedule')),
  target_id uuid,
  status text not null check (status in ('success', 'skipped', 'failed')),
  reason text,
  created_resource jsonb,
  executed_at timestamptz not null default now()
);

create index if not exists workspace_automation_runs_rule_idx
  on public.workspace_automation_runs (rule_id, executed_at desc);

create index if not exists workspace_automation_runs_ws_idx
  on public.workspace_automation_runs (workspace_id, executed_at desc);

create index if not exists workspace_automation_runs_target_idx
  on public.workspace_automation_runs (target_type, target_id, executed_at desc);

comment on table public.workspace_automation_runs is
  '자동화 룰 실행 결과 로그(성공/스킵/실패, 생성 리소스)';

-- ---------------------------------------------------------------------------
-- B. 리스크 스코어 스냅샷
-- ---------------------------------------------------------------------------
create table if not exists public.project_health_snapshots (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  score int not null check (score >= 0 and score <= 100),
  grade text not null check (grade in ('stable', 'watch', 'risk')),
  factors jsonb not null default '{}'::jsonb,
  computed_at timestamptz not null default now()
);

create index if not exists project_health_snapshots_project_time_idx
  on public.project_health_snapshots (project_id, computed_at desc);

create index if not exists project_health_snapshots_ws_project_time_idx
  on public.project_health_snapshots (workspace_id, project_id, computed_at desc);

comment on table public.project_health_snapshots is
  '프로젝트 건강/위험도 점수 스냅샷(0~100, 높을수록 위험)';

-- ---------------------------------------------------------------------------
-- C. 일정 충돌 감지 결과
-- ---------------------------------------------------------------------------
create table if not exists public.schedule_conflicts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  schedule_a_id uuid not null references public.schedules (id) on delete cascade,
  schedule_b_id uuid not null references public.schedules (id) on delete cascade,
  overlap_minutes int not null check (overlap_minutes > 0),
  severity text not null check (severity in ('low', 'medium', 'high')),
  detected_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint schedule_conflicts_pair_chk check (schedule_a_id <> schedule_b_id)
);

create index if not exists schedule_conflicts_ws_user_idx
  on public.schedule_conflicts (workspace_id, user_id, detected_at desc);

create index if not exists schedule_conflicts_a_idx
  on public.schedule_conflicts (schedule_a_id);

create index if not exists schedule_conflicts_b_idx
  on public.schedule_conflicts (schedule_b_id);

create unique index if not exists schedule_conflicts_open_unique_idx
  on public.schedule_conflicts (
    least(schedule_a_id, schedule_b_id),
    greatest(schedule_a_id, schedule_b_id),
    user_id
  )
  where resolved_at is null;

comment on table public.schedule_conflicts is
  '사용자 일정 간 시간 겹침 감지 로그(미해결 충돌 추적)';

-- ---------------------------------------------------------------------------
-- RLS: 읽기만 워크스페이스 멤버/오너 허용, 쓰기는 서버/크론(service role) 전용
-- ---------------------------------------------------------------------------
alter table public.workspace_automation_rules enable row level security;
alter table public.workspace_automation_runs enable row level security;
alter table public.project_health_snapshots enable row level security;
alter table public.schedule_conflicts enable row level security;

drop policy if exists "war_select" on public.workspace_automation_rules;
create policy "war_select" on public.workspace_automation_rules
  for select using (public.can_access_workspace(workspace_id));

drop policy if exists "warun_select" on public.workspace_automation_runs;
create policy "warun_select" on public.workspace_automation_runs
  for select using (public.can_access_workspace(workspace_id));

drop policy if exists "phs_select" on public.project_health_snapshots;
create policy "phs_select" on public.project_health_snapshots
  for select using (public.can_access_workspace(workspace_id));

drop policy if exists "scf_select" on public.schedule_conflicts;
create policy "scf_select" on public.schedule_conflicts
  for select using (public.can_access_workspace(workspace_id));
