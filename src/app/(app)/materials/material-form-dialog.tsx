"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { createMaterialItem, updateMaterialItem } from "./actions";
import {
  computeOrderByDate,
  CSI_DIVISIONS,
  SUBMITTAL_STATUS_LABELS,
  type SubmittalStatus,
} from "@/lib/procurement";

type Option = { id: string; name: string };

export type DivisionCategoryEntry = {
  csiDivisionCode: string | null;
  category: string | null;
  subcategory: string | null;
};

type MaterialData = {
  id: string;
  project: { id: string };
  vendor: { id: string };
  material: string;
  leadTimeDays: number;
  requiredOnSiteDate: Date;
  orderByDate: Date;
  submittalStatus: SubmittalStatus;
  notes: string | null;
  csiDivisionCode: string | null;
  category: string | null;
  subcategory: string | null;
};

function toInputDate(d: Date | string) {
  return new Date(d).toISOString().slice(0, 10);
}

const NO_DIVISION = "NONE";

export function MaterialFormDialog({
  projects,
  vendors,
  item,
  defaultProjectId,
  divisionCategoryMap = [],
  trigger,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: {
  projects: Option[];
  vendors: Option[];
  item?: MaterialData;
  defaultProjectId?: string;
  divisionCategoryMap?: DivisionCategoryEntry[];
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = setControlledOpen ?? setInternalOpen;
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const isEdit = !!item;

  const [requiredOnSiteDate, setRequiredOnSiteDate] = useState(
    item ? toInputDate(item.requiredOnSiteDate) : ""
  );
  const [leadTimeDays, setLeadTimeDays] = useState(item ? String(item.leadTimeDays) : "14");
  const [manualOrderByDate, setManualOrderByDate] = useState<string | null>(
    item ? toInputDate(item.orderByDate) : null
  );
  // Controlled (unlike the other Selects here) because category/subcategory suggestions
  // below need to react to the current division before the form is submitted.
  const [csiDivisionCode, setCsiDivisionCode] = useState(item?.csiDivisionCode ?? "");

  const suggestedOrderByDate = useMemo(() => {
    if (!requiredOnSiteDate) return "";
    const days = parseInt(leadTimeDays || "0", 10);
    return computeOrderByDate(new Date(requiredOnSiteDate), days).toISOString().slice(0, 10);
  }, [requiredOnSiteDate, leadTimeDays]);

  const orderByDate = manualOrderByDate ?? suggestedOrderByDate;
  const orderByTouched = manualOrderByDate !== null;

  const categoryOptions = useMemo(() => {
    if (!csiDivisionCode) return [];
    const set = new Set<string>();
    for (const row of divisionCategoryMap) {
      if (row.csiDivisionCode === csiDivisionCode && row.category) set.add(row.category);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [divisionCategoryMap, csiDivisionCode]);

  const subcategoryOptions = useMemo(() => {
    if (!csiDivisionCode) return [];
    const set = new Set<string>();
    for (const row of divisionCategoryMap) {
      if (row.csiDivisionCode === csiDivisionCode && row.subcategory) set.add(row.subcategory);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [divisionCategoryMap, csiDivisionCode]);

  function resetOpenState(next: boolean) {
    setOpen(next);
    if (next) {
      setManualOrderByDate(item ? toInputDate(item.orderByDate) : null);
      setCsiDivisionCode(item?.csiDivisionCode ?? "");
    }
  }

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        if (isEdit) {
          await updateMaterialItem(item.id, formData);
          toast.success("Material item updated");
        } else {
          await createMaterialItem(formData);
          toast.success("Material item added");
        }
        setOpen(false);
        router.refresh();
      } catch {
        toast.error("Something went wrong saving the material item.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={resetOpenState}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Material" : "Add Material"}</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="material">Material</Label>
            <Input
              id="material"
              name="material"
              required
              placeholder="e.g. Structural steel beams"
              defaultValue={item?.material}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="projectId">Project</Label>
              <Select name="projectId" defaultValue={item?.project.id ?? defaultProjectId}>
                <SelectTrigger id="projectId" className="w-full">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="vendorId">Responsible Subcontractor</Label>
              <Select name="vendorId" defaultValue={item?.vendor.id}>
                <SelectTrigger id="vendorId" className="w-full">
                  <SelectValue placeholder="Select subcontractor" />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="csiDivisionCode">CSI Division</Label>
            <Select
              name="csiDivisionCode"
              value={csiDivisionCode || NO_DIVISION}
              onValueChange={(v) => setCsiDivisionCode(v === NO_DIVISION ? "" : v)}
            >
              <SelectTrigger id="csiDivisionCode" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_DIVISION}>None</SelectItem>
                {CSI_DIVISIONS.map((d) => (
                  <SelectItem key={d.code} value={d.code}>
                    {d.code} – {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                name="category"
                list="category-suggestions"
                placeholder="e.g. Air Distribution"
                defaultValue={item?.category ?? ""}
              />
              <datalist id="category-suggestions">
                {categoryOptions.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="subcategory">Subcategory</Label>
              <Input
                id="subcategory"
                name="subcategory"
                list="subcategory-suggestions"
                placeholder="e.g. Rooftop Units"
                defaultValue={item?.subcategory ?? ""}
              />
              <datalist id="subcategory-suggestions">
                {subcategoryOptions.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="leadTimeDays">Lead Time (days)</Label>
              <Input
                id="leadTimeDays"
                name="leadTimeDays"
                type="number"
                min={0}
                required
                value={leadTimeDays}
                onChange={(e) => setLeadTimeDays(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="requiredOnSiteDate">Required at Site</Label>
              <Input
                id="requiredOnSiteDate"
                name="requiredOnSiteDate"
                type="date"
                required
                value={requiredOnSiteDate}
                onChange={(e) => setRequiredOnSiteDate(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="orderByDate">Order Date</Label>
              {orderByTouched && (
                <button
                  type="button"
                  onClick={() => setManualOrderByDate(null)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="h-3 w-3" /> Reset to suggested
                </button>
              )}
            </div>
            <Input
              id="orderByDate"
              name="orderByDate"
              type="date"
              required
              value={orderByDate}
              onChange={(e) => setManualOrderByDate(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Defaults to required-at-site date minus lead time minus a 1 week buffer. Editable.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="submittalStatus">Submittal Status</Label>
            <Select name="submittalStatus" defaultValue={item?.submittalStatus ?? "NOT_SUBMITTED"}>
              <SelectTrigger id="submittalStatus" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SUBMITTAL_STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Procurement can&apos;t proceed (Ordered/Delivered) until this is Approved or
              Approved as Noted.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={2} defaultValue={item?.notes ?? ""} />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : isEdit ? "Save Changes" : "Add Material"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
