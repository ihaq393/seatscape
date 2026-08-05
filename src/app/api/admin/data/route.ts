import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, unauthorized, forbidden, parseBody } from "@/lib/api-helpers";
import { audit } from "@/lib/audit";
import { DEFAULT_SETTINGS } from "@/lib/constants";

export const dynamic = "force-dynamic";

// GET /api/admin/data — export all data as JSON (DEVELOPER only)
export async function GET() {
  const current = await getCurrentUser();
  if (!current) return unauthorized();
  if (current.user.role !== "DEVELOPER") return forbidden();

  const [users, seats, bookings, settings, customization, logs] = await Promise.all([
    db.user.findMany({ select: { id: true, employeeId: true, name: true, email: true, phone: true, role: true, jobTitle: true, isActive: true, createdAt: true, lastLoginAt: true } }),
    db.seat.findMany(),
    db.booking.findMany({ include: { seat: true, user: { select: { employeeId: true, name: true } } } }),
    db.setting.findMany(),
    db.customization.findFirst(),
    db.auditLog.findMany({ take: 100, orderBy: { createdAt: "desc" } }),
  ]);

  return ok({
    exportedAt: new Date().toISOString(),
    users: users.map((u) => ({ ...u, createdAt: u.createdAt.toISOString(), lastLoginAt: u.lastLoginAt?.toISOString() ?? null })),
    seats,
    bookings: bookings.map((b) => ({
      id: b.id, reference: b.reference, employeeId: b.user.employeeId, employeeName: b.user.name,
      seatNumber: b.seat.number, date: b.date.toISOString(), purpose: b.purpose,
      type: b.type, status: b.status, expectedCheckIn: b.expectedCheckIn, expectedCheckOut: b.expectedCheckOut,
      createdAt: b.createdAt.toISOString(),
    })),
    settings: settings.reduce((acc, s) => { acc[s.key] = s.value; return acc; }, {} as Record<string, string>),
    customization,
    auditLogs: logs.map((l) => ({ ...l, createdAt: l.createdAt.toISOString() })),
  });
}

// POST /api/admin/data — reset data (DEVELOPER only)
// Body: { action: "reset-bookings" | "reset-all" | "reset-settings" }
export async function POST(request: Request) {
  const current = await getCurrentUser();
  if (!current) return unauthorized();
  if (current.user.role !== "DEVELOPER") return forbidden();

  const body = await parseBody<{ action?: string }>(request);
  if (!body?.action) return err("action is required", 422, "VALIDATION");

  if (body.action === "reset-bookings") {
    await db.booking.deleteMany({});
    await audit({ userId: current.user.id, action: "DATA_RESET", entity: "Booking", details: { scope: "all bookings" } });
    return ok({ reset: "bookings" });
  }
  if (body.action === "reset-settings") {
    await db.setting.deleteMany({});
    for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) {
      await db.setting.upsert({ where: { key: k }, update: { value: v }, create: { key: k, value: v } });
    }
    await audit({ userId: current.user.id, action: "DATA_RESET", entity: "Setting", details: { scope: "settings" } });
    return ok({ reset: "settings" });
  }
  if (body.action === "reset-all") {
    // Delete all bookings + audit logs, reset settings. Keep users + seats + customization.
    await db.booking.deleteMany({});
    await db.auditLog.deleteMany({});
    await db.setting.deleteMany({});
    for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) {
      await db.setting.upsert({ where: { key: k }, update: { value: v }, create: { key: k, value: v } });
    }
    await audit({ userId: current.user.id, action: "DATA_RESET", entity: "All", details: { scope: "bookings + audit logs + settings" } });
    return ok({ reset: "all" });
  }
  return err("Unknown action. Use: reset-bookings, reset-settings, or reset-all", 422, "VALIDATION");
}
