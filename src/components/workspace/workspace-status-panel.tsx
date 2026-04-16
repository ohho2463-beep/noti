import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { getWorkspaceBootstrap } from "@/lib/workspace/server-context";

type Wb = Awaited<ReturnType<typeof getWorkspaceBootstrap>>;

export function WorkspaceStatusPanel({ wb }: { wb: Wb }) {
  if (!wb.workspaceId) {
    return (
    <Card className="border-amber-500/40 bg-amber-500/5">
      <CardHeader>
        <CardTitle className="text-base">워크스페이스를 사용할 수 없습니다</CardTitle>
        <CardDescription>
          연결된 Supabase DB에 <code className="rounded bg-muted px-1 text-xs">workspaces</code> 테이블과{" "}
          <code className="rounded bg-muted px-1 text-xs">profiles.current_workspace_id</code> 컬럼이 있어야
          합니다. 아래 순서로 적용하면 해결되는 경우가 많습니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        {wb.workspaceSchemaMissing ? (
          <ol className="list-decimal space-y-2 ps-5">
            <li>
              <strong className="text-foreground">Supabase 웹</strong>: 프로젝트 →{" "}
              <strong className="text-foreground">SQL Editor</strong> → New query
            </li>
            <li>
              로컬 폴더{" "}
              <code className="rounded bg-muted px-1 text-xs">noti/supabase/migrations/</code> 에서 파일을 연
              뒤,{" "}
              <strong className="text-foreground">전체 내용을 복사해 한 번에 실행(Run)</strong>하세요.
              <ul className="mt-1 list-disc ps-5 text-xs">
                <li>
                  <code className="rounded bg-muted px-0.5">20260406000000_noti_v2_workspace.sql</code> (필수)
                </li>
                <li>
                  <code className="rounded bg-muted px-0.5">20260406100000_profiles_workspace_peers_select.sql</code>
                </li>
                <li>
                  <code className="rounded bg-muted px-0.5">20260407120000_profiles_email_schedules_notify.sql</code>
                </li>
                <li>
                  <code className="rounded bg-muted px-0.5">20260408100000_create_personal_workspace_rpc.sql</code>{" "}
                  (RLS 로 workspaces 생성이 막힐 때)
                </li>
              </ul>
            </li>
            <li>
              <strong className="text-foreground">Supabase CLI</strong>: 터미널에서{" "}
              <code className="rounded bg-muted px-1 text-xs">cd noti</code> 후{" "}
              <code className="rounded bg-muted px-1 text-xs">npx supabase link</code> 로 프로젝트 연결 →{" "}
              <code className="rounded bg-muted px-1 text-xs">npx supabase db push</code>
            </li>
            <li>실행 후 이 페이지를 새로고침하세요.</li>
          </ol>
        ) : null}
        {wb.workspaceMigrateHint && !wb.workspaceSchemaMissing ? (
          <p>
            <strong className="text-foreground">안내:</strong> {wb.workspaceMigrateHint}
          </p>
        ) : null}
        {wb.workspaceError ? (
          <p className="rounded-md border border-border/80 bg-muted/30 p-2 text-xs">
            <strong className="text-foreground">서버 메시지:</strong> {wb.workspaceError}
          </p>
        ) : null}
        {!wb.workspaceSchemaMissing && !wb.workspaceError ? (
          <p>
            테이블은 있는데도 계속 이렇게 보이면, Supabase Table Editor에서{" "}
            <code className="rounded bg-muted px-0.5 text-xs">workspaces</code> 행과 본인{" "}
            <code className="rounded bg-muted px-0.5 text-xs">profiles.current_workspace_id</code> 가 서로 맞는지
            확인하거나, <code className="rounded bg-muted px-0.5 text-xs">current_workspace_id</code> 를 비운 뒤 새로고침해
            보세요.
          </p>
        ) : null}
        <p className="text-xs">
          <strong className="text-foreground">확인:</strong>{" "}
          <code className="rounded bg-muted px-1">.env.local</code> 의{" "}
          <code className="rounded bg-muted px-1">NEXT_PUBLIC_SUPABASE_URL</code> 이 이 마이그레이션을 적용한
          프로젝트와 같은지 대시보드 URL과 비교해 보세요.
        </p>
      </CardContent>
    </Card>
    );
  }

  if (!wb.workspace) {
    return (
      <Card className="border-amber-500/40 bg-amber-500/5">
        <CardHeader>
          <CardTitle className="text-base">워크스페이스 정보를 불러오지 못했습니다</CardTitle>
          <CardDescription>
            현재 워크스페이스 ID는 있으나 목록에서 상세 행을 찾지 못했습니다. 상단 스위처로 다른 워크스페이스를
            선택한 뒤 다시 돌아오거나 페이지를 새로고침해 보세요.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return null;
}
