"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

import { switchWorkspaceById } from "@/actions/workspace-hub";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * `/dashboard/...?ws=<workspace_uuid>` 로 들어오면 접근 가능한 워크스페이스일 때
 * `profiles.current_workspace_id` 를 맞추고, 쿼리에서 `ws` 를 제거합니다.
 */
export function WorkspaceQuerySync({ workspaceIds }: { workspaceIds: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const wsParam = useSearchParams().get("ws");
  const allowedRef = useRef(new Set(workspaceIds));

  useEffect(() => {
    allowedRef.current = new Set(workspaceIds);
  }, [workspaceIds]);

  useEffect(() => {
    if (!wsParam || typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    params.delete("ws");
    const qs = params.toString();
    const nextUrl = qs ? `${pathname}?${qs}` : pathname;

    if (!UUID_RE.test(wsParam) || !allowedRef.current.has(wsParam)) {
      router.replace(nextUrl);
      return;
    }

    let cancelled = false;

    (async () => {
      await switchWorkspaceById(wsParam);
      if (cancelled) {
        return;
      }
      router.replace(nextUrl);
      router.refresh();
    })();

    return () => {
      cancelled = true;
    };
  }, [wsParam, pathname, router]);

  return null;
}
