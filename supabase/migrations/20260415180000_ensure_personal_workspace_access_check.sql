-- ensure_personal_workspace: 행이 "존재"만 하면 반환하던 동작을 수정.
-- SECURITY DEFINER 가 RLS 를 우회하므로, 소유자·멤버가 아닌 UUID 가 profiles 에 남아 있으면
-- 클라이언트는 workspaces 행을 읽지 못해 부트스트랩이 깨짐 → 포인터를 비우고 소유 워크스페이스/신규 생성으로 넘김.

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

  if wid is not null then
    if exists (
      select 1
      from public.workspaces w
      where w.id = wid
        and (
          w.owner_id = uid
          or exists (
            select 1
            from public.workspace_members wm
            where wm.workspace_id = w.id
              and wm.user_id = uid
          )
        )
    ) then
      return wid;
    end if;

    update public.profiles
    set current_workspace_id = null
    where id = uid;
    wid := null;
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

comment on function public.ensure_personal_workspace(text) is
  '첫 워크스페이스 조회/생성·profiles 연결 (접근 가능한 current_workspace_id 만 유지)';
