import type { Metadata } from "next";

import { TaskKanban, type WorkspaceTaskRow } from "@/components/workspace/task-kanban";
import { WorkspaceStatusPanel } from "@/components/workspace/workspace-status-panel";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceBootstrap } from "@/lib/workspace/server-context";

export const metadata: Metadata = {
  title: "태스크",
};

export default async function TasksPage() {
  const wb = await getWorkspaceBootstrap();
  const supabase = await createClient();

  if (!wb.workspaceId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">태스크 · 칸반</h1>
        <WorkspaceStatusPanel wb={wb} />
      </div>
    );
  }

  const { data: rows } = await supabase
    .from("workspace_tasks")
    .select("id, title, description, status, priority, due_date, position")
    .eq("workspace_id", wb.workspaceId)
    .order("position");

  const tasks = (rows ?? []) as WorkspaceTaskRow[];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">태스크 · 칸반</h1>
        <p className="text-muted-foreground">
          워크스페이스 단위 칸반입니다. 열은 To Do · In Progress · Review · Done 입니다.
        </p>
      </div>
      <TaskKanban workspaceId={wb.workspaceId} initialTasks={tasks} />
    </div>
  );
}
