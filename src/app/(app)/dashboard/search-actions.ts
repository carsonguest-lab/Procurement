"use server";

import { prisma } from "@/lib/prisma";
import { requireUser, getAccessibleProjectIds } from "@/lib/auth-helpers";
import { formatDate } from "@/lib/procurement";
import { matchesParsedDate, parseDateQuery } from "@/lib/date-search";

export type SearchResult =
  | { kind: "project"; id: string; title: string; subtitle: string | null }
  | { kind: "material"; id: string; title: string; subtitle: string; projectId: string }
  | {
      kind: "date";
      id: string;
      title: string;
      subtitle: string;
      projectId: string;
      dateISO: string;
    };

const RESULTS_PER_GROUP = 5;

export async function searchAll(rawQuery: string): Promise<SearchResult[]> {
  const user = await requireUser();
  const accessibleIds = await getAccessibleProjectIds(user);
  const projectIdFilter = accessibleIds === "ALL" ? undefined : { in: accessibleIds };

  const query = rawQuery.trim();
  if (!query) return [];

  const [projects, materials] = await Promise.all([
    prisma.project.findMany({
      where: {
        name: { contains: query, mode: "insensitive" },
        id: accessibleIds === "ALL" ? undefined : { in: accessibleIds },
      },
      orderBy: { name: "asc" },
      take: RESULTS_PER_GROUP,
    }),
    prisma.materialItem.findMany({
      where: { material: { contains: query, mode: "insensitive" }, projectId: projectIdFilter },
      include: { project: true, vendor: true },
      orderBy: { requiredOnSiteDate: "asc" },
      take: RESULTS_PER_GROUP,
    }),
  ]);

  const results: SearchResult[] = [
    ...projects.map(
      (p): SearchResult => ({
        kind: "project",
        id: p.id,
        title: p.name,
        subtitle: p.address,
      })
    ),
    ...materials.map(
      (m): SearchResult => ({
        kind: "material",
        id: m.id,
        title: m.material,
        subtitle: `${m.project.name} · ${m.vendor.name}`,
        projectId: m.projectId,
      })
    ),
  ];

  const parsedDate = parseDateQuery(query);
  if (parsedDate) {
    const allItems = await prisma.materialItem.findMany({
      where: { projectId: projectIdFilter },
      include: { project: true },
    });
    const dateMatches: SearchResult[] = [];

    for (const item of allItems) {
      if (matchesParsedDate(item.requiredOnSiteDate, parsedDate)) {
        dateMatches.push({
          kind: "date",
          id: `${item.id}-required`,
          title: item.material,
          subtitle: `${item.project.name} · Required at site · ${formatDate(item.requiredOnSiteDate)}`,
          projectId: item.projectId,
          dateISO: item.requiredOnSiteDate.toISOString(),
        });
      }
      if (matchesParsedDate(item.orderByDate, parsedDate)) {
        dateMatches.push({
          kind: "date",
          id: `${item.id}-orderby`,
          title: item.material,
          subtitle: `${item.project.name} · Order by · ${formatDate(item.orderByDate)}`,
          projectId: item.projectId,
          dateISO: item.orderByDate.toISOString(),
        });
      }
    }

    results.push(...dateMatches.slice(0, RESULTS_PER_GROUP));
  }

  return results;
}
