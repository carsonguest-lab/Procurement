"use client";

import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { GripVertical, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MaterialStatusBadge, SubmittalStatusBadge, UrgencyBadge } from "@/components/status-badge";
import {
  formatDate,
  isAtRisk,
  isOverdueToOrder,
  isSubmittalApproved,
  STATUS_LABELS,
  SUBMITTAL_STATUS_LABELS,
  type SubmittalStatus,
} from "@/lib/procurement";
import {
  setMaterialStatus,
  setSubmittalStatus,
  deleteMaterialItem,
} from "@/app/(app)/materials/actions";
import { MaterialFormDialog } from "@/app/(app)/materials/material-form-dialog";

export type MaterialRow = {
  id: string;
  material: string;
  leadTimeDays: number;
  requiredOnSiteDate: Date;
  orderByDate: Date;
  status: "NOT_ORDERED" | "ORDERED" | "DELIVERED";
  submittalStatus: SubmittalStatus;
  notes: string | null;
  project: { id: string; name: string };
  vendor: { id: string; name: string };
};

type Option = { id: string; name: string };

type ColumnId =
  | "material"
  | "project"
  | "vendor"
  | "leadTime"
  | "requiredOnSite"
  | "orderDate"
  | "submittal"
  | "status";

const DEFAULT_COLUMN_ORDER: ColumnId[] = [
  "material",
  "project",
  "vendor",
  "leadTime",
  "requiredOnSite",
  "orderDate",
  "submittal",
  "status",
];

const COLUMN_LABELS: Record<ColumnId, string> = {
  material: "Material",
  project: "Project",
  vendor: "Responsible Sub",
  leadTime: "Lead Time",
  requiredOnSite: "Required at Site",
  orderDate: "Order Date",
  submittal: "Submittal",
  status: "Status",
};

// Badge-bearing columns read best centered under their header; text columns stay left-aligned.
const CENTERED_COLUMNS = new Set<ColumnId>(["requiredOnSite", "orderDate", "submittal", "status"]);

const COLUMN_ORDER_STORAGE_KEY = "proprocure:materials-table-column-order";

// Shared across every MaterialsTable instance (project pages, vendor pages, the global
// materials list) so column order is one consistent preference, not per-page state.
// Modeled as a tiny external store (rather than useState+useEffect) so reading
// localStorage never causes a setState-during-effect render.
let columnOrderCache: ColumnId[] | null = null;
const columnOrderListeners = new Set<() => void>();

function parseStoredColumnOrder(raw: string): ColumnId[] | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const valid = parsed.filter((id): id is ColumnId => DEFAULT_COLUMN_ORDER.includes(id));
    // Merge in any columns missing from the stored (older) order so new columns still show up.
    const missing = DEFAULT_COLUMN_ORDER.filter((id) => !valid.includes(id));
    return [...valid, ...missing];
  } catch {
    return null;
  }
}

function getColumnOrderSnapshot(): ColumnId[] {
  if (columnOrderCache === null) {
    const raw = window.localStorage.getItem(COLUMN_ORDER_STORAGE_KEY);
    columnOrderCache = (raw && parseStoredColumnOrder(raw)) || DEFAULT_COLUMN_ORDER;
  }
  return columnOrderCache;
}

function getServerColumnOrderSnapshot(): ColumnId[] {
  return DEFAULT_COLUMN_ORDER;
}

function subscribeColumnOrder(listener: () => void) {
  columnOrderListeners.add(listener);
  return () => columnOrderListeners.delete(listener);
}

function setColumnOrder(next: ColumnId[]) {
  columnOrderCache = next;
  window.localStorage.setItem(COLUMN_ORDER_STORAGE_KEY, JSON.stringify(next));
  columnOrderListeners.forEach((listener) => listener());
}

export function MaterialsTable({
  items,
  projects,
  vendors,
  showProjectColumn = true,
  showVendorColumn = true,
  canWrite,
  emptyMessage = "No material items yet.",
}: {
  items: MaterialRow[];
  projects: Option[];
  vendors: Option[];
  showProjectColumn?: boolean;
  showVendorColumn?: boolean;
  canWrite: boolean;
  emptyMessage?: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const columnOrder = useSyncExternalStore(
    subscribeColumnOrder,
    getColumnOrderSnapshot,
    getServerColumnOrderSnapshot
  );
  const [draggedColumn, setDraggedColumn] = useState<ColumnId | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<ColumnId | null>(null);

  function reorderColumns(dragged: ColumnId, target: ColumnId) {
    if (dragged === target) return;
    const next = columnOrder.filter((id) => id !== dragged);
    next.splice(next.indexOf(target), 0, dragged);
    setColumnOrder(next);
  }

  function handleStatusChange(id: string, status: "NOT_ORDERED" | "ORDERED" | "DELIVERED") {
    startTransition(async () => {
      try {
        await setMaterialStatus(id, status);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Couldn't update status.");
      }
    });
  }

  function handleSubmittalChange(id: string, submittalStatus: SubmittalStatus) {
    startTransition(async () => {
      try {
        await setSubmittalStatus(id, submittalStatus);
        router.refresh();
      } catch {
        toast.error("Couldn't update submittal status.");
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteMaterialItem(id);
        toast.success("Material item deleted");
        router.refresh();
      } catch {
        toast.error("Couldn't delete item.");
      }
    });
  }

  const visibleColumns = columnOrder.filter((id) => {
    if (id === "project") return showProjectColumn;
    if (id === "vendor") return showVendorColumn;
    return true;
  });

  function renderCell(id: ColumnId, item: MaterialRow) {
    switch (id) {
      case "material":
        return <span className="font-medium">{item.material}</span>;
      case "project":
        return (
          <Link href={`/projects/${item.project.id}`} className="text-muted-foreground hover:underline">
            {item.project.name}
          </Link>
        );
      case "vendor":
        return (
          <Link href={`/vendors/${item.vendor.id}`} className="text-muted-foreground hover:underline">
            {item.vendor.name}
          </Link>
        );
      case "leadTime":
        return <>{item.leadTimeDays}d</>;
      case "requiredOnSite":
        return (
          <div className="flex flex-col items-center">
            <span>{formatDate(item.requiredOnSiteDate)}</span>
            {isAtRisk(item) && <UrgencyBadge label="At Risk" />}
          </div>
        );
      case "orderDate":
        return (
          <div className="flex flex-col items-center">
            <span>{formatDate(item.orderByDate)}</span>
            {isOverdueToOrder(item) && <UrgencyBadge label="Overdue to Order" />}
          </div>
        );
      case "submittal":
        return canWrite ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="cursor-pointer">
                <SubmittalStatusBadge status={item.submittalStatus} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center">
              {Object.entries(SUBMITTAL_STATUS_LABELS).map(([value, label]) => (
                <DropdownMenuItem
                  key={value}
                  disabled={item.submittalStatus === value}
                  onClick={() => handleSubmittalChange(item.id, value as SubmittalStatus)}
                >
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <SubmittalStatusBadge status={item.submittalStatus} />
        );
      case "status":
        return canWrite ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="cursor-pointer">
                <MaterialStatusBadge status={item.status} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center">
              {(Object.entries(STATUS_LABELS) as [typeof item.status, string][]).map(
                ([value, label]) => {
                  const blockedBySubmittal =
                    value !== "NOT_ORDERED" && !isSubmittalApproved(item.submittalStatus);
                  return (
                    <DropdownMenuItem
                      key={value}
                      disabled={item.status === value || blockedBySubmittal}
                      onClick={() => handleStatusChange(item.id, value)}
                      title={blockedBySubmittal ? "Submittal must be approved before ordering" : undefined}
                    >
                      {label}
                    </DropdownMenuItem>
                  );
                }
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <MaterialStatusBadge status={item.status} />
        );
    }
  }

  return (
    <div className="rounded-lg border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            {visibleColumns.map((id) => (
              <TableHead
                key={id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/plain", id);
                  e.dataTransfer.effectAllowed = "move";
                  setDraggedColumn(id);
                }}
                onDragEnd={() => {
                  setDraggedColumn(null);
                  setDragOverColumn(null);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (dragOverColumn !== id) setDragOverColumn(id);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const dragged = e.dataTransfer.getData("text/plain") as ColumnId;
                  if (dragged) reorderColumns(dragged, id);
                  setDraggedColumn(null);
                  setDragOverColumn(null);
                }}
                className={cn(
                  "cursor-grab select-none active:cursor-grabbing",
                  CENTERED_COLUMNS.has(id) && "text-center",
                  draggedColumn === id && "opacity-40",
                  dragOverColumn === id && draggedColumn !== id && "bg-accent"
                )}
              >
                <span className="inline-flex items-center gap-1">
                  <GripVertical className="h-3 w-3 text-muted-foreground/50" />
                  {COLUMN_LABELS[id]}
                </span>
              </TableHead>
            ))}
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={visibleColumns.length + 1}
                className="text-center text-muted-foreground py-10"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}
          {items.map((item) => (
            <TableRow key={item.id}>
              {visibleColumns.map((id) => (
                <TableCell key={id} className={cn(CENTERED_COLUMNS.has(id) && "text-center")}>
                  {renderCell(id, item)}
                </TableCell>
              ))}
              <TableCell>
                {canWrite && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditingId(item.id)}>Edit</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => handleDelete(item.id)}
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                {canWrite && (
                  <MaterialFormDialog
                    projects={projects}
                    vendors={vendors}
                    item={item}
                    open={editingId === item.id}
                    onOpenChange={(o) => setEditingId(o ? item.id : null)}
                  />
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
