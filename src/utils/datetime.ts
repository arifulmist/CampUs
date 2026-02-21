export type DateLike = string | number | Date | null | undefined;

type Time12hOptions = {
  spaceBeforePeriod?: boolean;
  periodCase?: "upper" | "lower";
  /**
   * When the input contains a timezone offset (e.g. 10:30:00+00), convert it
   * into the user's local timezone before formatting.
   */
  convertOffsetToLocal?: boolean;
};

function isValidDate(d: Date): boolean {
  return !Number.isNaN(d.getTime());
}

/**
 * Parses common inputs into a Date.
 *
 * Special-case: `YYYY-MM-DD` is treated as a *local* date (not UTC) to avoid
 * off-by-one issues when formatting in different timezones.
 */
export function parseDateLike(value: DateLike): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return isValidDate(value) ? value : null;

  if (typeof value === "string") {
    const s = value.trim();
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) {
      const year = parseInt(m[1], 10);
      const monthIndex = parseInt(m[2], 10) - 1;
      const day = parseInt(m[3], 10);
      const d = new Date(year, monthIndex, day);
      return isValidDate(d) ? d : null;
    }

    const d = new Date(s);
    return isValidDate(d) ? d : null;
  }

  const d = new Date(value);
  return isValidDate(d) ? d : null;
}

export function formatDateToLocale(
  value: DateLike,
  locales: Intl.LocalesArgument = undefined,
  options: Intl.DateTimeFormatOptions = {},
): string {
  const d = parseDateLike(value);
  if (!d) return value == null ? "" : String(value);
  try {
    return d.toLocaleDateString(locales, options);
  } catch {
    return d.toString();
  }
}

export function formatTimeToLocale(
  value: DateLike,
  locales: Intl.LocalesArgument = undefined,
  options: Intl.DateTimeFormatOptions = {},
): string {
  const d = parseDateLike(value);
  if (!d) return value == null ? "" : String(value);
  try {
    return d.toLocaleTimeString(locales, options);
  } catch {
    return d.toString();
  }
}

export function isSameDay(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  const da = parseDateLike(a);
  const db = parseDateLike(b);
  if (!da || !db) return a === b;
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

export function formatDateDMY(dateString?: string | null): string {
  if (!dateString) return "";
  return formatDateToLocale(dateString, "en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Formats time strings that come from the DB (including Postgres `time with time zone`).
 * Examples: "10:30:00", "10:30:00+00", "10:30:00+06:00", "10:30:00Z".
 */
export function formatTime12hFromTimeString(
  timeString?: string | null,
  opts: Time12hOptions = {},
): string {
  if (!timeString) return "";

  const spaceBeforePeriod = opts.spaceBeforePeriod ?? true;
  const periodCase = opts.periodCase ?? "upper";
  const convertOffsetToLocal = opts.convertOffsetToLocal ?? true;

  const raw = String(timeString).trim();

  // Detect explicit timezone suffix: Z, +HH, +HHMM, +HH:MM, -HH, ...
  const tzSuffixMatch = raw.match(/([Zz]|[+-]\d{2}(?::?\d{2})?)$/);
  const timeOnlyMatch = raw.match(/(\d{1,2}:\d{2})(?::\d{2}(?:\.\d+)?)?/);

  // If we have a timezone suffix and we want local conversion, let Date do it.
  if (convertOffsetToLocal && tzSuffixMatch && timeOnlyMatch) {
    let tz = tzSuffixMatch[1];
    if (/^[+-]\d{2}$/.test(tz)) tz = tz + ":00";
    const iso = `1970-01-01T${timeOnlyMatch[0]}${tz}`;
    const d = new Date(iso);
    if (isValidDate(d)) {
      const hh = d.getHours();
      const mm = String(d.getMinutes()).padStart(2, "0");
      const period = hh >= 12 ? "PM" : "AM";
      const hour12 = hh % 12 || 12;
      const periodOut = periodCase === "lower" ? period.toLowerCase() : period;
      const spacer = spaceBeforePeriod ? " " : "";
      return `${hour12}:${mm}${spacer}${periodOut}`;
    }
  }

  // Fallback: treat it as a plain HH:MM(:SS) value and format without timezone conversion.
  const parts = raw.split(":");
  const h = parseInt(parts[0] ?? "0", 10) || 0;
  const m = (parts[1] ?? "00").padStart(2, "0");
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  const periodOut = periodCase === "lower" ? period.toLowerCase() : period;
  const spacer = spaceBeforePeriod ? " " : "";
  return `${hour12}:${m}${spacer}${periodOut}`;
}

export function formatRelativeTime(
  dateString?: string | null,
  opts: { longAfterDays?: number } = {},
): string {
  if (!dateString) return "";
  const date = parseDateLike(dateString);
  if (!date) return String(dateString);

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hr ago`;
  const diffDays = Math.floor(diffHours / 24);
  const longAfterDays = opts.longAfterDays ?? 3;
  if (diffDays < longAfterDays)
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatPostedTimestamp(createdAt: string): string {
  const date = parseDateLike(createdAt);
  if (!date) return "";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return "Posted just now";
  if (diffMinutes < 60) return `Posted ${diffMinutes} min ago`;
  if (diffHours < 24) return `Posted ${diffHours} hr ago`;
  if (diffDays < 7) return `Posted ${diffDays} days ago`;

  return `Posted on ${date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })}`;
}
