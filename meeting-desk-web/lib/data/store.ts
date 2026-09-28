import { MOCK_EVENTS, MOCK_REQUESTS } from "@/lib/mock/requests";
import { MOCK_STAFF } from "@/lib/mock/staff";
import type { Booking, MeetingRequest, RequestEvent, Staff } from "@/lib/types";

/**
 * A request that hasn't been submitted yet (wireframe 1's dashed sidebar card).
 * Not part of the CLAUDE.md domain model on purpose — it never becomes a MeetingRequest
 * row until Submit / Submit & start another is used. One per host, Phase 1 in-memory only.
 */
export type RequestDraft = { hostId: string; subject: string; savedAt: string };

type MockStore = {
  staff: Staff[];
  requests: MeetingRequest[];
  events: RequestEvent[];
  bookings: Booking[];
  drafts: Record<string, RequestDraft>;
};

const globalForStore = globalThis as typeof globalThis & { __meetingDeskStore?: MockStore };

/**
 * Phase 1 in-memory store. Kept on globalThis so dev hot-reloads don't reset it.
 * State is lost on server restart — that's fine for Phase 1 (see CLAUDE.md).
 * Server-only: never import this from a "use client" file.
 */
export function getStore(): MockStore {
  if (!globalForStore.__meetingDeskStore) {
    globalForStore.__meetingDeskStore = {
      staff: structuredClone(MOCK_STAFF),
      requests: structuredClone(MOCK_REQUESTS),
      events: structuredClone(MOCK_EVENTS),
      bookings: [],
      drafts: {},
    };
  }
  return globalForStore.__meetingDeskStore;
}

export function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
}
