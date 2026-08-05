import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, unauthorized, forbidden, notFound, parseBody } from "@/lib/api-helpers";
import { audit } from "@/lib/audit";
import { AUDIT_ACTIONS } from "@/lib/constants";

export const dynamic = "force-dynamic";

function toDTO(b: any) {
  return {
    id: b.id, reference: b.reference, userId: b.userId, seatId: b.seatId,
    seatNumber: b.seat?.number ?? "", date: b.date.toISOString(),
    purpose: b.purpose, justification: b.justification ?? null, type: b.type, status: b.status,
    expectedCheckIn: b.expectedCheckIn, expectedCheckOut: b.expectedCheckOut,
    checkedInAt: b.checkedInAt?.toISOString() ?? null, checkedOutAt: b.checkedOutAt?.toISOString() ?? null,
    approvedById: b.approvedById ?? null, approvedAt: b.approvedAt?.toISOString() ?? null,
    approvalNote: b.approvalNote ?? null, cancelledReason: b.cancelledReason ?? null,
    createdAt: b.createdAt.toISOString(),
    employee: b.user ? { id: b.user.id, employeeId: b.user.employeeId, name: b.user.name, jobTitle: b.user.jobTitle ?? null } : null,
  };
}

function canManage(role: string) {
  return role === "ADMIN" || role === "DEVELOPER";
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const current = await getCurrentUser();
  if (!current) return unauthorized();
  const { id } = await params;
  const booking = await db.booking.findUnique({ where: { id }, include: { seat: true, user: true } });
  if (!booking) return notFound("Booking not found");
  const { user } = current;
  if (!canManage(user.role) && booking.userId !== user.id) return forbidden();
  return ok(toDTO(booking));
}

// PATCH /api/bookings/[id] — cancel a booking (own, or any if admin/developer)
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const current = await getCurrentUser();
  if (!current) return unauthorized();
  const { user } = current;
  const { id } = await params;
  const body = await parseBody<{ reason?: string }>(request);

  const booking = await db.booking.findUnique({ where: { id }, include: { seat: true, user: true } });
  if (!booking) return notFound("Booking not found");

  const canCancel = canManage(user.role) || booking.userId === user.id;
  if (!canCancel) return forbidden("You can only cancel your own bookings");

  if (booking.status === "CANCELLED") return err("Booking is already cancelled", 400, "ALREADY_CANCELLED");
  if (booking.status === "COMPLETED") return err("Completed bookings cannot be cancelled", 400, "INVALID");

  const updated = await db.booking.update({
    where: { id },
    data: {
      status: "CANCELLED",
      cancelledReason: body?.reason || (canManage(user.role) && booking.userId !== user.id ? "Cancelled by admin" : "Cancelled by user"),
    },
    include: { seat: true, user: true },
  });

  await audit({ userId: user.id, action: AUDIT_ACTIONS.BOOKING_CANCELLED, entity: "Booking", entityId: booking.id, details: { reference: booking.reference, reason: body?.reason, byRole: user.role } });
  return ok(toDTO(updated));
}
