import type { MeetingRequest } from "@/lib/types";

/**
 * Can the client still book from this request's link? Yes while it has offered times and
 * the request is waiting on the client (the coordinator may send the email a moment after
 * copying it, so "new"/"updated" count too). A request sent back for info is paused.
 */
export function isBookable(request: Pick<MeetingRequest, "status" | "offeredSlots">): boolean {
  return request.offeredSlots.length > 0 && (request.status === "new" || request.status === "updated" || request.status === "email_sent");
}
