"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  createAutomationRule,
  deleteAutomationRule,
  updateAutomationRule,
} from "@/actions/automation-rules";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type ActionType = "notify_user" | "create_task" | "set_project_status";
type QuickRuleTemplate = {
  title: string;
  description: string;
  name: string;
  daysBefore: number;
  actionType: ActionType;
  template?: string;
  taskTitle?: string;
  nextStatus?: string;
  cooldownMinutes: number;
};

type RuleRow = {
  id: string;
  name: string;
  enabled: boolean;
  trigger_type: string;
  trigger_config: Record<string, unknown>;
  action_type: string;
  action_config: Record<string, unknown>;
  cooldown_minutes: number;
  updated_at: string;
};

type EditingRule = {
  id: string;
  name: string;
  enabled: boolean;
  trigger_type: "schedule_dday";
  days_before: number;
  action_type: ActionType;
  template: string;
  task_title: string;
  next_status: string;
  cooldown_minutes: number;
};

function getNumberConfig(config: Record<string, unknown>, key: string, fallback: number) {
  const value = config[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function getStringConfig(config: Record<string, unknown>, key: string, fallback: string) {
  const value = config[key];
  return typeof value === "string" && value.trim() ? value : fallback;
}

function buildActionConfig(rule: Pick<EditingRule, "action_type" | "template" | "task_title" | "next_status">) {
  if (rule.action_type === "create_task") {
    return { title: rule.task_title.trim() || "마감 알림 확인" };
  }
  if (rule.action_type === "set_project_status") {
    return { status: rule.next_status.trim() || "on_hold" };
  }
  return { template: rule.template.trim() || "dday_alert" };
}

const DAY_PRESETS = [0, 1, 3, 7];
const COOLDOWN_PRESETS = [
  { label: "1시간", value: 60 },
  { label: "6시간", value: 360 },
  { label: "1일", value: 1440 },
  { label: "3일", value: 4320 },
];
const STATUS_PRESETS = ["on_hold", "in_progress", "completed"];
const QUICK_RULE_TEMPLATES: QuickRuleTemplate[] = [
  {
    title: "D-0 긴급 알림",
    description: "마감 당일에 즉시 알림을 발송합니다.",
    name: "당일 긴급 알림",
    daysBefore: 0,
    actionType: "notify_user",
    template: "dday_alert",
    cooldownMinutes: 60,
  },
  {
    title: "D-1 후속 작업 생성",
    description: "마감 하루 전 체크리스트 태스크를 자동 생성합니다.",
    name: "마감 전 체크리스트 생성",
    daysBefore: 1,
    actionType: "create_task",
    taskTitle: "마감 하루 전 확인 태스크",
    cooldownMinutes: 1440,
  },
  {
    title: "D-3 자동 상태 전환",
    description: "마감 3일 전에 프로젝트 상태를 on_hold로 전환합니다.",
    name: "마감 임박 상태 전환",
    daysBefore: 3,
    actionType: "set_project_status",
    nextStatus: "on_hold",
    cooldownMinutes: 1440,
  },
];

export function AutomationRuleBuilder({
  workspaceId,
  initialRules,
}: {
  workspaceId: string;
  initialRules: RuleRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [newRule, setNewRule] = useState({
    name: "",
    enabled: true,
    triggerType: "schedule_dday" as const,
    daysBefore: 0,
    actionType: "notify_user" as ActionType,
    template: "dday_alert",
    taskTitle: "마감 알림 확인",
    nextStatus: "on_hold",
    cooldownMinutes: 1440,
  });

  const [editing, setEditing] = useState<Record<string, EditingRule>>(
    Object.fromEntries(
      initialRules.map((r) => [
        r.id,
        {
          id: r.id,
          name: r.name,
          enabled: r.enabled,
          trigger_type: "schedule_dday",
          days_before: getNumberConfig(r.trigger_config, "days_before", 0),
          action_type:
            r.action_type === "create_task" || r.action_type === "set_project_status"
              ? r.action_type
              : "notify_user",
          template: getStringConfig(r.action_config, "template", "dday_alert"),
          task_title: getStringConfig(r.action_config, "title", "마감 알림 확인"),
          next_status: getStringConfig(r.action_config, "status", "on_hold"),
          cooldown_minutes: r.cooldown_minutes,
        },
      ])
    )
  );

  function applyQuickTemplate(template: QuickRuleTemplate) {
    setNewRule((s) => ({
      ...s,
      name: template.name,
      daysBefore: template.daysBefore,
      actionType: template.actionType,
      template: template.template ?? s.template,
      taskTitle: template.taskTitle ?? s.taskTitle,
      nextStatus: template.nextStatus ?? s.nextStatus,
      cooldownMinutes: template.cooldownMinutes,
      enabled: true,
    }));
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">원클릭 추천 룰</CardTitle>
          <CardDescription>노션보다 빠르게 바로 적용할 수 있는 자동화 프리셋입니다.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-3">
          {QUICK_RULE_TEMPLATES.map((template) => (
            <button
              key={template.title}
              type="button"
              className="rounded-lg border p-3 text-left transition-colors hover:bg-muted"
              onClick={() => applyQuickTemplate(template)}
            >
              <p className="text-sm font-medium">{template.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{template.description}</p>
            </button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">새 룰 생성</CardTitle>
          <CardDescription>RLS 정책이 적용되며 워크스페이스 관리자만 저장됩니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid gap-2 sm:grid-cols-2">
            <Input
              placeholder="룰 이름"
              value={newRule.name}
              onChange={(e) => setNewRule((s) => ({ ...s, name: e.target.value }))}
            />
            <Input
              type="number"
              min={0}
              value={newRule.cooldownMinutes}
              onChange={(e) => setNewRule((s) => ({ ...s, cooldownMinutes: Number(e.target.value) }))}
              placeholder="재실행 대기 시간(분)"
            />
            <Input value="일정 D-day 도달 시" disabled />
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={newRule.actionType}
              onChange={(e) => setNewRule((s) => ({ ...s, actionType: e.target.value as ActionType }))}
            >
              <option value="notify_user">알림 보내기</option>
              <option value="create_task">할 일 생성</option>
              <option value="set_project_status">프로젝트 상태 변경</option>
            </select>
          </div>
          <Input
            type="number"
            min={0}
            value={newRule.daysBefore}
            onChange={(e) => setNewRule((s) => ({ ...s, daysBefore: Number(e.target.value) }))}
            placeholder="며칠 전에 실행할지 (예: 0, 1, 3)"
          />
          <div className="flex flex-wrap gap-2">
            {DAY_PRESETS.map((day) => (
              <Button
                key={day}
                type="button"
                size="sm"
                variant={newRule.daysBefore === day ? "default" : "outline"}
                onClick={() => setNewRule((s) => ({ ...s, daysBefore: day }))}
              >
                D-{day}
              </Button>
            ))}
          </div>
          {newRule.actionType === "notify_user" ? (
            <Input
              value={newRule.template}
              onChange={(e) => setNewRule((s) => ({ ...s, template: e.target.value }))}
              placeholder="알림 템플릿 (예: dday_alert)"
            />
          ) : null}
          {newRule.actionType === "create_task" ? (
            <Input
              value={newRule.taskTitle}
              onChange={(e) => setNewRule((s) => ({ ...s, taskTitle: e.target.value }))}
              placeholder="생성할 작업 제목"
            />
          ) : null}
          {newRule.actionType === "set_project_status" ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                value={newRule.nextStatus}
                onChange={(e) => setNewRule((s) => ({ ...s, nextStatus: e.target.value }))}
                placeholder="변경할 프로젝트 상태 (예: on_hold)"
              />
              <div className="flex flex-wrap gap-2">
                {STATUS_PRESETS.map((status) => (
                  <Button
                    key={status}
                    type="button"
                    size="sm"
                    variant={newRule.nextStatus === status ? "default" : "outline"}
                    onClick={() => setNewRule((s) => ({ ...s, nextStatus: status }))}
                  >
                    {status}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">재실행 대기 프리셋</p>
            <div className="flex flex-wrap gap-2">
              {COOLDOWN_PRESETS.map((preset) => (
                <Button
                  key={preset.value}
                  type="button"
                  size="sm"
                  variant={newRule.cooldownMinutes === preset.value ? "default" : "outline"}
                  onClick={() => setNewRule((s) => ({ ...s, cooldownMinutes: preset.value }))}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={newRule.enabled}
              onChange={(e) => setNewRule((s) => ({ ...s, enabled: e.target.checked }))}
            />
            활성화
          </label>
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
          <Button
            size="sm"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                const triggerConfigText = JSON.stringify({ days_before: newRule.daysBefore });
                const actionConfigText = JSON.stringify(
                  buildActionConfig({
                    action_type: newRule.actionType,
                    template: newRule.template,
                    task_title: newRule.taskTitle,
                    next_status: newRule.nextStatus,
                  })
                );
                const res = await createAutomationRule({
                  workspaceId,
                  name: newRule.name,
                  enabled: newRule.enabled,
                  triggerType: newRule.triggerType,
                  triggerConfigText,
                  actionType: newRule.actionType,
                  actionConfigText,
                  cooldownMinutes: newRule.cooldownMinutes,
                });
                if (res?.error) {
                  setError(res.error);
                  return;
                }
                setNewRule((s) => ({ ...s, name: "" }));
                router.refresh();
              })
            }
          >
            생성
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">기존 룰 수정</CardTitle>
        </CardHeader>
        <CardContent>
          {!initialRules.length ? (
            <p className="text-sm text-muted-foreground">등록된 룰이 없습니다.</p>
          ) : (
            <ul className="space-y-3">
              {initialRules.map((r) => {
                const form = editing[r.id];
                return (
                  <li key={r.id} className="rounded-lg border px-3 py-2">
                    <div className="mb-2 flex items-center gap-2">
                      <Badge variant={form.enabled ? "secondary" : "outline"}>
                        {form.enabled ? "활성" : "비활성"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        수정 시각 {new Date(r.updated_at).toLocaleString("ko")}
                      </span>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Input
                        value={form.name}
                        onChange={(e) =>
                          setEditing((s) => ({ ...s, [r.id]: { ...s[r.id], name: e.target.value } }))
                        }
                      />
                      <Input
                        type="number"
                        min={0}
                        value={form.cooldown_minutes}
                        onChange={(e) =>
                          setEditing((s) => ({
                            ...s,
                            [r.id]: { ...s[r.id], cooldown_minutes: Number(e.target.value) },
                          }))
                        }
                      />
                      <Input
                        value={form.trigger_type}
                        disabled
                      />
                      <select
                        className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                        value={form.action_type}
                        onChange={(e) =>
                          setEditing((s) => ({
                            ...s,
                            [r.id]: { ...s[r.id], action_type: e.target.value as ActionType },
                          }))
                        }
                      >
                        <option value="notify_user">알림 보내기</option>
                        <option value="create_task">할 일 생성</option>
                        <option value="set_project_status">프로젝트 상태 변경</option>
                      </select>
                    </div>
                    <div className="mt-2 space-y-2">
                      <Input
                        type="number"
                        min={0}
                        value={form.days_before}
                        onChange={(e) =>
                          setEditing((s) => ({
                            ...s,
                            [r.id]: { ...s[r.id], days_before: Number(e.target.value) },
                          }))
                        }
                        placeholder="며칠 전에 실행할지"
                      />
                      <div className="flex flex-wrap gap-2">
                        {DAY_PRESETS.map((day) => (
                          <Button
                            key={`${r.id}-day-${day}`}
                            type="button"
                            size="sm"
                            variant={form.days_before === day ? "default" : "outline"}
                            onClick={() =>
                              setEditing((s) => ({
                                ...s,
                                [r.id]: { ...s[r.id], days_before: day },
                              }))
                            }
                          >
                            D-{day}
                          </Button>
                        ))}
                      </div>
                      {form.action_type === "notify_user" ? (
                        <Input
                          value={form.template}
                          onChange={(e) =>
                            setEditing((s) => ({
                              ...s,
                              [r.id]: { ...s[r.id], template: e.target.value },
                            }))
                          }
                          placeholder="알림 템플릿"
                        />
                      ) : null}
                      {form.action_type === "create_task" ? (
                        <Input
                          value={form.task_title}
                          onChange={(e) =>
                            setEditing((s) => ({
                              ...s,
                              [r.id]: { ...s[r.id], task_title: e.target.value },
                            }))
                          }
                          placeholder="생성할 작업 제목"
                        />
                      ) : null}
                      {form.action_type === "set_project_status" ? (
                        <div className="grid gap-2 sm:grid-cols-2">
                          <Input
                            value={form.next_status}
                            onChange={(e) =>
                              setEditing((s) => ({
                                ...s,
                                [r.id]: { ...s[r.id], next_status: e.target.value },
                              }))
                            }
                            placeholder="변경할 프로젝트 상태"
                          />
                          <div className="flex flex-wrap gap-2">
                            {STATUS_PRESETS.map((status) => (
                              <Button
                                key={`${r.id}-status-${status}`}
                                type="button"
                                size="sm"
                                variant={form.next_status === status ? "default" : "outline"}
                                onClick={() =>
                                  setEditing((s) => ({
                                    ...s,
                                    [r.id]: { ...s[r.id], next_status: status },
                                  }))
                                }
                              >
                                {status}
                              </Button>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">재실행 대기 프리셋</p>
                        <div className="flex flex-wrap gap-2">
                          {COOLDOWN_PRESETS.map((preset) => (
                            <Button
                              key={`${r.id}-cooldown-${preset.value}`}
                              type="button"
                              size="sm"
                              variant={form.cooldown_minutes === preset.value ? "default" : "outline"}
                              onClick={() =>
                                setEditing((s) => ({
                                  ...s,
                                  [r.id]: { ...s[r.id], cooldown_minutes: preset.value },
                                }))
                              }
                            >
                              {preset.label}
                            </Button>
                          ))}
                        </div>
                      </div>
                      <label className="inline-flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={form.enabled}
                          onChange={(e) =>
                            setEditing((s) => ({ ...s, [r.id]: { ...s[r.id], enabled: e.target.checked } }))
                          }
                        />
                        활성화
                      </label>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <Button
                        size="sm"
                        disabled={pending}
                        onClick={() =>
                          startTransition(async () => {
                            const triggerConfigText = JSON.stringify({ days_before: form.days_before });
                            const actionConfigText = JSON.stringify(buildActionConfig(form));
                            const res = await updateAutomationRule({
                              id: r.id,
                              name: form.name,
                              enabled: form.enabled,
                              triggerType: form.trigger_type,
                              triggerConfigText,
                              actionType: form.action_type,
                              actionConfigText,
                              cooldownMinutes: form.cooldown_minutes,
                            });
                            if (res?.error) {
                              setError(res.error);
                              return;
                            }
                            router.refresh();
                          })
                        }
                      >
                        저장
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() =>
                          startTransition(async () => {
                            const res = await deleteAutomationRule(r.id);
                            if (res?.error) {
                              setError(res.error);
                              return;
                            }
                            router.refresh();
                          })
                        }
                      >
                        삭제
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
