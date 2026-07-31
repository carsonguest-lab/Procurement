"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CSI_DIVISIONS, STATUS_LABELS } from "@/lib/procurement";

type Option = { id: string; name: string };

export function MaterialsFilterBar({
  projects,
  vendors,
}: {
  projects: Option[];
  vendors: Option[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "ALL") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Select
        defaultValue={searchParams.get("project") ?? "ALL"}
        onValueChange={(v) => setParam("project", v)}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Project" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Projects</SelectItem>
          {projects.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        defaultValue={searchParams.get("vendor") ?? "ALL"}
        onValueChange={(v) => setParam("vendor", v)}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Subcontractor" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Subcontractors</SelectItem>
          {vendors.map((v) => (
            <SelectItem key={v.id} value={v.id}>
              {v.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        defaultValue={searchParams.get("status") ?? "ALL"}
        onValueChange={(v) => setParam("status", v)}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Statuses</SelectItem>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        defaultValue={searchParams.get("division") ?? "ALL"}
        onValueChange={(v) => setParam("division", v)}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Division" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Divisions</SelectItem>
          {CSI_DIVISIONS.map((d) => (
            <SelectItem key={d.code} value={d.code}>
              {d.code} – {d.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
