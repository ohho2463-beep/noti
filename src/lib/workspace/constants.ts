export const WORKSPACE_PLAN_CATALOG = {
  free: {
    name: "Starter",
    price: "₩0",
    tag: "개인용",
    users: 3,
    storage_gb: 1,
    history_days: 14,
  },
  pro: {
    name: "Pro",
    price: "₩9,900/mo",
    tag: "개인 + 팀",
    users: 15,
    storage_gb: 25,
    history_days: 180,
  },
  team: {
    name: "Team",
    price: "₩29,000/mo",
    tag: "소규모 협업",
    users: 50,
    storage_gb: 150,
    history_days: 365,
  },
} as const;

export type WorkspacePlanCode = keyof typeof WORKSPACE_PLAN_CATALOG;

export const KANBAN_COLUMNS = [
  { id: "todo" as const, label: "To Do" },
  { id: "doing" as const, label: "In Progress" },
  { id: "review" as const, label: "Review" },
  { id: "done" as const, label: "Done" },
];
