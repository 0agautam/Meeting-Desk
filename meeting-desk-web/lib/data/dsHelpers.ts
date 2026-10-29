import "server-only";
import { zonedTimeToUtc } from "@/lib/booking/slots";

/**
 * Data Store returns CREATEDTIME/MODIFIEDTIME as "yyyy-MM-dd HH:mm:ss:SSS" in the
 * PROJECT's time zone (America/Bogota, see .catalystrc) — not UTC. Verified Oct 2,
 * 2026: rows seeded at 11:18 UTC came back as "06:18". Convert to the ISO-UTC
 * strings the rest of the app uses.
 */
const DATA_STORE_TIME_ZONE = "America/Bogota";

export function parseDataStoreTime(value: unknown): string {
  const match = /^(\d{4}-\d{2}-\d{2}) (\d{2}):(\d{2})(?::(\d{2}))?(?::(\d{3}))?$/.exec(String(value ?? ""));
  if (!match) return new Date(String(value)).toISOString();
  const [, date, hh, mm, ss = "0", ms = "0"] = match;
  const base = zonedTimeToUtc(date, `${hh}:${mm}`, DATA_STORE_TIME_ZONE);
  return new Date(base.getTime() + Number(ss) * 1000 + Number(ms)).toISOString();
}

/**
 * The inverse: a Date as "yyyy-MM-dd HH:mm:ss" on the PROJECT's clock, for writing to a
 * DateTime column. Catalyst's docs don't state DateTime's input format or zone; this
 * follows what CREATEDTIME shows. Compare values in code (parseDataStoreTime), not in ZCQL.
 */
export function formatDataStoreTime(date: Date): string {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: DATA_STORE_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`;
}

/**
 * ZCQL has no parameter binding, so values go into the query text. Only values from
 * a conservative alphabet (ids, statuses, slot keys) are accepted; anything else throws.
 */
export function zcqlLiteral(value: string): string {
  if (!/^[A-Za-z0-9_\-|@.:+ ]{1,200}$/.test(value)) throw new Error("Unsafe value for ZCQL query");
  return `'${value}'`;
}

/** Safe JSON parse for the text columns that hold arrays/objects. */
export function parseJsonColumn<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string" || value === "") return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
