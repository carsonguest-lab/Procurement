const ORDER_BUFFER_DAYS = 7;

export function computeOrderByDate(requiredOnSiteDate: Date, leadTimeDays: number): Date {
  const d = new Date(requiredOnSiteDate);
  d.setDate(d.getDate() - leadTimeDays - ORDER_BUFFER_DAYS);
  return d;
}

export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

type MaterialForFlags = {
  status: "NOT_ORDERED" | "ORDERED" | "DELIVERED";
  orderByDate: Date;
  requiredOnSiteDate: Date;
};

export function isOverdueToOrder(item: MaterialForFlags, today = startOfToday()): boolean {
  return item.status === "NOT_ORDERED" && item.orderByDate < today;
}

export function isAtRisk(item: MaterialForFlags, today = startOfToday()): boolean {
  return item.status !== "DELIVERED" && item.requiredOnSiteDate < today;
}

export const STATUS_LABELS: Record<MaterialForFlags["status"], string> = {
  NOT_ORDERED: "Not Ordered",
  ORDERED: "Ordered",
  DELIVERED: "Delivered",
};

export const PROJECT_STATUS_LABELS: Record<"ACTIVE" | "ON_HOLD" | "COMPLETE", string> = {
  ACTIVE: "Active",
  ON_HOLD: "On Hold",
  COMPLETE: "Complete",
};

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
