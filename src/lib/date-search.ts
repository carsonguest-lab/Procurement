const MONTH_NAMES: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

export type ParsedDateQuery = { month?: number; day?: number; year?: number };

function inBounds(month?: number, day?: number) {
  if (month !== undefined && (month < 0 || month > 11)) return false;
  if (day !== undefined && (day < 1 || day > 31)) return false;
  return true;
}

/**
 * Recognizes a handful of common date-ish formats (YYYY-MM-DD, MM/DD[/YYYY],
 * "September 15" / "Sep 15, 2026") so free-text search can also match by
 * date without misinterpreting ordinary text as a date.
 */
export function parseDateQuery(raw: string): ParsedDateQuery | null {
  const query = raw.trim().toLowerCase();
  if (!query) return null;

  let m = query.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (m) {
    const year = +m[1];
    const month = +m[2] - 1;
    const day = +m[3];
    return inBounds(month, day) ? { year, month, day } : null;
  }

  m = query.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (m) {
    const month = +m[1] - 1;
    const day = +m[2];
    const year = +m[3];
    return inBounds(month, day) ? { year, month, day } : null;
  }

  m = query.match(/^(\d{1,2})[-/](\d{1,2})$/);
  if (m) {
    const month = +m[1] - 1;
    const day = +m[2];
    return inBounds(month, day) ? { month, day } : null;
  }

  const monthKey = Object.keys(MONTH_NAMES)
    .sort((a, b) => b.length - a.length)
    .find((name) => query.startsWith(name));
  if (monthKey) {
    const month = MONTH_NAMES[monthKey];
    const rest = query.slice(monthKey.length);
    const dayMatch = rest.match(/(\d{1,2})/);
    const yearMatch = rest.match(/(\d{4})/);
    const day = dayMatch ? +dayMatch[1] : undefined;
    const year = yearMatch ? +yearMatch[1] : undefined;
    return inBounds(month, day) ? { month, day, year } : null;
  }

  return null;
}

export function matchesParsedDate(date: Date, parsed: ParsedDateQuery): boolean {
  if (parsed.year !== undefined && date.getFullYear() !== parsed.year) return false;
  if (parsed.month !== undefined && date.getMonth() !== parsed.month) return false;
  if (parsed.day !== undefined && date.getDate() !== parsed.day) return false;
  return true;
}
