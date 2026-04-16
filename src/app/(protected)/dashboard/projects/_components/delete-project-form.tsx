"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";

import { deleteProject } from "@/actions/projects";
import { FormMessage } from "@/app/(protected)/dashboard/_components/form-message";
import { Button } from "@/components/ui/button";

export function DeleteProjectForm({ projectId, projectName }: { projectId: string; projectName: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(deleteProject, null);

  useEffect(() => {
    if (state?.success) {
      router.push("/dashboard/projects");
      router.refresh();
    }
  }, [state, router]);

  return (
    <form action={action} className="flex flex-col items-end gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
      <input type="hidden" name="id" value={projectId} />
      <p className="w-full text-sm text-muted-foreground">
        <strong className="text-destructive">삭제</strong> 시 일정·멤버 데이터가 함께 제거됩니다. 되돌릴 수 없습니다.
      </p>
      <FormMessage state={state} />
      <Button
        type="submit"
        variant="destructive"
        size="sm"
        disabled={pending}
        onClick={(e) => {
          if (!window.confirm(`프로젝트 «${projectName}»을(를) 삭제할까요?`)) {
            e.preventDefault();
          }
        }}
      >
        {pending ? "삭제 중…" : "프로젝트 삭제"}
      </Button>
    </form>
  );
}
