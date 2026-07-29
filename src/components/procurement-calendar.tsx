"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MaterialFormDialog } from "@/app/(app)/materials/material-form-dialog";
import type { MaterialRow } from "@/components/materials-table";

type Option = { id: string; name: string };

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function buildMonthGrid(monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = firstOfMonth.getDay();
  const gridStart = new Date(year, month, 1 - startOffset);

  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    days.push(new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i));
  }
  return days;
}

type CalendarEvent = {
  item: MaterialRow;
  type: "order" | "required";
  date: Date;
};

export function ProcurementCalendar({
  items,
  projects,
  vendors,
  canWrite,
}: {
  items: MaterialRow[];
  projects: Option[];
  vendors: Option[];
  canWrite: boolean;
}) {
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  const days = useMemo(() => buildMonthGrid(month), [month]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const item of items) {
      const orderDate = new Date(item.orderByDate);
      const requiredDate = new Date(item.requiredOnSiteDate);
      const orderKey = orderDate.toDateString();
      const requiredKey = requiredDate.toDateString();
      map.set(orderKey, [...(map.get(orderKey) ?? []), { item, type: "order", date: orderDate }]);
      map.set(requiredKey, [
        ...(map.get(requiredKey) ?? []),
        { item, type: "required", date: requiredDate },
      ]);
    }
    return map;
  }, [items]);

  const editingItem = items.find((i) => i.id === editingId);
  const today = new Date();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="w-40 text-center text-sm font-medium">
            {month.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </h3>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMonth(new Date(today.getFullYear(), today.getMonth(), 1))}
          >
            Today
          </Button>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-500" /> Order by
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-blue-500" /> Required on site
          </span>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <div className="grid grid-cols-7 border-b bg-muted/40 text-xs font-medium text-muted-foreground">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="px-2 py-2 text-center">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day, idx) => {
            const inMonth = day.getMonth() === month.getMonth();
            const dayEvents = eventsByDay.get(day.toDateString()) ?? [];
            const isToday = isSameDay(day, today);
            return (
              <div
                key={idx}
                className={cn(
                  "min-h-[100px] border-b border-r p-1.5 last:border-r-0",
                  idx % 7 === 6 && "border-r-0",
                  !inMonth && "bg-muted/20"
                )}
              >
                <span
                  className={cn(
                    "inline-flex h-5 w-5 items-center justify-center rounded-full text-xs",
                    !inMonth && "text-muted-foreground",
                    isToday && "bg-primary text-primary-foreground font-medium"
                  )}
                >
                  {day.getDate()}
                </span>
                <div className="mt-1 flex flex-col gap-1">
                  {dayEvents.map((ev, i) => (
                    <button
                      key={i}
                      onClick={() => canWrite && setEditingId(ev.item.id)}
                      className={cn(
                        "truncate rounded px-1.5 py-0.5 text-left text-[11px] leading-tight",
                        ev.type === "order"
                          ? "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          : "bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                      )}
                      title={`${ev.item.material} — ${ev.type === "order" ? "Order by" : "Required on site"}`}
                    >
                      {ev.item.material}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {canWrite && editingItem && (
        <MaterialFormDialog
          projects={projects}
          vendors={vendors}
          item={editingItem}
          open={!!editingId}
          onOpenChange={(o) => setEditingId(o ? editingItem.id : null)}
        />
      )}
    </div>
  );
}
