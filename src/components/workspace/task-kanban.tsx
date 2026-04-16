"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import {
  createWorkspaceTask,
  deleteWorkspaceTask,
  moveWorkspaceTask,
} from "@/actions/workspace-hub";
import { KANBAN_COLUMNS } from "@/lib/workspace/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";

export type WorkspaceTaskRow = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  position: number;
};

export function TaskKanban({
  workspaceId,
  initialTasks,
}: {
  workspaceId: string;
  initialTasks: WorkspaceTaskRow[];
}) {
  const router = useRouter();
  const [newTitle, setNewTitle] = React.useState("");
  const [newStatus, setNewStatus] = React.useState<string>("todo");
  const [pending, startTransition] = React.useTransition();

  function tasksIn(status: string) {
    return initialTasks
      .filter((t) => t.status === status)
      .sort((a, b) => a.position - b.position || a.title.localeCompare(b.title, "ko"));
  }

  function addTask(e: React.FormEvent) {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title) {
      return;
    }
    startTransition(async () => {
      const res = await createWorkspaceTask({
        workspaceId,
        title,
        status: newStatus,
        priority: "medium",
        dueDate: null,
      });
      if (!res.error) {
        setNewTitle("");
        router.refresh();
      }
    });
  }

  function changeStatus(task: WorkspaceTaskRow, status: string) {
    if (task.status === status) {
      return;
    }
    const col = tasksIn(status);
    const maxP = col.reduce((m, t) => Math.max(m, t.position), -1);
    const nextPos = maxP + 1;
    startTransition(async () => {
      await moveWorkspaceTask(task.id, workspaceId, status, nextPos);
      router.refresh();
    });
  }

  function remove(taskId: string) {
    if (!window.confirm("이 작업을 삭제할까요?")) {
      return;
    }
    startTransition(async () => {
      await deleteWorkspaceTask(taskId, workspaceId);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={addTask}
        className="flex max-w-2xl flex-col gap-2 rounded-xl border bg-card p-4 sm:flex-row sm:items-end"
      >
        <div className="flex-1 space-y-1">
          <label className="text-xs text-muted-foreground">새 작업</label>
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="제목"
            disabled={pending}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">열</label>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            disabled={pending}
          >
            {KANBAN_COLUMNS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" disabled={pending}>
          <Plus className="me-1 size-4" />
          추가
        </Button>
      </form>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {KANBAN_COLUMNS.map((col) => (
          <Card key={col.id} className="flex flex-col border-border/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">{col.label}</CardTitle>
              <CardDescription className="text-xs">
                {tasksIn(col.id).length}건
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-2 pt-0">
              <div className="flex min-h-[140px] flex-1 flex-col gap-2">
                {tasksIn(col.id).map((task) => (
                  <div
                    key={task.id}
                    className={cn(
                      "rounded-lg border bg-muted/30 p-3 text-sm shadow-sm",
                      task.priority === "high" && "border-destructive/40"
                    )}
                  >
                    <p className="font-medium leading-snug">{task.title}</p>
                    {task.description ? (
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                        {task.description}
                      </p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap items-center gap-1">
                      <select
                        className="h-8 max-w-full flex-1 rounded-md border border-input bg-background px-2 text-xs"
                        value={task.status}
                        onChange={(e) => changeStatus(task, e.target.value)}
                        disabled={pending}
                      >
                        {KANBAN_COLUMNS.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 text-destructive"
                        onClick={() => remove(task.id)}
                        disabled={pending}
                      >
                        삭제
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
