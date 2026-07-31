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

export type SubmittalStatus =
  | "NOT_SUBMITTED"
  | "SUBMITTED"
  | "APPROVED"
  | "APPROVED_AS_NOTED"
  | "REVISE_AND_RESUBMIT"
  | "REJECTED";

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

// Statuses that clear a material to be ordered.
const SUBMITTAL_APPROVED_STATUSES: readonly SubmittalStatus[] = ["APPROVED", "APPROVED_AS_NOTED"];

export function isSubmittalApproved(submittalStatus: SubmittalStatus): boolean {
  return SUBMITTAL_APPROVED_STATUSES.includes(submittalStatus);
}

export function isBlockedOnSubmittal(
  item: MaterialForFlags & { submittalStatus: SubmittalStatus }
): boolean {
  return item.status === "NOT_ORDERED" && !isSubmittalApproved(item.submittalStatus);
}

export const STATUS_LABELS: Record<MaterialForFlags["status"], string> = {
  NOT_ORDERED: "Not Ordered",
  ORDERED: "Ordered",
  DELIVERED: "Delivered",
};

export const SUBMITTAL_STATUS_LABELS: Record<SubmittalStatus, string> = {
  NOT_SUBMITTED: "Not Submitted",
  SUBMITTED: "Submitted",
  APPROVED: "Approved",
  APPROVED_AS_NOTED: "Approved as Noted",
  REVISE_AND_RESUBMIT: "Revise & Resubmit",
  REJECTED: "Rejected",
};

export const PROJECT_STATUS_LABELS: Record<"ACTIVE" | "ON_HOLD" | "COMPLETE", string> = {
  ACTIVE: "Active",
  ON_HOLD: "On Hold",
  COMPLETE: "Complete",
};

export type ScheduleImportStatus = "PROCESSING" | "READY_FOR_REVIEW" | "FAILED";

export const SCHEDULE_IMPORT_STATUS_LABELS: Record<ScheduleImportStatus, string> = {
  PROCESSING: "Processing",
  READY_FOR_REVIEW: "Ready for Review",
  FAILED: "Failed",
};

export type ExtractedTagStatus = "PENDING" | "APPROVED" | "REJECTED";

export const EXTRACTED_TAG_STATUS_LABELS: Record<ExtractedTagStatus, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
