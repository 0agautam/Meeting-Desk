"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createStaff, updateStaff } from "@/lib/data";
import type { CalendarProvider } from "@/lib/types";

const CALENDAR_VALUES: CalendarProvider[] = ["google", "zoho"];

/** Wireframe 4's "Save" — updates a person's calendar + buffer. */
export async function saveStaffSettings(formData: FormData) {
  const id = String(formData.get("staffId") ?? "");
  const calendarProvider = String(formData.get("calendarProvider") ?? "");
  const bufferMin = Number(formData.get("bufferMin"));
  if (!id || !CALENDAR_VALUES.includes(calendarProvider as CalendarProvider) || !Number.isFinite(bufferMin)) {
    redirect("/settings");
  }

  await updateStaff(id, { calendarProvider: calendarProvider as CalendarProvider, bufferMin });
  revalidatePath("/settings");
  redirect("/settings");
}

/** Wireframe 4's "+ Add person" — adds a new host with a generated booking slug. */
export async function addStaff(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const calendarProvider = String(formData.get("calendarProvider") ?? "");
  const bufferMin = Number(formData.get("bufferMin"));
  if (!name || !email || !CALENDAR_VALUES.includes(calendarProvider as CalendarProvider)) {
    redirect("/settings");
  }

  await createStaff({
    name,
    email,
    calendarProvider: calendarProvider as CalendarProvider,
    bufferMin: Number.isFinite(bufferMin) ? bufferMin : 15,
  });
  revalidatePath("/settings");
  redirect("/settings");
}
