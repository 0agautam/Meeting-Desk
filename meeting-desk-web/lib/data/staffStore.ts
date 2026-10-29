import "server-only";
import { parseRoles } from "@/lib/auth/permissions";
import { DEFAULT_BUFFER_MIN } from "@/lib/config";
import { NO_HOURS } from "@/lib/org/settings";
import type { Staff, StaffRole } from "@/lib/types";
import { tryGetCatalystApp } from "./catalystApp";
import { getStore } from "./store";

/**
 * Staff is backed by the real Catalyst Data Store table "Staff" (created in the
 * console, Sep 28, 2026) once deployed. Falls back to the Phase 1 in-memory mock
 * store when not running on Catalyst (local `next dev`) so local work keeps
 * working — see docs/HOSTING.md and docs/RESEARCH.md section 3.
 */

const TABLE = "Staff";

/** A saved buffer in minutes, or the default when the column is empty (a person saved before the buffer was split in two). */
function bufferOf(value: unknown): number {
  if (value === null || value === undefined || value === "") return DEFAULT_BUFFER_MIN;
  const minutes = Number(value);
  return Number.isFinite(minutes) ? minutes : DEFAULT_BUFFER_MIN;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToStaff(row: Record<string, any>): Staff {
  return {
    id: String(row.ROWID),
    name: row.name,
    email: row.email,
    roles: parseRoles(row.role),
    calendarProvider: (row.calendar_provider || null) as Staff["calendarProvider"],
    bufferBeforeMin: bufferOf(row.buffer_before_min),
    bufferAfterMin: bufferOf(row.buffer_after_min),
    // Time zone and hours belong to the organisation: lib/data/index.ts fills them in (withOrgSettings).
    workingHours: NO_HOURS,
    timezone: "UTC",
    slug: row.slug,
  };
}

function staffToRow(input: Omit<Staff, "id">) {
  return {
    name: input.name,
    email: input.email,
    role: input.roles.join(","),
    calendar_provider: input.calendarProvider ?? "",
    buffer_before_min: input.bufferBeforeMin,
    buffer_after_min: input.bufferAfterMin,
    slug: input.slug,
  };
}

function escapeZcql(value: string): string {
  return value.replace(/'/g, "''");
}

export async function listStaffFromStore(): Promise<Staff[]> {
  const app = await tryGetCatalystApp();
  if (!app) return getStore().staff;
  const res = await app.datastore().table(TABLE).getPagedRows({ maxRows: 200 });
  // A person added by hand in the console has no booking link name yet: it is made from their name and saved here.
  const taken = new Set<string>(res.data.map((r) => String(r.slug ?? "")).filter(Boolean));
  for (const row of res.data) {
    if (row.slug) continue;
    const slug = uniqueSlug(slugify(String(row.name ?? "")) || "host", taken);
    taken.add(slug);
    row.slug = slug;
    await app.datastore().table(TABLE).updateRow({ ROWID: row.ROWID, slug });
  }
  return res.data.map(rowToStaff);
}

export async function getStaffFromStore(id: string): Promise<Staff | undefined> {
  const app = await tryGetCatalystApp();
  if (!app) return getStore().staff.find((s) => s.id === id);
  try {
    const row = await app.datastore().table(TABLE).getRow(id);
    if (!row.slug) return (await listStaffFromStore()).find((s) => s.id === id);
    return rowToStaff(row);
  } catch {
    return undefined;
  }
}

/** Login lookup. The team is small, so it matches in code (case-insensitively) instead of trusting ZCQL's string comparison. */
export async function getStaffByEmailFromStore(email: string): Promise<Staff | undefined> {
  const wanted = email.trim().toLowerCase();
  return (await listStaffFromStore()).find((s) => s.email.trim().toLowerCase() === wanted);
}

export async function getStaffBySlugFromStore(slug: string): Promise<Staff | undefined> {
  const app = await tryGetCatalystApp();
  if (!app) return getStore().staff.find((s) => s.slug === slug);
  const rows = await app
    .zcql()
    .executeZCQLQuery(`SELECT * FROM ${TABLE} WHERE slug = '${escapeZcql(slug)}' LIMIT 1`);
  const row = rows[0]?.[TABLE];
  return row ? rowToStaff(row) : undefined;
}

export async function updateStaffInStore(
  id: string,
  patch: Partial<Pick<Staff, "calendarProvider" | "bufferBeforeMin" | "bufferAfterMin" | "roles" | "slug">>,
): Promise<Staff> {
  const app = await tryGetCatalystApp();
  if (!app) {
    const staff = getStore().staff.find((s) => s.id === id);
    if (!staff) throw new Error(`Staff not found: ${id}`);
    Object.assign(staff, patch);
    return staff;
  }
  const updated = await app
    .datastore()
    .table(TABLE)
    .updateRow({
      ROWID: id,
      ...("calendarProvider" in patch ? { calendar_provider: patch.calendarProvider ?? "" } : {}),
      ...("bufferBeforeMin" in patch ? { buffer_before_min: patch.bufferBeforeMin } : {}),
      ...("bufferAfterMin" in patch ? { buffer_after_min: patch.bufferAfterMin } : {}),
      ...("roles" in patch ? { role: (patch.roles ?? []).join(",") } : {}),
      ...("slug" in patch ? { slug: patch.slug } : {}),
    });
  return rowToStaff(updated);
}

export function slugify(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

/** The base, or base-2, base-3… if it is already taken. */
function uniqueSlug(base: string, taken: Set<string>): string {
  let slug = base;
  for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
  return slug;
}

export async function createStaffInStore(input: {
  name: string;
  email: string;
  roles: StaffRole[];
  calendarProvider: Staff["calendarProvider"];
  bufferBeforeMin: number;
  bufferAfterMin: number;
}): Promise<Staff> {
  const base: Omit<Staff, "id"> = {
    name: input.name,
    email: input.email,
    roles: input.roles,
    calendarProvider: input.calendarProvider,
    bufferBeforeMin: input.bufferBeforeMin,
    bufferAfterMin: input.bufferAfterMin,
    workingHours: NO_HOURS,
    timezone: "UTC",
    slug: slugify(input.name) || "host",
  };

  const app = await tryGetCatalystApp();
  if (!app) {
    const store = getStore();
    let slug = base.slug;
    let n = 2;
    while (store.staff.some((s) => s.slug === slug)) slug = `${base.slug}-${n++}`;
    const staff: Staff = { ...base, slug, id: `stf_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}` };
    store.staff.push(staff);
    return staff;
  }

  let slug = base.slug;
  let n = 2;
  let existing = await getStaffBySlugFromStore(slug);
  while (existing) {
    slug = `${base.slug}-${n++}`;
    existing = await getStaffBySlugFromStore(slug);
  }
  const row = await app.datastore().table(TABLE).insertRow(staffToRow({ ...base, slug }));
  return rowToStaff(row);
}

/** Removes the team member's row. The caller has already checked who may be removed and cleaned up their approvals and sessions. */
export async function deleteStaffInStore(id: string): Promise<void> {
  const app = await tryGetCatalystApp();
  if (!app) {
    const store = getStore();
    store.staff = store.staff.filter((s) => s.id !== id);
    return;
  }
  await app.datastore().table(TABLE).deleteRow(id);
}
