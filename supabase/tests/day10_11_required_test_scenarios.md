# Day 10~11 Required DB Test Scenarios

아래 시나리오는 `supabase db push` 후 SQL Editor 또는 `psql`에서 실행한다.

## 0) 사전 준비

- 테스트용 `workspace`, `project`, `schedule`, `schedule_participants`, `workspace_automation_rules` 데이터를 만든다.
- 검증 편의를 위해 아래 ID를 기록한다.
  - `:ws_id`
  - `:project_id`
  - `:schedule_a_id`, `:schedule_b_id`
  - `:rule_id`
  - `:user_target_id` (알림 대상 유저)

---

## 1) 룰 엔진

### 1-1. cooldown 동안 중복 실행 방지

```sql
-- 1) 첫 실행: success
select (public.record_workspace_automation_run(
  :rule_id, :ws_id, 'schedule', :schedule_a_id, 'success', null, null
)).*;

-- 2) 즉시 동일 타겟 재실행: skipped + reason=cooldown_active 기대
select (public.record_workspace_automation_run(
  :rule_id, :ws_id, 'schedule', :schedule_a_id, 'success', null, null
)).*;

-- 검증
select status, reason, executed_at
from public.workspace_automation_runs
where rule_id = :rule_id and target_id = :schedule_a_id
order by executed_at desc
limit 2;
```

기대 결과:
- 최신 run이 `status='skipped'`
- `reason='cooldown_active'`

### 1-2. 실패 시 run status + 알림 발송

```sql
insert into public.workspace_automation_runs (
  rule_id, workspace_id, target_type, target_id, status, reason
)
values (
  :rule_id, :ws_id, 'schedule', :schedule_a_id, 'failed', 'test_failure_case'
);

select kind, title, body, href, created_at
from public.user_notifications
where kind = 'automation_run_failed'
order by created_at desc
limit 1;
```

기대 결과:
- `workspace_automation_runs.status='failed'` 행 존재
- `user_notifications.kind='automation_run_failed'` 생성

---

## 2) 리스크

### 2-1. 데이터 변화 후 재계산 반영

```sql
insert into public.project_health_snapshots (
  workspace_id, project_id, score, grade, factors
)
values
  (:ws_id, :project_id, 45, 'stable', '{"overdue_tasks":1,"delayed_schedules":0}'::jsonb),
  (:ws_id, :project_id, 82, 'risk', '{"overdue_tasks":5,"delayed_schedules":2}'::jsonb);

select score, grade, factors, computed_at
from public.project_health_snapshots
where project_id = :project_id
order by computed_at desc
limit 2;
```

기대 결과:
- 최신 스냅샷 값이 변경된 데이터(`score=82`, `grade='risk'`)를 반영
- `project_health_risk` 알림이 PM/Admin/Owner 대상에게 생성

### 2-2. score/grade 경계값 검증 (49/50, 79/80)

```sql
insert into public.project_health_snapshots (workspace_id, project_id, score, grade, factors)
values
  (:ws_id, :project_id, 49, 'stable', '{}'::jsonb),
  (:ws_id, :project_id, 50, 'watch', '{}'::jsonb),
  (:ws_id, :project_id, 79, 'watch', '{}'::jsonb),
  (:ws_id, :project_id, 80, 'risk', '{}'::jsonb);

select score, grade
from public.project_health_snapshots
where project_id = :project_id
  and score in (49, 50, 79, 80)
order by score asc;
```

기대 결과:
- 저장값이 의도한 grade 매핑과 일치
- `80/risk` 전환 시 `project_health_risk` 알림 생성

---

## 3) 충돌

### 3-1. 겹치는 일정 생성 시 즉시 경고

```sql
-- A/B 일정 시간을 일부 겹치게 설정
update public.schedules
set start_time = now() + interval '1 hour',
    end_time   = now() + interval '4 hour'
where id = :schedule_a_id;

update public.schedules
set start_time = now() + interval '2 hour',
    end_time   = now() + interval '5 hour'
where id = :schedule_b_id;

-- 동일 사용자 참여 보장
insert into public.schedule_participants (schedule_id, user_id)
values (:schedule_a_id, :user_target_id)
on conflict do nothing;

insert into public.schedule_participants (schedule_id, user_id)
values (:schedule_b_id, :user_target_id)
on conflict do nothing;

select user_id, overlap_minutes, severity, resolved_at, detected_at
from public.schedule_conflicts
where user_id = :user_target_id
  and (
    (schedule_a_id = least(:schedule_a_id, :schedule_b_id) and schedule_b_id = greatest(:schedule_a_id, :schedule_b_id))
    or
    (schedule_a_id = least(:schedule_b_id, :schedule_a_id) and schedule_b_id = greatest(:schedule_b_id, :schedule_a_id))
  )
order by detected_at desc
limit 1;
```

기대 결과:
- 충돌 행이 즉시 생성 (`resolved_at is null`)
- 겹침 시간에 따라 `severity` 계산
- `high`면 `schedule_conflict_detected` 알림 발송

### 3-2. resolved 처리 (시간 변경 후 충돌 해소)

```sql
-- B 일정을 비충돌 구간으로 이동
update public.schedules
set start_time = now() + interval '6 hour',
    end_time   = now() + interval '7 hour'
where id = :schedule_b_id;

select resolved_at
from public.schedule_conflicts
where user_id = :user_target_id
  and schedule_a_id = least(:schedule_a_id, :schedule_b_id)
  and schedule_b_id = greatest(:schedule_a_id, :schedule_b_id)
order by detected_at desc
limit 1;
```

기대 결과:
- 기존 open 충돌의 `resolved_at`가 채워짐

---

## 4) 보안 (RLS)

### 4-1. 다른 workspace 데이터 접근 차단

테스트 방법:
- 사용자 A/B를 서로 다른 워크스페이스 멤버로 준비
- 사용자 A 세션으로 사용자 B 워크스페이스의 아래 테이블 조회 시도
  - `workspace_automation_rules`
  - `workspace_automation_runs`
  - `project_health_snapshots`
  - `schedule_conflicts`

기대 결과:
- 0 row 또는 권한 거절(정책상 비가시)

---

## 5) 알림 payload 예시 확인

```sql
select kind, title, body, href, created_at
from public.user_notifications
where kind in (
  'automation_run_success',
  'automation_run_failed',
  'project_health_risk',
  'schedule_conflict_detected'
)
order by created_at desc
limit 20;
```

확인 포인트:
- 제목/본문/링크가 요구 포맷에 맞는지
- 예: `[위험] 프로젝트 Alpha 위험도 상승`
- 링크 예: `/dashboard/projects/{id}`
