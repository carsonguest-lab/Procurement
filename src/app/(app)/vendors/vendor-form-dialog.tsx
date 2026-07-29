"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { createVendor, updateVendor } from "./actions";

type VendorData = {
  id: string;
  name: string;
  trade: string | null;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
};

export function VendorFormDialog({
  vendor,
  trigger,
}: {
  vendor?: VendorData;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const isEdit = !!vendor;

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        if (isEdit) {
          await updateVendor(vendor.id, formData);
          toast.success("Vendor updated");
        } else {
          await createVendor(formData);
          toast.success("Vendor created");
        }
        setOpen(false);
        router.refresh();
      } catch {
        toast.error("Something went wrong saving the vendor.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Vendor" : "New Vendor"}</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Vendor / Subcontractor Name</Label>
            <Input id="name" name="name" required defaultValue={vendor?.name} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="trade">Trade</Label>
            <Input
              id="trade"
              name="trade"
              placeholder="e.g. Electrical, Framing, Concrete"
              defaultValue={vendor?.trade ?? ""}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="contactName">Contact Name</Label>
              <Input id="contactName" name="contactName" defaultValue={vendor?.contactName ?? ""} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" defaultValue={vendor?.phone ?? ""} />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" defaultValue={vendor?.email ?? ""} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={3} defaultValue={vendor?.notes ?? ""} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : isEdit ? "Save Changes" : "Create Vendor"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
