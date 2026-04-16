-- Noti: 타임존, 일정 알림 로그, 인앱 알림, 문서 휴지통·리비전, 일정 RLS 정합

-- ---------------------------------------------------------------------------
-- 워크스페이스 표시 타임존 (저장 일정은 timestamptz; UI/크론 기준 안내용)
-- ---------------------------------------------------------------------------
alter table public.workspaces
  add column if not exists display_timezone text not null default 'Asia/Seoul';

comment on column public.workspaces.display_timezone is
  '문서·일정 UI 및 D-day 크론 기준 타임존(IANA). 기본 Asia/Seoul.';

-- ---------------------------------------------------------------------------
-- 일정: N일 전 / N분 전 리마인더 (null = 사용 안 함)
-- ---------------------------------------------------------------------------
alter table public.schedules
  add column if not exists remind_days_before int;

alter table public.schedules
  add column if not exists remind_minutes_before int;

alter table public.schedules
  drop constraint if exists schedules_remind_days_before_chk;

alter table public.schedules
  add constraint schedules_remind_days_before_chk
  check (remind_days_before is null or (remind_days_before >= 0 and remind_days_before <= 30));

alter table public.schedules
  drop constraint if exists schedules_remind_minutes_before_chk;

alter table public.schedules
  add constraint schedules_remind_minutes_before_chk
  check (
    remind_minutes_before is null
    or remind_minutes_before in (5, 10, 15, 30, 60, 120)
  );

comment on column public.schedules.remind_days_before is
  '시작일(워크스페이스 표시 TZ 기준 날짜) 기준 N일 전 1회 알림. null 이면 미사용.';

comment on column public.schedules.remind_minutes_before is
  '시작 시각 N분 전 1회 알림(크론이 수분 단위로 호출될 때). null 이면 미사용.';

-- ---------------------------------------------------------------------------
-- 크론 중복 방지 로그 (일정 × 종류 × 버킷)
-- ---------------------------------------------------------------------------
create table if not exists public.schedule_notification_log (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.schedules (id) on delete cascade,
  kind text not null check (kind in ('dday', 'remind_day', 'remind_minute')),
  bucket text not null,
  created_at timestamptz not null default now(),
  unique (schedule_id, kind, bucket)
);

create index if not exists schedule_notification_log_schedule_idx
  on public.schedule_notification_log (schedule_id);

comment on table public.schedule_notification_log is
  '일정 알림 크론 idempotency: 동일 bucket 에 대해 한 번만 전송';

alter table public.schedule_notification_log enable row level security;

-- 인증 사용자는 읽기 불가(운영은 service role)
-- 정책 없음 = 거절

-- ---------------------------------------------------------------------------
-- 인앱 알림
-- ---------------------------------------------------------------------------
create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  body text,
  href text,
  kind text not null default 'info',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists user_notifications_user_created_idx
  on public.user_notifications (user_id, created_at desc);

comment on table public.user_notifications is
  '대시보드 벨 알림. INSERT 는 service role(크론) 등 서버만.';

alter table public.user_notifications enable row level security;

drop policy if exists "un_select_own" on public.user_notifications;
create policy "un_select_own" on public.user_notifications
  for select using (auth.uid() = user_id);

drop policy if exists "un_update_own" on public.user_notifications;
create policy "un_update_own" on public.user_notifications
  for update using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 문서 휴지통
-- ---------------------------------------------------------------------------
alter table public.workspace_pages
  add column if not exists deleted_at timestamptz;

create index if not exists workspace_pages_ws_deleted_idx
  on public.workspace_pages (workspace_id)
  where deleted_at is not null;

comment on column public.workspace_pages.deleted_at is
  '소프트 삭제 시각. null 이면 활성. 30일 후 크론으로 영구 삭제 가능.';

-- ---------------------------------------------------------------------------
-- 문서 리비전 (저장 시 스냅샷)
-- ---------------------------------------------------------------------------
create table if not exists public.workspace_page_revisions (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.workspace_pages (id) on delete cascade,
  title text not null,
  content_json text not null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists workspace_page_revisions_page_idx
  on public.workspace_page_revisions (page_id, created_at desc);

alter table public.workspace_page_revisions enable row level security;

drop policy if exists "wpr_select" on public.workspace_page_revisions;
create policy "wpr_select" on public.workspace_page_revisions
  for select using (
    exists (
      select 1 from public.workspace_pages wp
      where wp.id = page_id
        and public.can_access_workspace(wp.workspace_id)
    )
  );

drop policy if exists "wpr_insert" on public.workspace_page_revisions;
create policy "wpr_insert" on public.workspace_page_revisions
  for insert with check (
    exists (
      select 1 from public.workspace_pages wp
      where wp.id = page_id
        and public.can_access_workspace(wp.workspace_id)
    )
  );

-- ---------------------------------------------------------------------------
-- schedules RLS: 수정·삭제는 작성자 또는 프로젝트 Admin/Manager (또는 프로젝트 생성자)
-- ---------------------------------------------------------------------------
drop policy if exists "schedules_update_access" on public.schedules;
create policy "schedules_update_access" on public.schedules
  for update using (
    public.can_access_project(project_id)
    and (
      created_by = auth.uid()
      or public.project_admin_or_manager(project_id)
    )
  );

drop policy if exists "schedules_delete_access" on public.schedules;
create policy "schedules_delete_access" on public.schedules
  for delete using (
    public.can_access_project(project_id)
    and (
      created_by = auth.uid()
      or public.project_admin_or_manager(project_id)
    )
  );
