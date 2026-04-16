-- workspace_automation_rules 관리 정책 추가
-- 기존에는 select 정책만 있어 앱 사용자 생성/수정/삭제가 RLS에 막힘
-- 주의: 일부 환경에서 이 파일이 테이블 생성 마이그레이션보다 먼저 실행될 수 있으므로
--       테이블 존재 시에만 정책을 생성하도록 가드한다.

do $$
begin
  if to_regclass('public.workspace_automation_rules') is null then
    raise notice 'skip: public.workspace_automation_rules does not exist yet';
    return;
  end if;

  alter table public.workspace_automation_rules enable row level security;

  drop policy if exists "war_insert" on public.workspace_automation_rules;
  create policy "war_insert" on public.workspace_automation_rules
    for insert
    with check (
      public.can_manage_workspace(workspace_id)
      and created_by = auth.uid()
    );

  drop policy if exists "war_update" on public.workspace_automation_rules;
  create policy "war_update" on public.workspace_automation_rules
    for update
    using (public.can_manage_workspace(workspace_id))
    with check (public.can_manage_workspace(workspace_id));

  drop policy if exists "war_delete" on public.workspace_automation_rules;
  create policy "war_delete" on public.workspace_automation_rules
    for delete
    using (public.can_manage_workspace(workspace_id));
end
$$;
