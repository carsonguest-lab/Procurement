const ORDER_BUFFER_DAYS = 7;

/** Parses a comma-separated filter-bar query param (e.g. "?division=1,6,7") into a list. */
export function parseListParam(value: string | undefined): string[] {
  return value ? value.split(",").filter(Boolean) : [];
}

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
  orderByDate: Date | null;
  requiredOnSiteDate: Date | null;
};

export function isOverdueToOrder(item: MaterialForFlags, today = startOfToday()): boolean {
  return item.status === "NOT_ORDERED" && item.orderByDate !== null && item.orderByDate < today;
}

export function isAtRisk(item: MaterialForFlags, today = startOfToday()): boolean {
  return (
    item.status !== "DELIVERED" &&
    item.requiredOnSiteDate !== null &&
    item.requiredOnSiteDate < today
  );
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

export const ROLE_LABELS: Record<"ADMIN" | "MEMBER" | "VIEWER", string> = {
  ADMIN: "Admin",
  MEMBER: "Member",
  VIEWER: "Viewer",
};

export type ProjectRole = "MEMBER" | "VIEWER";

export const PROJECT_ROLE_LABELS: Record<ProjectRole, string> = {
  MEMBER: "Member",
  VIEWER: "Viewer",
};

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export const CSI_DIVISIONS: { code: string; name: string }[] = [
  { code: "00", name: "Procurement and Contracting Requirements" },
  { code: "01", name: "General Requirements" },
  { code: "02", name: "Existing Conditions" },
  { code: "03", name: "Concrete" },
  { code: "04", name: "Masonry" },
  { code: "05", name: "Metals" },
  { code: "06", name: "Wood, Plastics, and Composites" },
  { code: "07", name: "Thermal and Moisture Protection" },
  { code: "08", name: "Openings" },
  { code: "09", name: "Finishes" },
  { code: "10", name: "Specialties" },
  { code: "11", name: "Equipment" },
  { code: "12", name: "Furnishings" },
  { code: "13", name: "Special Construction" },
  { code: "14", name: "Conveying Equipment" },
  { code: "21", name: "Fire Suppression" },
  { code: "22", name: "Plumbing" },
  { code: "23", name: "Heating, Ventilating, and Air Conditioning (HVAC)" },
  { code: "25", name: "Integrated Automation" },
  { code: "26", name: "Electrical" },
  { code: "27", name: "Communications" },
  { code: "28", name: "Electronic Safety and Security" },
  { code: "31", name: "Earthwork" },
  { code: "32", name: "Exterior Improvements" },
  { code: "33", name: "Utilities" },
  { code: "34", name: "Transportation" },
  { code: "35", name: "Waterway and Marine Construction" },
  { code: "40", name: "Process Interconnections" },
  { code: "41", name: "Material Processing and Handling Equipment" },
  { code: "42", name: "Process Heating, Cooling, and Drying Equipment" },
  { code: "43", name: "Process Gas and Liquid Handling, Purification, and Storage Equipment" },
  { code: "44", name: "Pollution and Waste Control Equipment" },
  { code: "45", name: "Industry-Specific Manufacturing Equipment" },
  { code: "46", name: "Water and Wastewater Equipment" },
  { code: "48", name: "Electrical Power Generation" },
];

export function getCsiDivisionLabel(code: string | null | undefined): string | null {
  if (!code) return null;
  const found = CSI_DIVISIONS.find((d) => d.code === code);
  return found ? `${found.code} – ${found.name}` : code;
}
