# Noti 배포 · 운영 환경 변수

Vercel(또는 자체 호스팅)에 올릴 때 아래를 설정합니다.

## 로컬 개발

- 루트의 `.env.example`을 참고해 `.env.local`을 채웁니다. 저장소에 넣은 예시에는 **`CRON_SECRET`** 기본값이 있어, 같은 값으로 Bearer 헤더를 붙이면 크론 API가 401 없이 응답합니다.
- 대시보드 상단 **운영 배너**(Resend / CRON 안내)는 **`NODE_ENV=production`일 때만** 표시됩니다. 로컬 `next dev`에서는 숨겨집니다.
- 프로덕션에서 배너를 없애려면 Vercel(또는 호스팅) 환경 변수에 `CRON_SECRET`·(메일 필요 시) `RESEND_API_KEY`를 반드시 넣습니다.

## 필수 (앱 기동)

| 변수 | 설명 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon(공개) 키 |

## 일정 알림 크론 (`/api/cron/schedule-dday`)

| 변수 | 설명 |
|------|------|
| `SUPABASE_SERVICE_ROLE_KEY` | 서버 전용. 크론이 DB에 쓰기·조회할 때 사용. **클라이언트에 넣지 마세요.** |
| `CRON_SECRET` | 크론 요청 헤더 `Authorization: Bearer <값>` 과 일치해야 함. 비어 있으면 API가 401. |

**스케줄:** `vercel.json` 에서 15분마다 `schedule-dday` 를 호출하도록 설정되어 있습니다. D-day·N일 전·N분 전 알림을 모두 처리합니다.

**타임존:** 알림의 “날짜” 판단은 **Asia/Seoul** 달력 기준입니다. 워크스페이스 `display_timezone` 은 UI·안내용이며, 크론 로직과 다를 수 있습니다.

## 메일 (선택)

| 변수 | 설명 |
|------|------|
| `RESEND_API_KEY` | 없으면 메일은 보내지 않고, 인앱 알림(`user_notifications`)만 생성됩니다. |
| `RESEND_FROM` | 예: `Noti <noreply@yourdomain.com>` (미설정 시 Resend 기본값) |

## 문서 휴지통 영구 삭제 (`/api/cron/purge-doc-trash`)

| 변수 | 설명 |
|------|------|
| 위와 동일 | `CRON_SECRET` + `SUPABASE_SERVICE_ROLE_KEY` |

`deleted_at` 이 30일 지난 `workspace_pages` 행을 삭제합니다. `vercel.json` 에서 매일 1회 호출 예시가 있습니다.

## Storage (채팅 첨부)

| 항목 | 설명 |
|------|------|
| 버킷 `context-chat` | 마이그레이션 `20260411120000_context_chat_storage.sql` 로 생성(비공개). |
| RLS | 객체 경로 `{workspace_id}/{context_type}/{context_id}/파일` 기준으로 `can_access_chat_context` 와 일치할 때만 읽기·업로드. |

Supabase 대시보드에서 Storage 가 켜져 있어야 합니다.

## 데이터베이스 마이그레이션

Supabase CLI 또는 SQL Editor로 `supabase/migrations/` 를 순서대로 적용하세요.  
특히 다음을 포함합니다.

- `20260410120000_noti_ops_enhancements.sql` — 알림 로그, 인앱 알림, 문서 휴지통·리비전, 일정 RLS 정합, 워크스페이스 타임존 컬럼
- `20260411120000_context_chat_storage.sql` — 채팅 첨부 컬럼·Storage 버킷·객체 RLS

기존 안내에 나온 060~081 마이그레이션 이후에 적용하는 것을 권장합니다.
