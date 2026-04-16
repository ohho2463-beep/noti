-- Day 10~11: 자동화/리스크/충돌 알림 + 충돌 감지 엔진 + 룰 실행 쿨다운 헬퍼

-- ---------------------------------------------------------------------------
-- 알림 헬퍼 함수
-- ---------------------------------------------------------------------------
create or replace function public.notify_user(
  p_user_id uuid,
  p_kind text,
  p_title text,
  p_body text,
  p_href text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null then
    return;
  end if;

  insert into public.user_notifications (user_id, title, body, href, kind)
  values (p_user_id, p_title, p_body, p_href, p_kind);
end;
$$;

revoke all on function public.notify_user(uuid, text, text, text, text) from public;
grant execute on function public.notify_user(uuid, text, text, text, text) to authenticated;

comment on function public.notify_user(uuid, text, text, text, text) is
  '서버/트리거용 인앱 알림 생성 헬퍼';

comment on column public.user_notifications.kind is
  '알림 유형 (예: info, automation_run_success, automation_run_failed, project_health_risk, schedule_conflict_detected)';

-- ---------------------------------------------------------------------------
-- 룰 실행 쿨다운 보장 헬퍼
-- 동일(rule + target)에서 cooldown 내 success 중복 실행을 skipped 로 기록
-- ---------------------------------------------------------------------------
create or replace function public.record_workspace_automation_run(
  p_rule_id uuid,
  p_workspace_id uuid,
  p_target_type text default 'schedule',
  p_target_id uuid default null,
  p_status text default 'success',
  p_reason text default null,
  p_created_resource jsonb default null
)
returns public.workspace_automation_runs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_run public.workspace_automation_runs%rowtype;
  v_cooldown int;
  v_has_recent_success boolean := false;
begin
  select war.cooldown_minutes
    into v_cooldown
  from public.workspace_automation_rules war
  where war.id = p_rule_id
    and war.workspace_id = p_workspace_id;

  if v_cooldown is null then
    raise exception 'rule not found for workspace';
  end if;

  if p_status = 'success' then
    select exists (
      select 1
      from public.workspace_automation_runs wr
      where wr.rule_id = p_rule_id
        and wr.workspace_id = p_workspace_id
        and wr.target_type = coalesce(p_target_type, 'schedule')
        and wr.target_id is not distinct from p_target_id
        and wr.status = 'success'
        and wr.executed_at >= (now() - make_interval(mins => v_cooldown))
    )
    into v_has_recent_success;
  end if;

  insert into public.workspace_automation_runs (
    rule_id,
    workspace_id,
    target_type,
    target_id,
    status,
    reason,
    created_resource
  )
  values (
    p_rule_id,
    p_workspace_id,
    coalesce(p_target_type, 'schedule'),
    p_target_id,
    case when v_has_recent_success then 'skipped' else p_status end,
    case
      when v_has_recent_success then coalesce(p_reason, 'cooldown_active')
      else p_reason
    end,
    p_created_resource
  )
  returning * into v_run;

  return v_run;
end;
$$;

revoke all on function public.record_workspace_automation_run(uuid, uuid, text, uuid, text, text, jsonb) from public;
grant execute on function public.record_workspace_automation_run(uuid, uuid, text, uuid, text, text, jsonb) to authenticated;

comment on function public.record_workspace_automation_run(uuid, uuid, text, uuid, text, text, jsonb) is
  '룰 실행 기록 + cooldown 내 success 중복은 skipped 처리';

-- ---------------------------------------------------------------------------
-- 자동화 run 알림 트리거
-- 실패 즉시 담당자 알림(룰 생성자, 없으면 워크스페이스 오너)
-- ---------------------------------------------------------------------------
create or replace function public.handle_automation_run_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_assignee uuid;
  v_rule_name text;
  v_target_label text;
begin
  if new.status not in ('success', 'failed') then
    return new;
  end if;

  select coalesce(war.created_by, w.owner_id), war.name
    into v_assignee, v_rule_name
  from public.workspace_automation_rules war
  join public.workspaces w on w.id = war.workspace_id
  where war.id = new.rule_id;

  v_target_label := coalesce(new.target_type, 'target') || ':' || coalesce(new.target_id::text, '-');

  if new.status = 'failed' then
    perform public.notify_user(
      v_assignee,
      'automation_run_failed',
      '[자동화 실패] ' || coalesce(v_rule_name, 'Unnamed Rule'),
      coalesce(new.reason, '자동화 실행 중 오류가 발생했습니다.'),
      '/dashboard/workspaces/' || new.workspace_id::text || '/automation'
    );
  else
    perform public.notify_user(
      v_assignee,
      'automation_run_success',
      '[자동화 완료] ' || coalesce(v_rule_name, 'Unnamed Rule'),
      '대상: ' || v_target_label,
      '/dashboard/workspaces/' || new.workspace_id::text || '/automation'
    );
  end if;

  return new;
end;
$$;

drop trigger if exists workspace_automation_run_notify on public.workspace_automation_runs;
create trigger workspace_automation_run_notify
after insert on public.workspace_automation_runs
for each row execute function public.handle_automation_run_notification();

-- ---------------------------------------------------------------------------
-- 리스크 전환 알림 트리거
-- risk 전환 시 PM(Manager) / Admin / 프로젝트 생성자에게 알림
-- ---------------------------------------------------------------------------
create or replace function public.handle_project_health_risk_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prev_grade text;
  v_project_name text;
  v_title text;
  v_body text;
  v_overdue_tasks int := 0;
  v_delayed_schedules int := 0;
  v_user_id uuid;
begin
  select phs.grade
    into v_prev_grade
  from public.project_health_snapshots phs
  where phs.project_id = new.project_id
    and phs.id <> new.id
  order by phs.computed_at desc, phs.id desc
  limit 1;

  if new.grade <> 'risk' or v_prev_grade = 'risk' then
    return new;
  end if;

  select p.name into v_project_name
  from public.projects p
  where p.id = new.project_id;

  v_overdue_tasks := coalesce((new.factors ->> 'overdue_tasks')::int, 0);
  v_delayed_schedules := coalesce((new.factors ->> 'delayed_schedules')::int, 0);

  v_title := '[위험] 프로젝트 ' || coalesce(v_project_name, new.project_id::text) || ' 위험도 상승';
  v_body := '지연 일정 ' || v_delayed_schedules::text || '건, 마감 초과 태스크 ' || v_overdue_tasks::text || '건';

  for v_user_id in
    select distinct uid from (
      select p.created_by as uid
      from public.projects p
      where p.id = new.project_id
      union all
      select pm.user_id as uid
      from public.project_members pm
      where pm.project_id = new.project_id
        and pm.role in ('Admin', 'Manager')
    ) t
    where uid is not null
  loop
    perform public.notify_user(
      v_user_id,
      'project_health_risk',
      v_title,
      v_body,
      '/dashboard/projects/' || new.project_id::text
    );
  end loop;

  return new;
end;
$$;

drop trigger if exists project_health_risk_notify on public.project_health_snapshots;
create trigger project_health_risk_notify
after insert on public.project_health_snapshots
for each row execute function public.handle_project_health_risk_notification();

-- ---------------------------------------------------------------------------
-- 일정 충돌 감지/해소 엔진
-- ---------------------------------------------------------------------------
create or replace function public.refresh_schedule_conflicts_for_schedule(p_schedule_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ws_id uuid;
begin
  select p.workspace_id
    into v_ws_id
  from public.schedules s
  join public.projects p on p.id = s.project_id
  where s.id = p_schedule_id;

  if v_ws_id is null then
    return;
  end if;

  -- 기존 오픈 충돌 중 더 이상 겹치지 않으면 resolved 처리
  update public.schedule_conflicts sc
  set resolved_at = now()
  from public.schedules sa, public.schedules sb
  where sc.resolved_at is null
    and (sc.schedule_a_id = p_schedule_id or sc.schedule_b_id = p_schedule_id)
    and sa.id = sc.schedule_a_id
    and sb.id = sc.schedule_b_id
    and least(sa.end_time, sb.end_time) <= greatest(sa.start_time, sb.start_time);

  -- 신규 겹침 충돌 생성 (같은 참가자 기준)
  insert into public.schedule_conflicts (
    workspace_id,
    user_id,
    schedule_a_id,
    schedule_b_id,
    overlap_minutes,
    severity
  )
  select
    v_ws_id,
    sp1.user_id,
    least(s1.id, s2.id),
    greatest(s1.id, s2.id),
    greatest(1, floor(extract(epoch from (least(s1.end_time, s2.end_time) - greatest(s1.start_time, s2.start_time))) / 60)::int),
    case
      when extract(epoch from (least(s1.end_time, s2.end_time) - greatest(s1.start_time, s2.start_time))) / 60 >= 120 then 'high'
      when extract(epoch from (least(s1.end_time, s2.end_time) - greatest(s1.start_time, s2.start_time))) / 60 >= 30 then 'medium'
      else 'low'
    end
  from public.schedules s1
  join public.projects p1 on p1.id = s1.project_id
  join public.schedule_participants sp1 on sp1.schedule_id = s1.id
  join public.schedule_participants sp2 on sp2.user_id = sp1.user_id
  join public.schedules s2 on s2.id = sp2.schedule_id
  join public.projects p2 on p2.id = s2.project_id
  where (s1.id = p_schedule_id or s2.id = p_schedule_id)
    and s1.id < s2.id
    and p1.workspace_id = v_ws_id
    and p2.workspace_id = v_ws_id
    and least(s1.end_time, s2.end_time) > greatest(s1.start_time, s2.start_time)
    and not exists (
      select 1
      from public.schedule_conflicts open_sc
      where open_sc.resolved_at is null
        and open_sc.user_id = sp1.user_id
        and least(open_sc.schedule_a_id, open_sc.schedule_b_id) = least(s1.id, s2.id)
        and greatest(open_sc.schedule_a_id, open_sc.schedule_b_id) = greatest(s1.id, s2.id)
    );
end;
$$;

comment on function public.refresh_schedule_conflicts_for_schedule(uuid) is
  '특정 일정 기준 충돌 재계산(신규 삽입 + 비중첩 resolved)';

create or replace function public.handle_schedule_time_change_refresh_conflicts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.refresh_schedule_conflicts_for_schedule(new.id);
  return new;
end;
$$;

drop trigger if exists schedules_conflict_refresh on public.schedules;
create trigger schedules_conflict_refresh
after insert or update of start_time, end_time on public.schedules
for each row execute function public.handle_schedule_time_change_refresh_conflicts();

create or replace function public.handle_schedule_participants_refresh_conflicts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.refresh_schedule_conflicts_for_schedule(coalesce(new.schedule_id, old.schedule_id));
  return coalesce(new, old);
end;
$$;

drop trigger if exists schedule_participants_conflict_refresh on public.schedule_participants;
create trigger schedule_participants_conflict_refresh
after insert or delete on public.schedule_participants
for each row execute function public.handle_schedule_participants_refresh_conflicts();

-- ---------------------------------------------------------------------------
-- high 충돌 알림 트리거
-- 해당 사용자 + 관련 프로젝트 관리자(Admin/Manager) + 프로젝트 생성자
-- ---------------------------------------------------------------------------
create or replace function public.handle_schedule_conflict_high_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_project_a uuid;
  v_project_b uuid;
begin
  if new.severity <> 'high' or new.resolved_at is not null then
    return new;
  end if;

  select project_id into v_project_a from public.schedules where id = new.schedule_a_id;
  select project_id into v_project_b from public.schedules where id = new.schedule_b_id;

  perform public.notify_user(
    new.user_id,
    'schedule_conflict_detected',
    '[충돌] 일정 시간이 겹칩니다',
    '겹침 시간: ' || new.overlap_minutes::text || '분 (심각도: high)',
    '/dashboard/schedules'
  );

  for v_user_id in
    select distinct uid
    from (
      select p.created_by as uid from public.projects p where p.id in (v_project_a, v_project_b)
      union all
      select pm.user_id as uid
      from public.project_members pm
      where pm.project_id in (v_project_a, v_project_b)
        and pm.role in ('Admin', 'Manager')
    ) t
    where uid is not null
  loop
    perform public.notify_user(
      v_user_id,
      'schedule_conflict_detected',
      '[긴급] 팀 일정 high 충돌 감지',
      '사용자 일정 간 ' || new.overlap_minutes::text || '분 충돌이 감지되었습니다.',
      '/dashboard/schedules'
    );
  end loop;

  return new;
end;
$$;

drop trigger if exists schedule_conflict_high_notify on public.schedule_conflicts;
create trigger schedule_conflict_high_notify
after insert on public.schedule_conflicts
for each row execute function public.handle_schedule_conflict_high_notification();
