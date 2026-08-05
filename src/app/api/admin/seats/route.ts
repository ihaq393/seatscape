import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, unauthorized, forbidden, parseBody } from "@/lib/api-helpers";
import { audit } from "@/lib/audit";
import { AUDIT_ACTIONS } from "@/lib/constants";

export const dynamic = "force-dynamic";

function requireAdmin(role: string) {
  return role === "ADMIN" || role === "DEVELOPER";
}

// GET /api/admin/seats
export async function GET() {
  const current = await getCurrentUser();
  if (!current) return unauthorized();
  if (!requireAdmin(current.user.role)) return forbidden();
  const seats = await db.seat.findMany({ orderBy: [{ posY: "asc" }, { posX: "asc" }] });
  return ok(seats.map((s) => ({
    id: s.id, number: s.number, label: s.label,
    isEmergency: s.isEmergency, isBlocked: s.isBlocked,
    autoApprove: s.autoApprove,
    posX: s.posX, posY: s.posY, zone: s.zone,
  })));
}

// PATCH /api/admin/seats — bulk add N seats (admin only)
export async function PATCH(request: Request) {
  const current = await getCurrentUser();
  if (!current) return unauthorized();
  if (!requireAdmin(current.user.role)) return forbidden();
  const { user } = current;
  const body = await parseBody<{ count?: number; zone?: string }>(request);
  if (!body?.count || body.count < 1) return err("count (>=1) is required", 422, "VALIDATION");

  const existing = await db.seat.findMany({ select: { number: true, posX: true, posY: true } });
  let maxNum = 0;
  for (const s of existing) {
    const m = s.number.match(/^S(\d+)$/i);
    if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
  }
  const taken = new Set(existing.map((s) => `${s.posX},${s.posY}`));
  const created: { id: string; number: string }[] = [];
  for (let i = 0; i < body.count; i++) {
    const num = `S${maxNum + i + 1}`;
    let px = 0, py = 0;
    for (let y = 0; y < 30 && !px; y++) {
      for (let x = 0; x < 6; x++) {
        const key = `${x},${y}`;
        if (!taken.has(key)) { px = x; py = y; taken.add(key); break; }
      }
    }
    const seat = await db.seat.create({
      data: {
        number: num,
        label: `Desk ${maxNum + i + 1}`,
        posX: px, posY: py,
        zone: body.zone || "Open Area",
        isEmergency: false,
      },
    });
    created.push({ id: seat.id, number: seat.number });
  }
  await audit({ userId: user.id, action: AUDIT_ACTIONS.SEAT_UPDATED, entity: "Seat", details: { count: body.count } });
  return ok({ created: created.length, seats: created });
}
