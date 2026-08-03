"use client";

import { useRef, useState, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import { toast } from "sonner";
import { FileText, Loader2, Sparkles, UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createScheduleImport } from "@/app/(app)/projects/[id]/imports/actions";

type Phase = "idle" | "uploading" | "extracting";

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

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
  const [dragging, setDragging] = useState(false);

  const busy = phase !== "idle";

  function pickFile(next: File | null) {
    if (!next) return;
    if (next.type !== "application/pdf") {
      toast.error("Please select a PDF file.");
      return;
    }
    setFile(next);
  }

  function clearFile() {
    setFile(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    if (busy) return;
    pickFile(e.dataTransfer.files?.[0] ?? null);
  }

  async function handleUpload() {
    if (!file) return;
    setPhase("uploading");
    setProgress(0);

    const uploadTimeout = AbortSignal.timeout(45_000);

    try {
      const blob = await upload(file.name, file, {
        access: "private",
        handleUploadUrl: "/api/schedule-upload",
        clientPayload: projectId,
        onUploadProgress: (p) => setProgress(p.percentage),
        abortSignal: uploadTimeout,
      });

      setPhase("extracting");
      const importId = await createScheduleImport({
        projectId,
        fileName: file.name,
        fileUrl: blob.url,
      });

      clearFile();
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
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      {!file ? (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          role="button"
          tabIndex={0}
          className={cn(
            "flex cursor-pointer flex-col items-center gap-3 border-2 border-dashed px-8 py-10 text-center transition-colors",
            dragging
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/40 hover:bg-muted/30"
          )}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <UploadCloud className="h-6 w-6" />
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium">Drag &amp; drop your equipment schedule</p>
            <p className="text-xs text-muted-foreground">or click to browse — PDF only</p>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
            <Sparkles className="h-3 w-3" />
            Claude will identify equipment/product tags for review
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-medium">{file.name}</span>
              <span className="text-xs text-muted-foreground">{formatFileSize(file.size)}</span>
            </div>
            {!busy && (
              <button
                type="button"
                onClick={clearFile}
                aria-label="Remove file"
                className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {phase === "uploading" && (
            <div className="flex flex-col gap-1.5">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-150 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground">Uploading… {progress}%</span>
            </div>
          )}

          {phase === "extracting" && (
            <div className="flex items-center gap-2.5 rounded-lg bg-primary/5 px-3 py-2.5 text-xs font-medium text-primary">
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
              Reading drawings and identifying equipment tags…
            </div>
          )}

          <Button type="button" disabled={busy} onClick={handleUpload} className="self-start">
            {busy ? "Working…" : "Upload & Extract Tags"}
          </Button>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}
