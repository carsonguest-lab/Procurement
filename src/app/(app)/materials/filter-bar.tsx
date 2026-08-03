"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { CSI_DIVISIONS, STATUS_LABELS } from "@/lib/procurement";

type Option = { id: string; name: string };

function parseList(value: string | null): string[] {
  return value ? value.split(",").filter(Boolean) : [];
}

function MultiSelectFilter({
  label,
  paramKey,
  options,
}: {
  label: string;
  paramKey: string;
  options: { value: string; label: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlValue = searchParams.get(paramKey);

  // Local state is the source of truth for toggling so rapid clicks always
  // accumulate correctly, even if the URL navigation from a prior click
  // hasn't finished yet. It's re-synced whenever the URL changes from
  // elsewhere (e.g. browser back/forward, or another filter's navigation) —
  // adjusted during render rather than in an effect, per React's guidance.
  const [selected, setSelected] = useState<string[]>(() => parseList(urlValue));
  const [prevUrlValue, setPrevUrlValue] = useState(urlValue);
  if (urlValue !== prevUrlValue) {
    setPrevUrlValue(urlValue);
    setSelected(parseList(urlValue));
  }

  function commit(next: string[]) {
    setSelected(next);
    const params = new URLSearchParams(searchParams.toString());
    if (next.length === 0) {
      params.delete(paramKey);
    } else {
      params.set(paramKey, next.join(","));
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  function toggle(value: string) {
    commit(
      selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]
    );
  }

  const triggerLabel =
    selected.length === 0
      ? label
      : selected.length === 1
        ? (options.find((o) => o.value === selected[0])?.label ?? label)
        : `${label} (${selected.length})`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="w-[190px] justify-between font-normal text-foreground"
        >
          <span className="truncate">{triggerLabel}</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-72 w-[240px] overflow-y-auto">
        {options.map((o) => (
          <DropdownMenuCheckboxItem
            key={o.value}
            checked={selected.includes(o.value)}
            onSelect={(e) => e.preventDefault()}
            onCheckedChange={() => toggle(o.value)}
          >
            {o.label}
          </DropdownMenuCheckboxItem>
        ))}
        {selected.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => commit([])}>Clear filter</DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function MaterialsFilterBar({
  projects,
  vendors,
}: {
  projects: Option[];
  vendors: Option[];
}) {
  return (
    <div className="flex flex-wrap gap-3">
      <MultiSelectFilter
        label="Project"
        paramKey="project"
        options={projects.map((p) => ({ value: p.id, label: p.name }))}
      />

      <MultiSelectFilter
        label="Subcontractor"
        paramKey="vendor"
        options={vendors.map((v) => ({ value: v.id, label: v.name }))}
      />

      <MultiSelectFilter
        label="Status"
        paramKey="status"
        options={Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))}
      />

      <MultiSelectFilter
        label="Division"
        paramKey="division"
        options={CSI_DIVISIONS.map((d) => ({ value: d.code, label: `${d.code} – ${d.name}` }))}
      />
    </div>
  );
}
