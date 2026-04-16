-- 컨텍스트 채팅 첨부: Storage 버킷 + 객체 RLS + 메시지 컬럼
-- 객체 경로: {workspace_id}/{context_type}/{context_id}/{uuid}_{filename}
--
-- 선행 조건: 반드시 아래를 먼저 적용해야 합니다.
--   supabase/migrations/20260409120000_schedule_participants_context_chat.sql
--   → context_chat_messages 테이블 + can_access_chat_context() 함수 생성
-- 로컬: 저장소 루트에서 `npx supabase db push` (전체 순서대로 적용)
-- SQL Editor만 쓸 경우: 위 091 파일 전체 실행 후 이 파일을 실행하세요.

do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'context_chat_messages'
      and c.relkind = 'r'
  ) then
    raise exception
      'public.context_chat_messages 가 없습니다. 먼저 20260409120000_schedule_participants_context_chat.sql 을 실행한 뒤 이 파일을 다시 실행하세요.';
  end if;
  if not exists (
    select 1
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on p.pronamespace = n.oid
    where n.nspname = 'public'
      and p.proname = 'can_access_chat_context'
  ) then
    raise exception
      'public.can_access_chat_context 가 없습니다. 20260409120000_schedule_participants_context_chat.sql 을 먼저 실행하세요.';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 메시지 테이블
-- ---------------------------------------------------------------------------
alter table public.context_chat_messages
  add column if not exists attachment_path text;

alter table public.context_chat_messages
  add column if not exists attachment_name text;

alter table public.context_chat_messages
  add column if not exists attachment_mime text;

alter table public.context_chat_messages
  add column if not exists attachment_size int;

comment on column public.context_chat_messages.attachment_path is
  'storage context-chat 버킷 내 경로 (ws/type/contextId/파일)';

alter table public.context_chat_messages
  drop constraint if exists context_chat_messages_body_check;

alter table public.context_chat_messages
  add constraint context_chat_messages_body_or_attachment_chk check (
    char_length(body) <= 4000
    and (
      (char_length(trim(body)) > 0)
      or (
        attachment_path is not null
        and char_length(trim(attachment_path)) > 0
      )
    )
  );

-- ---------------------------------------------------------------------------
-- Storage 버킷 (비공개)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('context-chat', 'context-chat', false)
on conflict (id) do update set public = excluded.public;

-- ---------------------------------------------------------------------------
-- Storage RLS (경로 4세그먼트: ws / context_type / context_id / object)
-- ---------------------------------------------------------------------------
drop policy if exists "context_chat_objects_select" on storage.objects;
create policy "context_chat_objects_select" on storage.objects for select to authenticated using (
  bucket_id = 'context-chat'
  and split_part(name, '/', 1) ~ '^[0-9a-f-]{36}$'
  and split_part(name, '/', 2) in ('workspace', 'project', 'schedule', 'page')
  and split_part(name, '/', 3) ~ '^[0-9a-f-]{36}$'
  and public.can_access_chat_context(
    (split_part(name, '/', 1))::uuid,
    split_part(name, '/', 2),
    (split_part(name, '/', 3))::uuid
  )
);

drop policy if exists "context_chat_objects_insert" on storage.objects;
create policy "context_chat_objects_insert" on storage.objects for insert to authenticated with check (
  bucket_id = 'context-chat'
  and split_part(name, '/', 1) ~ '^[0-9a-f-]{36}$'
  and split_part(name, '/', 2) in ('workspace', 'project', 'schedule', 'page')
  and split_part(name, '/', 3) ~ '^[0-9a-f-]{36}$'
  and public.can_access_chat_context(
    (split_part(name, '/', 1))::uuid,
    split_part(name, '/', 2),
    (split_part(name, '/', 3))::uuid
  )
);

drop policy if exists "context_chat_objects_delete" on storage.objects;
create policy "context_chat_objects_delete" on storage.objects for delete to authenticated using (
  bucket_id = 'context-chat'
  and owner = auth.uid()
  and split_part(name, '/', 1) ~ '^[0-9a-f-]{36}$'
  and split_part(name, '/', 2) in ('workspace', 'project', 'schedule', 'page')
  and split_part(name, '/', 3) ~ '^[0-9a-f-]{36}$'
  and public.can_access_chat_context(
    (split_part(name, '/', 1))::uuid,
    split_part(name, '/', 2),
    (split_part(name, '/', 3))::uuid
  )
);
