import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  EXTRACTED_TAG_STATUS_LABELS,
  PROJECT_STATUS_LABELS,
  SCHEDULE_IMPORT_STATUS_LABELS,
  STATUS_LABELS,
  SUBMITTAL_STATUS_LABELS,
} from "@/lib/procurement";

const PROJECT_STYLES: Record<string, string> = {
  ACTIVE: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-900",
  ON_HOLD: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900",
  COMPLETE: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900",
};

const MATERIAL_STYLES: Record<string, string> = {
  NOT_ORDERED: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  ORDERED: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-900",
  DELIVERED: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900",
};

const SUBMITTAL_STYLES: Record<string, string> = {
  NOT_SUBMITTED: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  SUBMITTED: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-900",
  APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900",
  APPROVED_AS_NOTED: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950 dark:text-teal-300 dark:border-teal-900",
  REVISE_AND_RESUBMIT: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900",
  REJECTED: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-900",
};

export function ProjectStatusBadge({ status }: { status: keyof typeof PROJECT_STATUS_LABELS }) {
  return (
    <Badge variant="outline" className={cn("font-normal", PROJECT_STYLES[status])}>
      {PROJECT_STATUS_LABELS[status]}
    </Badge>
  );
}

export function MaterialStatusBadge({ status }: { status: keyof typeof STATUS_LABELS }) {
  return (
    <Badge variant="outline" className={cn("font-normal", MATERIAL_STYLES[status])}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}

export function SubmittalStatusBadge({ status }: { status: keyof typeof SUBMITTAL_STATUS_LABELS }) {
  return (
    <Badge variant="outline" className={cn("font-normal", SUBMITTAL_STYLES[status])}>
      {SUBMITTAL_STATUS_LABELS[status]}
    </Badge>
  );
}

const SCHEDULE_IMPORT_STYLES: Record<string, string> = {
  PROCESSING: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-900",
  READY_FOR_REVIEW: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900",
  FAILED: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-900",
};

const EXTRACTED_TAG_STYLES: Record<string, string> = {
  PENDING: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900",
  REJECTED: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-900",
};

export function ScheduleImportStatusBadge({
  status,
}: {
  status: keyof typeof SCHEDULE_IMPORT_STATUS_LABELS;
}) {
  return (
    <Badge variant="outline" className={cn("font-normal", SCHEDULE_IMPORT_STYLES[status])}>
      {SCHEDULE_IMPORT_STATUS_LABELS[status]}
    </Badge>
  );
}

export function ExtractedTagStatusBadge({
  status,
}: {
  status: keyof typeof EXTRACTED_TAG_STATUS_LABELS;
}) {
  return (
    <Badge variant="outline" className={cn("font-normal", EXTRACTED_TAG_STYLES[status])}>
      {EXTRACTED_TAG_STATUS_LABELS[status]}
    </Badge>
  );
}

export function UrgencyBadge({
  label,
}: {
  label: "Overdue to Order" | "At Risk" | "Blocked on Submittal";
}) {
  return (
    <Badge
      variant="outline"
      className="font-normal bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-900"
    >
      {label}
    </Badge>
  );
}
