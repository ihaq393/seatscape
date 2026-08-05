import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, unauthorized, forbidden, notFound, parseBody } from "@/lib/api-helpers";
import { audit } from "@/lib/audit";
import { AUDIT_ACTIONS } from "@/lib/constants";

export const dynamic = "force-dynamic";

function requireAdmin(role: string) {
  return role === "ADMIN" || role === "DEVELOPER";
}

// PATCH /api/admin/seats/[id] — block/unblock or edit
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const current = await getCurrentUser();
  if (!current) return unauthorized();
  if (!requireAdmin(current.user.role)) return forbidden();
  const { user } = current;
  const { id } = await params;
  const body = await parseBody<Record<string, unknown>>(request);
  const existing = await db.seat.findUnique({ where: { id } });
  if (!existing) return notFound("Seat not found");

  const allowed: Record<string, unknown> = {};
  for (const k of ["label", "posX", "posY", "zone", "isEmergency", "isBlocked", "autoApprove"]) {
    if (body[k] !== undefined) allowed[k] = body[k];
  }
  const updated = await db.seat.update({ where: { id }, data: allowed });
  if (body.isBlocked !== undefined || body.autoApprove !== undefined) {
    await audit({ userId: user.id, action: AUDIT_ACTIONS.SEAT_UPDATED, entity: "Seat", entityId: id, details: { number: existing.number, blocked: body.isBlocked, autoApprove: body.autoApprove } });
  }
  return ok({ id: updated.id, updated: true });
}

// DELETE /api/admin/seats/[id]
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const current = await getCurrentUser();
  if (!current) return unauthorized();
  if (!requireAdmin(current.user.role)) return forbidden();
  const { id } = await params;
  const seat = await db.seat.findUnique({ where: { id } });
  if (!seat) return notFound("Seat not found");
  if (seat.isEmergency) return err("Emergency seats cannot be deleted", 400, "PROTECTED");
  await db.seat.delete({ where: { id } });
  return ok({ deleted: true });
}
