-- 클라이언트에서 workspaces 직접 INSERT 시 RLS 오류가 나는 환경 대비 (세션/JWT 전달 이슈)
-- SECURITY DEFINER: owner_id 는 항상 auth.uid() 만 허용

-- 기본 워크스페이스 보장 (이미 있으면 그 id 반환)
create or replace function public.ensure_personal_workspace(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  wid uuid;
  owned_id uuid;
  pname text;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  pname := coalesce(nullif(trim(p_name), ''), '내 NOTI');

  select p.current_workspace_id into wid
  from public.profiles p
  where p.id = uid;

  if wid is not null and exists (select 1 from public.workspaces w where w.id = wid) then
    return wid;
  end if;

  select w.id into owned_id
  from public.workspaces w
  where w.owner_id = uid
  limit 1;

  if owned_id is not null then
    update public.profiles
    set current_workspace_id = owned_id
    where id = uid;
    return owned_id;
  end if;

  insert into public.workspaces (name, owner_id)
  values (pname, uid)
  returning id into wid;

  update public.profiles
  set current_workspace_id = wid
  where id = uid;

  return wid;
end;
$$;

revoke all on function public.ensure_personal_workspace(text) from public;
grant execute on function public.ensure_personal_workspace(text) to authenticated;

-- 스위처에서 "새 워크스페이스" (항상 새 행 + 현재 스페이스로 전환)
create or replace function public.create_additional_workspace(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  wid uuid;
  pname text;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  pname := coalesce(nullif(trim(p_name), ''), '워크스페이스');

  insert into public.workspaces (name, owner_id)
  values (pname, uid)
  returning id into wid;

  update public.profiles
  set current_workspace_id = wid
  where id = uid;

  return wid;
end;
$$;

revoke all on function public.create_additional_workspace(text) from public;
grant execute on function public.create_additional_workspace(text) to authenticated;

comment on function public.ensure_personal_workspace(text) is
  '첫 워크스페이스 조회/생성·profiles 연결 (RLS 이슈 회피)';
comment on function public.create_additional_workspace(text) is
  '추가 워크스페이스 생성 후 current_workspace_id 전환';
