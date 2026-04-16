-- profiles.email (조직/프로젝트 멤버 목록 표시용, auth.users 와 동기화)
alter table public.profiles add column if not exists email text;

update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id
  and (p.email is null or p.email = '');

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, email)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1)
    ),
    new.email
  )
  on conflict (id) do update
    set display_name = coalesce(excluded.display_name, public.profiles.display_name),
        email = coalesce(excluded.email, public.profiles.email);
  return new;
end;
$$;

-- 일정 D-day 팀 메일 알림 (크론이 하루 1회 전송, 컬럼으로 중복 방지)
alter table public.schedules
  add column if not exists notify_on_dday boolean not null default true;
alter table public.schedules
  add column if not exists dday_email_sent_on date;

comment on column public.schedules.notify_on_dday is '시작일(로컬 날짜) 당일 팀원에게 메일 알림';
comment on column public.schedules.dday_email_sent_on is '해당 날짜에 알림을 보냈으면 기록';
