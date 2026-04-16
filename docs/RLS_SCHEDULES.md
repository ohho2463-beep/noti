# 일정(schedules) RLS ↔ Server Action 정합

## RLS (PostgreSQL, `20260404000000_noti_core.sql` + `20260410120000_noti_ops_enhancements.sql`)

| 작업 | 정책 요약 |
|------|-----------|
| **SELECT** | `can_access_project(project_id)` — 프로젝트 멤버·생성자·소속 조직 멤버 등 |
| **INSERT** | `can_access_project(project_id)` **이고** `created_by = auth.uid()` |
| **UPDATE** | `can_access_project(project_id)` **이고** (`created_by = auth.uid()` **또는** `project_admin_or_manager(project_id)`) |
| **DELETE** | UPDATE 와 동일 |

`project_admin_or_manager` 는 프로젝트 멤버 역할이 **Admin / Manager** 이거나, 프로젝트 **created_by** 인 경우입니다.

## Server Actions (`src/actions/schedules.ts`)

| 액션 | 클라이언트 검증 | DB 방어 |
|------|-----------------|--------|
| `createSchedule` | 로그인·제목·유형 | INSERT RLS (`created_by` 고정) |
| `updateSchedule` | 제목·유형 | UPDATE RLS (작성자 또는 Admin/Manager) |
| `deleteSchedule` | id / project_id 폼 필드 | DELETE RLS (동일) |

**Viewer** 가 다른 사람이 만든 일정을 수정·삭제하면 RLS 에서 거절됩니다. UI에서는 프로젝트 상세의 일정 목록에서 **작성자이거나 Admin/Manager** 인 경우에만 수정·삭제 버튼을 노출합니다 (`schedule-list.tsx`).

## 참고

- 참가자(`schedule_participants`)는 별도 마이그레이션 `20260409120000_schedule_participants_context_chat.sql` 의 RLS 를 따릅니다.
- 크론 알림은 **service role** 로 동작하며 일반 세션 RLS 를 우회합니다. 엔드포인트는 `CRON_SECRET` 으로 보호해야 합니다.
