import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { VendorFormDialog } from "./vendor-form-dialog";

export default async function VendorsPage() {
  const user = await requireUser();

  const vendors = await prisma.vendor.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { materialItems: true } } },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Vendors</h2>
          <p className="text-sm text-muted-foreground">
            Subcontractors and suppliers responsible for materials.
          </p>
        </div>
        {user.role !== "VIEWER" && (
          <VendorFormDialog
            trigger={
              <Button>
                <Plus className="mr-1 h-4 w-4" /> New Vendor
              </Button>
            }
          />
        )}
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Trade</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead className="text-right">Materials</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vendors.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                  No vendors yet. Add your subcontractors and suppliers.
                </TableCell>
              </TableRow>
            )}
            {vendors.map((vendor) => (
              <TableRow key={vendor.id}>
                <TableCell className="font-medium">
                  <Link href={`/vendors/${vendor.id}`} className="hover:underline">
                    {vendor.name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{vendor.trade || "—"}</TableCell>
                <TableCell className="text-muted-foreground">
                  {vendor.contactName || "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">{vendor.phone || "—"}</TableCell>
                <TableCell className="text-right">{vendor._count.materialItems}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
