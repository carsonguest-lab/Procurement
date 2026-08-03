"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ChevronRight, GripVertical, MoreHorizontal } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { MaterialStatusBadge, SubmittalStatusBadge, UrgencyBadge } from "@/components/status-badge";
import {
  formatDate,
  getCsiDivisionLabel,
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
import { MaterialFormDialog, type DivisionCategoryEntry } from "@/app/(app)/materials/material-form-dialog";

export type MaterialRow = {
  id: string;
  material: string;
  leadTimeDays: number;
  requiredOnSiteDate: Date;
  orderByDate: Date;
  status: "NOT_ORDERED" | "ORDERED" | "DELIVERED";
  submittalStatus: SubmittalStatus;
  notes: string | null;
  csiDivisionCode: string | null;
  category: string | null;
  subcategory: string | null;
  project: { id: string; name: string };
  vendor: { id: string; name: string };
};

type Option = { id: string; name: string };

type ColumnId =
  | "material"
  | "csiDivision"
  | "project"
  | "vendor"
  | "leadTime"
  | "requiredOnSite"
  | "orderDate"
  | "submittal"
  | "status";

const DEFAULT_COLUMN_ORDER: ColumnId[] = [
  "material",
  "csiDivision",
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
  csiDivision: "Division",
  project: "Project",
  vendor: "Responsible Sub",
  leadTime: "Lead Time",
  requiredOnSite: "Required at Site",
  orderDate: "Order Date",
  submittal: "Submittal",
  status: "Status",
};

// Badge-bearing columns read best centered under their header; text columns stay left-aligned.
const CENTERED_COLUMNS = new Set<ColumnId>([
  "csiDivision",
  "requiredOnSite",
  "orderDate",
  "submittal",
  "status",
]);

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

// Same external-store pattern as column order: one shared "group by division" preference
// across every MaterialsTable instance, persisted so it survives navigation/reload.
const GROUP_BY_DIVISION_STORAGE_KEY = "proprocure:materials-table-group-by-division";
let groupByDivisionCache: boolean | null = null;
const groupByDivisionListeners = new Set<() => void>();

function getGroupByDivisionSnapshot(): boolean {
  if (groupByDivisionCache === null) {
    groupByDivisionCache = window.localStorage.getItem(GROUP_BY_DIVISION_STORAGE_KEY) === "true";
  }
  return groupByDivisionCache;
}

function getServerGroupByDivisionSnapshot(): boolean {
  return false;
}

function subscribeGroupByDivision(listener: () => void) {
  groupByDivisionListeners.add(listener);
  return () => groupByDivisionListeners.delete(listener);
}

function setGroupByDivision(next: boolean) {
  groupByDivisionCache = next;
  window.localStorage.setItem(GROUP_BY_DIVISION_STORAGE_KEY, String(next));
  groupByDivisionListeners.forEach((listener) => listener());
}

// --- Division -> Category -> Subcategory grouping (a sparse WBS-style tree: items with no
// category/subcategory sit directly on their parent node rather than under a redundant
// single-child "Uncategorized" header at that level). ---

type GroupNode = {
  key: string;
  depth: 0 | 1 | 2;
  label: string;
  items: MaterialRow[];
  children: GroupNode[];
  count: number;
};

type RenderRow =
  | { kind: "group"; key: string; depth: 0 | 1 | 2; label: string; count: number; collapsed: boolean }
  | { kind: "item"; item: MaterialRow };

function buildSubcategoryChildren(
  items: MaterialRow[],
  parentKey: string,
  ancestorChain: string[],
  ancestorsByItemId: Map<string, string[]>
): { ownItems: MaterialRow[]; children: GroupNode[] } {
  const ownItems: MaterialRow[] = [];
  const bySubcategory = new Map<string, MaterialRow[]>();
  for (const item of items) {
    const subcategory = item.subcategory?.trim();
    if (!subcategory) {
      ownItems.push(item);
      ancestorsByItemId.set(item.id, ancestorChain);
      continue;
    }
    const bucket = bySubcategory.get(subcategory);
    if (bucket) bucket.push(item);
    else bySubcategory.set(subcategory, [item]);
  }

  const subcategories = [...bySubcategory.keys()].sort((a, b) => a.localeCompare(b));
  const children = subcategories.map((subcategory) => {
    const subItems = bySubcategory.get(subcategory)!;
    const key = `${parentKey}/sub:${subcategory}`;
    const chain = [...ancestorChain, key];
    for (const item of subItems) ancestorsByItemId.set(item.id, chain);
    return {
      key,
      depth: 2 as const,
      label: subcategory,
      items: subItems,
      children: [],
      count: subItems.length,
    };
  });

  return { ownItems, children };
}

function buildCategoryChildren(
  items: MaterialRow[],
  parentKey: string,
  ancestorChain: string[],
  ancestorsByItemId: Map<string, string[]>
): { ownItems: MaterialRow[]; children: GroupNode[] } {
  const ownItems: MaterialRow[] = [];
  const byCategory = new Map<string, MaterialRow[]>();
  for (const item of items) {
    const category = item.category?.trim();
    if (!category) {
      ownItems.push(item);
      ancestorsByItemId.set(item.id, ancestorChain);
      continue;
    }
    const bucket = byCategory.get(category);
    if (bucket) bucket.push(item);
    else byCategory.set(category, [item]);
  }

  const categories = [...byCategory.keys()].sort((a, b) => a.localeCompare(b));
  const children = categories.map((category) => {
    const categoryItems = byCategory.get(category)!;
    const key = `${parentKey}/cat:${category}`;
    const chain = [...ancestorChain, key];
    const { ownItems: subOwnItems, children: subChildren } = buildSubcategoryChildren(
      categoryItems,
      key,
      chain,
      ancestorsByItemId
    );
    const count = subOwnItems.length + subChildren.reduce((sum, c) => sum + c.count, 0);
    return {
      key,
      depth: 1 as const,
      label: category,
      items: subOwnItems,
      children: subChildren,
      count,
    };
  });

  return { ownItems, children };
}

function buildDivisionTree(items: MaterialRow[]): {
  roots: GroupNode[];
  ancestorsByItemId: Map<string, string[]>;
} {
  const ancestorsByItemId = new Map<string, string[]>();

  const byDivision = new Map<string | null, MaterialRow[]>();
  for (const item of items) {
    const code = item.csiDivisionCode;
    const bucket = byDivision.get(code);
    if (bucket) bucket.push(item);
    else byDivision.set(code, [item]);
  }

  const codes = [...byDivision.keys()].filter((c): c is string => c !== null);
  codes.sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
  const divisionKeys: (string | null)[] = byDivision.has(null) ? [...codes, null] : codes;

  const roots = divisionKeys.map((code) => {
    const divisionItems = byDivision.get(code)!;
    const key = `div:${code ?? "none"}`;
    const label = code ? getCsiDivisionLabel(code)! : "Uncategorized";
    const { ownItems, children } = buildCategoryChildren(divisionItems, key, [key], ancestorsByItemId);
    const count = ownItems.length + children.reduce((sum, c) => sum + c.count, 0);
    return { key, depth: 0 as const, label, items: ownItems, children, count };
  });

  return { roots, ancestorsByItemId };
}

function flattenTree(nodes: GroupNode[], collapsed: Set<string>): RenderRow[] {
  const out: RenderRow[] = [];
  for (const node of nodes) {
    const isCollapsed = collapsed.has(node.key);
    out.push({
      kind: "group",
      key: node.key,
      depth: node.depth,
      label: node.label,
      count: node.count,
      collapsed: isCollapsed,
    });
    if (isCollapsed) continue;
    for (const child of node.children) out.push(...flattenTree([child], collapsed));
    for (const item of node.items) out.push({ kind: "item", item });
  }
  return out;
}

function allGroupKeys(nodes: GroupNode[]): Set<string> {
  const keys = new Set<string>();
  for (const node of nodes) {
    keys.add(node.key);
    for (const key of allGroupKeys(node.children)) keys.add(key);
  }
  return keys;
}

const DEPTH_PADDING = ["pl-0", "pl-4", "pl-8"] as const;

export function MaterialsTable({
  items,
  projects,
  vendors,
  showProjectColumn = true,
  showVendorColumn = true,
  canWrite,
  emptyMessage = "No material items yet.",
  highlightId,
  divisionCategoryMap = [],
}: {
  items: MaterialRow[];
  projects: Option[];
  vendors: Option[];
  showProjectColumn?: boolean;
  showVendorColumn?: boolean;
  /** true/false for uniform access, or a Set of writable project IDs when access varies by project. */
  canWrite: boolean | Set<string>;
  emptyMessage?: string;
  highlightId?: string;
  divisionCategoryMap?: DivisionCategoryEntry[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const columnOrder = useSyncExternalStore(
    subscribeColumnOrder,
    getColumnOrderSnapshot,
    getServerColumnOrderSnapshot
  );
  const groupByDivision = useSyncExternalStore(
    subscribeGroupByDivision,
    getGroupByDivisionSnapshot,
    getServerGroupByDivisionSnapshot
  );
  const [draggedColumn, setDraggedColumn] = useState<ColumnId | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<ColumnId | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => new Set());
  const highlightRef = useRef<HTMLTableRowElement>(null);

  const { roots, ancestorsByItemId } = useMemo(() => buildDivisionTree(items), [items]);

  // If a newly-highlighted row (from search/navigation) lands inside a collapsed group,
  // expand its ancestor groups so the row actually mounts and the scroll effect below can
  // find it. Adjusted during render (React's documented pattern for "reset/adjust state when
  // a prop changes") rather than in an effect, since only the first render for a given
  // highlightId should force the expansion — afterwards the user can freely re-collapse it.
  const [prevHighlightId, setPrevHighlightId] = useState(highlightId);
  if (highlightId !== prevHighlightId) {
    setPrevHighlightId(highlightId);
    if (highlightId && groupByDivision) {
      const ancestors = ancestorsByItemId.get(highlightId);
      if (ancestors?.length) {
        const stillCollapsed = ancestors.filter((k) => collapsedGroups.has(k));
        if (stillCollapsed.length > 0) {
          const next = new Set(collapsedGroups);
          stillCollapsed.forEach((k) => next.delete(k));
          setCollapsedGroups(next);
        }
      }
    }
  }

  const renderRows = useMemo<RenderRow[]>(() => {
    if (!groupByDivision) return items.map((item) => ({ kind: "item", item }) as const);
    return flattenTree(roots, collapsedGroups);
  }, [groupByDivision, roots, collapsedGroups, items]);

  useEffect(() => {
    highlightRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightId, collapsedGroups]);

  function toggleGroup(key: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

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

  function canWriteItem(item: MaterialRow) {
    return typeof canWrite === "boolean" ? canWrite : canWrite.has(item.project.id);
  }

  function renderCell(id: ColumnId, item: MaterialRow) {
    switch (id) {
      case "material":
        return <span className="font-medium">{item.material}</span>;
      case "csiDivision":
        return item.csiDivisionCode ? (
          <Badge variant="outline" className="font-normal">
            {getCsiDivisionLabel(item.csiDivisionCode)}
          </Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
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
        return canWriteItem(item) ? (
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
        return canWriteItem(item) ? (
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
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Switch id="group-by-division" checked={groupByDivision} onCheckedChange={setGroupByDivision} />
          <Label
            htmlFor="group-by-division"
            className="cursor-pointer text-sm font-normal text-muted-foreground"
          >
            Group by Division
          </Label>
        </div>
        {groupByDivision && (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => setCollapsedGroups(new Set())}>
              Expand All
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setCollapsedGroups(allGroupKeys(roots))}>
              Collapse All
            </Button>
          </div>
        )}
      </div>
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
          {renderRows.map((row) => {
            if (row.kind === "group") {
              return (
                <TableRow
                  key={row.key}
                  role="button"
                  tabIndex={0}
                  aria-expanded={!row.collapsed}
                  onClick={() => toggleGroup(row.key)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleGroup(row.key);
                    }
                  }}
                  className={cn(
                    "cursor-pointer select-none hover:bg-muted/50",
                    row.depth === 0 && "bg-muted/70 font-semibold",
                    row.depth === 1 && "bg-muted/40 font-medium",
                    row.depth === 2 && "bg-muted/20"
                  )}
                >
                  <TableCell colSpan={visibleColumns.length + 1} className="py-2">
                    <span className={cn("inline-flex items-center gap-2", DEPTH_PADDING[row.depth])}>
                      <ChevronRight
                        className={cn(
                          "h-4 w-4 shrink-0 transition-transform",
                          !row.collapsed && "rotate-90"
                        )}
                      />
                      <span>{row.label}</span>
                      <Badge variant="outline" className="font-normal text-muted-foreground">
                        {row.count}
                      </Badge>
                    </span>
                  </TableCell>
                </TableRow>
              );
            }

            const item = row.item;
            return (
              <TableRow
                key={item.id}
                ref={item.id === highlightId ? highlightRef : undefined}
                className={cn(item.id === highlightId && "bg-accent/60")}
              >
                {visibleColumns.map((id) => (
                  <TableCell key={id} className={cn(CENTERED_COLUMNS.has(id) && "text-center")}>
                    {renderCell(id, item)}
                  </TableCell>
                ))}
                <TableCell>
                  {canWriteItem(item) && (
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
                  {canWriteItem(item) && (
                    <MaterialFormDialog
                      projects={projects}
                      vendors={vendors}
                      divisionCategoryMap={divisionCategoryMap}
                      item={item}
                      open={editingId === item.id}
                      onOpenChange={(o) => setEditingId(o ? item.id : null)}
                    />
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
