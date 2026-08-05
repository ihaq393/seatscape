import { db } from "./db";
import { DEFAULT_SETTINGS } from "./constants";

let cache: Record<string, string> | null = null;

export async function getSettings(): Promise<Record<string, string>> {
  if (cache) return cache;
  const rows = await db.setting.findMany();
  cache = { ...DEFAULT_SETTINGS };
  for (const r of rows) cache[r.key] = r.value;
  return cache;
}

export async function getSetting(key: string): Promise<string> {
  const all = await getSettings();
  return all[key] ?? DEFAULT_SETTINGS[key] ?? "";
}

export async function getSettingNumber(key: string): Promise<number> {
  return Number(await getSetting(key)) || 0;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
  cache = null;
}

// A booking is "late" if made after 5 PM the day before the reservation date.
export async function evaluateBookingRule(reservationDate: Date, now = new Date()) {
  const deadlineHour = await getSettingNumber("BOOKING_DEADLINE_HOUR");
  const policy = await getSetting("LATE_BOOKING_POLICY");
  const dayBefore = new Date(reservationDate);
  dayBefore.setUTCDate(dayBefore.getUTCDate() - 1);
  dayBefore.setUTCHours(deadlineHour, 0, 0, 0);
  const isLate = now.getTime() > dayBefore.getTime();
  return {
    isLate,
    requiresJustification: isLate,
    approvalPolicy: isLate ? (policy as "AUTO_APPROVE" | "REQUIRE_ADMIN") : "AUTO_APPROVE",
  };
}

// Resolve whether a specific seat should be auto-approved.
// Priority: seat.autoApprove override → emergency setting → global setting
export async function shouldAutoApprove(seat: { isEmergency: boolean; autoApprove: boolean | null }): Promise<boolean> {
  // Per-seat override takes precedence
  if (seat.autoApprove !== null && seat.autoApprove !== undefined) return seat.autoApprove;
  // Emergency seats use their own setting
  if (seat.isEmergency) return await getSettingBool("AUTO_APPROVAL_EMERGENCY");
  // Regular seats use the global setting
  return await getSettingBool("AUTO_APPROVAL_ENABLED");
}

export async function getSettingBool(key: string): Promise<boolean> {
  const v = await getSetting(key);
  return v === "true" || v === "1";
}
