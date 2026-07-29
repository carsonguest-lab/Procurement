"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { MoreHorizontal } from "lucide-react";
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
import { MaterialStatusBadge, UrgencyBadge } from "@/components/status-badge";
import { formatDate, isAtRisk, isOverdueToOrder } from "@/lib/procurement";
import { setMaterialStatus, deleteMaterialItem } from "@/app/(app)/materials/actions";
import { MaterialFormDialog } from "@/app/(app)/materials/material-form-dialog";

export type MaterialRow = {
  id: string;
  material: string;
  leadTimeDays: number;
  requiredOnSiteDate: Date;
  orderByDate: Date;
  status: "NOT_ORDERED" | "ORDERED" | "DELIVERED";
  notes: string | null;
  project: { id: string; name: string };
  vendor: { id: string; name: string };
};

type Option = { id: string; name: string };

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

  function handleStatusChange(id: string, status: "NOT_ORDERED" | "ORDERED" | "DELIVERED") {
    startTransition(async () => {
      try {
        await setMaterialStatus(id, status);
        router.refresh();
      } catch {
        toast.error("Couldn't update status.");
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

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Material</TableHead>
            {showProjectColumn && <TableHead>Project</TableHead>}
            {showVendorColumn && <TableHead>Responsible Sub</TableHead>}
            <TableHead>Lead Time</TableHead>
            <TableHead>Required at Site</TableHead>
            <TableHead>Order Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={5 + (showProjectColumn ? 1 : 0) + (showVendorColumn ? 1 : 0)}
                className="text-center text-muted-foreground py-10"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}
          {items.map((item) => {
            const overdue = isOverdueToOrder(item);
            const atRisk = isAtRisk(item);
            return (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.material}</TableCell>
                {showProjectColumn && (
                  <TableCell className="text-muted-foreground">
                    <Link href={`/projects/${item.project.id}`} className="hover:underline">
                      {item.project.name}
                    </Link>
                  </TableCell>
                )}
                {showVendorColumn && (
                  <TableCell className="text-muted-foreground">
                    <Link href={`/vendors/${item.vendor.id}`} className="hover:underline">
                      {item.vendor.name}
                    </Link>
                  </TableCell>
                )}
                <TableCell>{item.leadTimeDays}d</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span>{formatDate(item.requiredOnSiteDate)}</span>
                    {atRisk && <UrgencyBadge label="At Risk" />}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span>{formatDate(item.orderByDate)}</span>
                    {overdue && <UrgencyBadge label="Overdue to Order" />}
                  </div>
                </TableCell>
                <TableCell>
                  <MaterialStatusBadge status={item.status} />
                </TableCell>
                <TableCell>
                  {canWrite && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingId(item.id)}>
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          disabled={item.status === "NOT_ORDERED"}
                          onClick={() => handleStatusChange(item.id, "NOT_ORDERED")}
                        >
                          Mark Not Ordered
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={item.status === "ORDERED"}
                          onClick={() => handleStatusChange(item.id, "ORDERED")}
                        >
                          Mark Ordered
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={item.status === "DELIVERED"}
                          onClick={() => handleStatusChange(item.id, "DELIVERED")}
                        >
                          Mark Delivered
                        </DropdownMenuItem>
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
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
