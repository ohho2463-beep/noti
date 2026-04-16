"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

function parseJson(input: string, fallback: Record<string, unknown>) {
  const raw = input.trim();
  if (!raw) {
    return fallback;
  }
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("JSON 객체 형식이어야 합니다.");
  }
  return parsed as Record<string, unknown>;
}

export async function createAutomationRule(input: {
  workspaceId: string;
  name: string;
  enabled: boolean;
  triggerType: string;
  triggerConfigText: string;
  actionType: string;
  actionConfigText: string;
  cooldownMinutes: number;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "로그인이 필요합니다." };
  }
  if (!input.name.trim()) {
    return { error: "룰 이름을 입력하세요." };
  }
  if (input.cooldownMinutes < 0) {
    return { error: "쿨다운은 0 이상이어야 합니다." };
  }

  let triggerConfig: Record<string, unknown>;
  let actionConfig: Record<string, unknown>;
  try {
    triggerConfig = parseJson(input.triggerConfigText, {});
    actionConfig = parseJson(input.actionConfigText, {});
  } catch (error) {
    return { error: error instanceof Error ? error.message : "JSON 파싱에 실패했습니다." };
  }

  const { error } = await supabase.from("workspace_automation_rules").insert({
    workspace_id: input.workspaceId,
    name: input.name.trim(),
    enabled: input.enabled,
    trigger_type: input.triggerType,
    trigger_config: triggerConfig,
    action_type: input.actionType,
    action_config: actionConfig,
    cooldown_minutes: input.cooldownMinutes,
    created_by: user.id,
  });
  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/automation");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateAutomationRule(input: {
  id: string;
  name: string;
  enabled: boolean;
  triggerType: string;
  triggerConfigText: string;
  actionType: string;
  actionConfigText: string;
  cooldownMinutes: number;
}) {
  const supabase = await createClient();
  if (!input.name.trim()) {
    return { error: "룰 이름을 입력하세요." };
  }
  if (input.cooldownMinutes < 0) {
    return { error: "쿨다운은 0 이상이어야 합니다." };
  }

  let triggerConfig: Record<string, unknown>;
  let actionConfig: Record<string, unknown>;
  try {
    triggerConfig = parseJson(input.triggerConfigText, {});
    actionConfig = parseJson(input.actionConfigText, {});
  } catch (error) {
    return { error: error instanceof Error ? error.message : "JSON 파싱에 실패했습니다." };
  }

  const { error } = await supabase
    .from("workspace_automation_rules")
    .update({
      name: input.name.trim(),
      enabled: input.enabled,
      trigger_type: input.triggerType,
      trigger_config: triggerConfig,
      action_type: input.actionType,
      action_config: actionConfig,
      cooldown_minutes: input.cooldownMinutes,
    })
    .eq("id", input.id);
  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/automation");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteAutomationRule(ruleId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("workspace_automation_rules").delete().eq("id", ruleId);
  if (error) {
    return { error: error.message };
  }
  revalidatePath("/dashboard/automation");
  revalidatePath("/dashboard");
  return { success: true };
}
