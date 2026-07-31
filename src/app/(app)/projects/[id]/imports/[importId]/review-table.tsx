"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExtractedTagStatusBadge } from "@/components/status-badge";
import { computeOrderByDate, formatDate, type ExtractedTagStatus } from "@/lib/procurement";
import { approveExtractedTag, rejectExtractedTag } from "../actions";

type Option = { id: string; name: string };

type ExtractedTagRow = {
  id: string;
  tag: string;
  description: string | null;
  pageNumber: number | null;
  status: ExtractedTagStatus;
};

type RowDraft = {
  material: string;
  vendorId: string;
  leadTimeDays: string;
  requiredOnSiteDate: string;
};

function defaultDraft(t: ExtractedTagRow): RowDraft {
  return {
    material: t.description ? `${t.tag} — ${t.description}` : t.tag,
    vendorId: "",
    leadTimeDays: "14",
    requiredOnSiteDate: "",
  };
}

export function ExtractedTagReviewTable({
  tags,
  vendors,
  canWrite,
}: {
  tags: ExtractedTagRow[];
  vendors: Option[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const [bulkPending, startBulkTransition] = useTransition();
  const [drafts, setDrafts] = useState<Record<string, RowDraft>>(() =>
    Object.fromEntries(tags.map((t) => [t.id, defaultDraft(t)]))
  );
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [workingId, setWorkingId] = useState<string | null>(null);

  function updateDraft(tagId: string, patch: Partial<RowDraft>) {
    setDrafts((prev) => ({ ...prev, [tagId]: { ...prev[tagId], ...patch } }));
  }

  function isRowValid(draft: RowDraft) {
    return draft.material.trim().length > 0 && !!draft.vendorId && !!draft.requiredOnSiteDate;
  }

  function orderByPreview(draft: RowDraft) {
    if (!draft.requiredOnSiteDate) return "—";
    const days = parseInt(draft.leadTimeDays || "0", 10);
    return formatDate(computeOrderByDate(new Date(draft.requiredOnSiteDate), days));
  }

  async function approveRow(tagId: string) {
    const draft = drafts[tagId];
    if (!isRowValid(draft)) {
      toast.error("Fill in material, subcontractor, and required-on-site date first.");
      return;
    }
    setWorkingId(tagId);
    try {
      await approveExtractedTag(tagId, {
        material: draft.material,
        vendorId: draft.vendorId,
        leadTimeDays: parseInt(draft.leadTimeDays || "0", 10),
        requiredOnSiteDate: draft.requiredOnSiteDate,
      });
      router.refresh();
    } catch {
      toast.error("Something went wrong approving this tag.");
    } finally {
      setWorkingId(null);
    }
  }

  async function rejectRow(tagId: string) {
    setWorkingId(tagId);
    try {
      await rejectExtractedTag(tagId);
      router.refresh();
    } catch {
      toast.error("Something went wrong rejecting this tag.");
    } finally {
      setWorkingId(null);
    }
  }

  const pendingTags = tags.filter((t) => t.status === "PENDING");
  const selectedPendingIds = pendingTags.filter((t) => selected[t.id]).map((t) => t.id);
  const allPendingSelected =
    pendingTags.length > 0 && selectedPendingIds.length === pendingTags.length;

  function toggleAllPending(checked: boolean) {
    setSelected((prev) => {
      const next = { ...prev };
      for (const t of pendingTags) next[t.id] = checked;
      return next;
    });
  }

  function bulkApprove() {
    const invalid = selectedPendingIds.filter((id) => !isRowValid(drafts[id]));
    if (invalid.length > 0) {
      toast.error(
        "Some selected rows are missing material, subcontractor, or a required-on-site date."
      );
      return;
    }
    startBulkTransition(async () => {
      let failed = 0;
      for (const tagId of selectedPendingIds) {
        const draft = drafts[tagId];
        try {
          await approveExtractedTag(tagId, {
            material: draft.material,
            vendorId: draft.vendorId,
            leadTimeDays: parseInt(draft.leadTimeDays || "0", 10),
            requiredOnSiteDate: draft.requiredOnSiteDate,
          });
        } catch {
          failed++;
        }
      }
      setSelected({});
      if (failed > 0) {
        toast.error(`${failed} row(s) failed to approve.`);
      } else {
        toast.success(`Approved ${selectedPendingIds.length} tag(s).`);
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {canWrite && selectedPendingIds.length > 0 && (
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={bulkApprove} disabled={bulkPending}>
            Approve Selected ({selectedPendingIds.length})
          </Button>
        </div>
      )}
      <div className="rounded-lg border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              {canWrite && (
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-input"
                    checked={allPendingSelected}
                    onChange={(e) => toggleAllPending(e.target.checked)}
                    disabled={pendingTags.length === 0}
                  />
                </TableHead>
              )}
              <TableHead>Material</TableHead>
              <TableHead>Subcontractor</TableHead>
              <TableHead>Lead Time</TableHead>
              <TableHead>Required at Site</TableHead>
              <TableHead>Order By</TableHead>
              <TableHead>Status</TableHead>
              {canWrite && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {tags.map((t) => {
              const draft = drafts[t.id];
              const isPending = t.status === "PENDING";
              const editable = canWrite && isPending;
              return (
                <TableRow key={t.id}>
                  {canWrite && (
                    <TableCell>
                      {isPending && (
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-input"
                          checked={!!selected[t.id]}
                          onChange={(e) =>
                            setSelected((prev) => ({ ...prev, [t.id]: e.target.checked }))
                          }
                        />
                      )}
                    </TableCell>
                  )}
                  <TableCell className="min-w-[200px]">
                    {editable ? (
                      <Input
                        value={draft.material}
                        onChange={(e) => updateDraft(t.id, { material: e.target.value })}
                        className="h-8"
                      />
                    ) : (
                      <span className="text-sm">{draft.material}</span>
                    )}
                    {t.pageNumber && (
                      <span className="block text-xs text-muted-foreground">
                        Page {t.pageNumber}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="min-w-[160px]">
                    {editable ? (
                      <Select
                        value={draft.vendorId}
                        onValueChange={(v) => updateDraft(t.id, { vendorId: v })}
                      >
                        <SelectTrigger className="h-8 w-full">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {vendors.map((v) => (
                            <SelectItem key={v.id} value={v.id}>
                              {v.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        {vendors.find((v) => v.id === draft.vendorId)?.name ?? "—"}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="w-24">
                    {editable ? (
                      <Input
                        type="number"
                        min={0}
                        value={draft.leadTimeDays}
                        onChange={(e) => updateDraft(t.id, { leadTimeDays: e.target.value })}
                        className="h-8"
                      />
                    ) : (
                      <span className="text-sm text-muted-foreground">{draft.leadTimeDays}d</span>
                    )}
                  </TableCell>
                  <TableCell className="w-40">
                    {editable ? (
                      <Input
                        type="date"
                        value={draft.requiredOnSiteDate}
                        onChange={(e) => updateDraft(t.id, { requiredOnSiteDate: e.target.value })}
                        className="h-8"
                      />
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        {draft.requiredOnSiteDate || "—"}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {orderByPreview(draft)}
                  </TableCell>
                  <TableCell>
                    <ExtractedTagStatusBadge status={t.status} />
                  </TableCell>
                  {canWrite && (
                    <TableCell className="text-right">
                      {isPending && (
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={workingId === t.id}
                            onClick={() => rejectRow(t.id)}
                          >
                            Reject
                          </Button>
                          <Button size="sm" disabled={workingId === t.id} onClick={() => approveRow(t.id)}>
                            Approve
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
