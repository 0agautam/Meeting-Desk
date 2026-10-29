/** Stored times are UTC; display in the host's zone (default America/Toronto) — see CLAUDE.md. */
export function formatEventTime(iso: string, timeZone = "America/Toronto"): string {
  const date = new Date(iso);
  const isToday = new Date().toLocaleDateString("en-US", { timeZone }) === date.toLocaleDateString("en-US", { timeZone });
  const time = date.toLocaleTimeString("en-US", { timeZone, hour: "numeric", minute: "2-digit" });
  if (isToday) return `Today ${time}`;
  return `${date.toLocaleDateString("en-US", { timeZone, month: "short", day: "numeric" })} ${time}`;
}

/** "just now", "5 min ago", "3 h ago", "2 days ago" — for how long a request has been waiting. */
export function formatAgo(iso: string): string {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? "day" : "days"} ago`;
}
