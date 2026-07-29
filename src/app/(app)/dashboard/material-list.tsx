import Link from "next/link";
import { formatDate } from "@/lib/procurement";

type Item = {
  id: string;
  material: string;
  orderByDate: Date;
  requiredOnSiteDate: Date;
  project: { id: string; name: string };
  vendor: { id: string; name: string };
};

export function MaterialList({
  items,
  dateField,
  emptyMessage,
}: {
  items: Item[];
  dateField: "orderByDate" | "requiredOnSiteDate";
  emptyMessage: string;
}) {
  if (items.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <ul className="flex flex-col divide-y">
      {items.map((item) => (
        <li key={item.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
          <div className="flex flex-col">
            <span className="font-medium">{item.material}</span>
            <span className="text-xs text-muted-foreground">
              <Link href={`/projects/${item.project.id}`} className="hover:underline">
                {item.project.name}
              </Link>
              {" · "}
              <Link href={`/vendors/${item.vendor.id}`} className="hover:underline">
                {item.vendor.name}
              </Link>
            </span>
          </div>
          <span className="whitespace-nowrap text-xs text-muted-foreground">
            {formatDate(item[dateField])}
          </span>
        </li>
      ))}
    </ul>
  );
}
