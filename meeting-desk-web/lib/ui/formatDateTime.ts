/** Stored times are UTC; display in the host's zone (default America/Toronto) — see CLAUDE.md. */
export function formatEventTime(iso: string, timeZone = "America/Toronto"): string {
  const date = new Date(iso);
  const isToday = new Date().toLocaleDateString("en-US", { timeZone }) === date.toLocaleDateString("en-US", { timeZone });
  const time = date.toLocaleTimeString("en-US", { timeZone, hour: "numeric", minute: "2-digit" });
  if (isToday) return `Today ${time}`;
  return `${date.toLocaleDateString("en-US", { timeZone, month: "short", day: "numeric" })} ${time}`;
}
