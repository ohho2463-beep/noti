-- 동일 조직/프로젝트 멤버끼리 profiles(display_name 등) 조회 허용
DROP POLICY IF EXISTS "profiles_select_peers" ON public.profiles;
CREATE POLICY "profiles_select_peers" ON public.profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om_self
    JOIN public.organization_members om_peer ON om_self.organization_id = om_peer.organization_id
    WHERE om_self.user_id = auth.uid() AND om_peer.user_id = profiles.id
  )
  OR EXISTS (
    SELECT 1 FROM public.project_members pm_self
    JOIN public.project_members pm_peer ON pm_self.project_id = pm_peer.project_id
    WHERE pm_self.user_id = auth.uid() AND pm_peer.user_id = profiles.id
  )
);

-- 조직 관리자만: 이메일 → auth.users.id 조회 (서비스 롤 없이 초대용)
CREATE OR REPLACE FUNCTION public.lookup_user_id_by_email_for_org(
  p_organization_id uuid,
  p_email text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
DECLARE
  v_uid uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF NOT public.org_admin_or_owner(p_organization_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT id INTO v_uid
  FROM auth.users
  WHERE lower(email) = lower(trim(p_email))
  LIMIT 1;
  RETURN v_uid;
END;
$$;

REVOKE ALL ON FUNCTION public.lookup_user_id_by_email_for_org(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_user_id_by_email_for_org(uuid, text) TO authenticated;

-- 프로젝트 Admin/Manager: 이메일 → user id (멤버 초대)
CREATE OR REPLACE FUNCTION public.lookup_user_id_by_email_for_project(
  p_project_id uuid,
  p_email text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
DECLARE
  v_uid uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF NOT public.project_admin_or_manager(p_project_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT id INTO v_uid
  FROM auth.users
  WHERE lower(email) = lower(trim(p_email))
  LIMIT 1;
  RETURN v_uid;
END;
$$;

REVOKE ALL ON FUNCTION public.lookup_user_id_by_email_for_project(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_user_id_by_email_for_project(uuid, text) TO authenticated;
