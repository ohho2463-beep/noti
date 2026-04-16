import { lockSiteAdminConsole } from "@/actions/site-admin";
import { Button } from "@/components/ui/button";

export function LockAdminSessionButton() {
  return (
    <form action={lockSiteAdminConsole}>
      <Button type="submit" variant="outline" size="sm">
        운영 콘솔 잠금 (암호 세션 종료)
      </Button>
    </form>
  );
}
