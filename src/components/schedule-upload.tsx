"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import { toast } from "sonner";
import { FileText, Loader2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createScheduleImport } from "@/app/(app)/projects/[id]/imports/actions";

type Phase = "idle" | "uploading" | "extracting";

export function ScheduleUpload({
  projectId,
  onUploaded,
}: {
  projectId: string;
  onUploaded?: (importId: string) => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);

  const busy = phase !== "idle";

  async function handleUpload() {
    if (!file) return;
    setPhase("uploading");
    setProgress(0);

    const uploadTimeout = AbortSignal.timeout(45_000);

    try {
      const blob = await upload(file.name, file, {
        access: "private",
        handleUploadUrl: "/api/schedule-upload",
        onUploadProgress: (p) => setProgress(p.percentage),
        abortSignal: uploadTimeout,
      });

      setPhase("extracting");
      const importId = await createScheduleImport({
        projectId,
        fileName: file.name,
        fileUrl: blob.url,
      });

      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      setPhase("idle");

      if (onUploaded) {
        onUploaded(importId);
      } else {
        router.push(`/projects/${projectId}/imports/${importId}`);
      }
    } catch (e) {
      if (e instanceof Error && e.name === "TimeoutError") {
        toast.error("Upload timed out after 45s. Please try again.");
      } else {
        toast.error(e instanceof Error ? e.message : "Upload failed.");
      }
      setPhase("idle");
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-dashed p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
          <UploadCloud className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-medium">Upload equipment schedule</span>
          <span className="text-xs text-muted-foreground">
            PDF only. Claude will identify equipment/product tags for review.
          </span>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        disabled={busy}
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-secondary-foreground hover:file:bg-secondary/80"
      />

      {file && !busy && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <FileText className="h-4 w-4" />
          {file.name}
        </div>
      )}

      {phase === "uploading" && (
        <div className="flex flex-col gap-1.5">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground">Uploading {file?.name}…</span>
        </div>
      )}

      {phase === "extracting" && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Reading drawings and identifying equipment tags…
        </div>
      )}

      <Button
        type="button"
        size="sm"
        disabled={!file || busy}
        onClick={handleUpload}
        className="self-start"
      >
        {busy ? "Working…" : "Upload & Extract Tags"}
      </Button>
    </div>
  );
}
